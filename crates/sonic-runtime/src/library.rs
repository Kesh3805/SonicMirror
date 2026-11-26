//! Library service: import a local file, analyze it and serve the results.

use std::collections::BTreeMap;
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::atomic::AtomicBool;
use std::time::UNIX_EPOCH;

use serde::Serialize;
use sonic_catalog::artifacts::{ArtifactKind, ArtifactStore};
use sonic_catalog::{
    Catalog, CatalogError, NewAnalysis, NewAtlasSnapshot, NewTrack, StoredAnalysis, TrackRecord,
};
use sonic_core::analysis::{self, AnalysisError, ENGINE_VERSION, FEATURE_SCHEMA_VERSION};
use sonic_core::domain::{ContentDigest, cache_key};
use sonic_core::dsp::spectral::SpectralConfig;
use sonic_core::dsp::spectrogram::{self, Spectrogram};
use sonic_core::dsp::waveform::{BASE_BUCKET_MS, WaveformEnvelope};
use sonic_core::media::DecodedStream;
use sonic_core::media::metadata::read_metadata;

/// Most buckets a single waveform request may return.
pub const MAX_WAVEFORM_BUCKETS: usize = 8192;
/// Bounds on a spectrogram request (columns × bands cells).
pub const MAX_SPECTROGRAM_COLUMNS: usize = 2048;
pub const MAX_SPECTROGRAM_BANDS: usize = 256;

#[derive(Debug, thiserror::Error)]
pub enum RuntimeError {
    #[error("the selected item is not a readable file")]
    NotAFile,
    #[error("the file could not be read")]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Analysis(#[from] AnalysisError),
    #[error(transparent)]
    Catalog(#[from] CatalogError),
    #[error("this track has not been analyzed")]
    NotAnalyzed,
    #[error("the waveform artifact is missing or unreadable")]
    ArtifactUnavailable,
    #[error("this track is not on the Atlas")]
    NotOnMap,
}

impl RuntimeError {
    /// Stable code for the IPC error contract.
    pub fn code(&self) -> &'static str {
        match self {
            Self::NotAFile => "library.not_a_file",
            Self::Io(_) => "library.io",
            Self::Analysis(e) => e.code(),
            Self::Catalog(e) => e.code(),
            Self::NotAnalyzed => "analysis.not_analyzed",
            Self::ArtifactUnavailable => "analysis.artifact_unavailable",
            Self::NotOnMap => "atlas.not_on_map",
        }
    }

    /// Whether retrying the same operation could succeed.
    pub fn recoverable(&self) -> bool {
        matches!(
            self,
            Self::Io(_) | Self::ArtifactUnavailable | Self::Catalog(CatalogError::Database(_))
        )
    }
}

pub type Result<T> = std::result::Result<T, RuntimeError>;

/// Waveform buckets for a viewport, from real sample extrema.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WaveformView {
    pub duration_ms: u64,
    pub bucket_duration_ms: f64,
    pub min: Vec<f32>,
    pub max: Vec<f32>,
}

/// A bounded spectrogram image with its scale. `cells` holds `columns × bands`
/// quantized levels, column-major with band 0 lowest; level `v` is
/// `floor_db + v × step_db` dB relative to a full-scale sine in one bin.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpectrogramView {
    pub duration_ms: u64,
    pub max_hz: f64,
    pub floor_db: f64,
    pub step_db: f64,
    pub reference: &'static str,
    pub columns: usize,
    pub bands: usize,
    pub cells: Vec<u8>,
}

/// Coordinates catalog, artifacts and the analysis engine.
#[derive(Debug)]
pub struct LibraryService {
    catalog: Mutex<Catalog>,
    artifacts: ArtifactStore,
}

impl LibraryService {
    pub fn new(catalog: Catalog, artifacts: ArtifactStore) -> Self {
        Self {
            catalog: Mutex::new(catalog),
            artifacts,
        }
    }

    /// Open the catalog and artifact cache under an application data directory.
    ///
    /// # Errors
    ///
    /// Fails if the directory, database or cache cannot be created.
    pub fn open(data_dir: &Path) -> Result<Self> {
        std::fs::create_dir_all(data_dir)?;
        let catalog = Catalog::open(&data_dir.join("catalog.sqlite"))?;
        let artifacts = ArtifactStore::open(data_dir.join("artifacts"))?;
        Ok(Self::new(catalog, artifacts))
    }

    fn catalog(&self) -> std::sync::MutexGuard<'_, Catalog> {
        // A panic while holding the lock cannot leave SQLite half-written
        // (every write is a transaction), so a poisoned lock is safe to reuse.
        self.catalog
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    /// Import one local file and analyze it. The file is only ever opened for
    /// reading. Returns the catalog track id.
    ///
    /// # Errors
    ///
    /// Fails if the path is not a readable file, the media cannot be decoded,
    /// analysis is cancelled, or the catalog cannot be written.
    pub fn import_and_analyze(&self, path: &Path, cancelled: &AtomicBool) -> Result<String> {
        let path: PathBuf = path.canonicalize().map_err(|_| RuntimeError::NotAFile)?;
        let meta = std::fs::metadata(&path)?;
        if !meta.is_file() {
            return Err(RuntimeError::NotAFile);
        }
        let modified_at_ms = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .and_then(|d| i64::try_from(d.as_millis()).ok());

        let content_hash = ContentDigest::of_reader(File::open(&path)?)?;
        let metadata = read_metadata(File::open(&path)?);
        let extension = path
            .extension()
            .map(|e| e.to_string_lossy().to_ascii_lowercase());
        let mut stream = DecodedStream::open(Box::new(File::open(&path)?), extension.as_deref())
            .map_err(AnalysisError::from)?;

        let config_json = canonical_config();
        let key = cache_key(
            &content_hash,
            ENGINE_VERSION,
            FEATURE_SCHEMA_VERSION,
            &config_json,
        );

        let output = analysis::analyze(&mut stream, cancelled)?;
        let waveform =
            self.artifacts
                .write(ArtifactKind::Waveform, &key, &output.waveform.to_bytes())?;
        let spectrogram = self.artifacts.write(
            ArtifactKind::Spectrogram,
            &key,
            &output.spectrogram.to_bytes(),
        )?;

        let technical = &output.technical;
        let duration_ms = (technical.duration_seconds * 1000.0).round();
        let mut catalog = self.catalog();
        let track_id = catalog.upsert_track(&NewTrack {
            path,
            size_bytes: meta.len(),
            modified_at_ms,
            content_hash: content_hash.clone(),
            metadata,
            #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
            duration_ms: Some(duration_ms as u64),
            sample_rate_hz: Some(technical.sample_rate),
            channel_count: Some(technical.channels),
            codec: Some(technical.codec.clone()),
        })?;
        catalog.save_analysis(&NewAnalysis {
            track_id: &track_id,
            cache_key: &key,
            content_hash: &content_hash,
            engine_version: output.engine_version,
            feature_schema_version: output.feature_schema_version,
            configuration_json: &config_json,
            features: &output.features,
            artifacts: &[waveform, spectrogram],
        })?;
        Ok(track_id)
    }

    /// # Errors
    ///
    /// Fails on a catalog error.
    pub fn tracks(&self) -> Result<Vec<TrackRecord>> {
        Ok(self.catalog().tracks()?)
    }

    /// # Errors
    ///
    /// Fails if the track does not exist.
    pub fn track(&self, id: &str) -> Result<TrackRecord> {
        Ok(self.catalog().track(id)?)
    }

    /// # Errors
    ///
    /// Fails on a catalog error.
    pub fn analysis(&self, track_id: &str) -> Result<Option<StoredAnalysis>> {
        Ok(self.catalog().analysis_for_track(track_id)?)
    }

    /// Envelope buckets for the whole track at roughly `target_buckets`
    /// resolution (never coarser than requested).
    ///
    /// # Errors
    ///
    /// Fails if the track is not analyzed or its artifact cannot be read.
    pub fn waveform(&self, track_id: &str, target_buckets: usize) -> Result<WaveformView> {
        let path = self
            .analysis(track_id)?
            .and_then(|a| a.waveform_path)
            .ok_or(RuntimeError::NotAnalyzed)?;
        let bytes = self
            .artifacts
            .read(&path)
            .map_err(|_| RuntimeError::ArtifactUnavailable)?;
        let envelope =
            WaveformEnvelope::from_bytes(&bytes).map_err(|_| RuntimeError::ArtifactUnavailable)?;
        Ok(view(
            &envelope,
            target_buckets.clamp(1, MAX_WAVEFORM_BUCKETS),
        ))
    }
}

impl LibraryService {
    /// The spectrogram downsampled to at most `columns × bands` cells, keeping
    /// the loudest cell of each block.
    ///
    /// # Errors
    ///
    /// Fails if the track is not analyzed or its artifact cannot be read.
    pub fn spectrogram(
        &self,
        track_id: &str,
        columns: usize,
        bands: usize,
    ) -> Result<SpectrogramView> {
        let path = self
            .analysis(track_id)?
            .and_then(|a| a.spectrogram_path)
            .ok_or(RuntimeError::NotAnalyzed)?;
        let bytes = self
            .artifacts
            .read(&path)
            .map_err(|_| RuntimeError::ArtifactUnavailable)?;
        let full =
            Spectrogram::from_bytes(&bytes).map_err(|_| RuntimeError::ArtifactUnavailable)?;
        let s = full.downsample(
            columns.clamp(1, MAX_SPECTROGRAM_COLUMNS),
            bands.clamp(1, MAX_SPECTROGRAM_BANDS),
        );
        Ok(SpectrogramView {
            duration_ms: s.duration_ms(),
            max_hz: s.max_hz(),
            floor_db: spectrogram::FLOOR_DB,
            step_db: 0.5,
            reference: "dB re full-scale sine (per bin)",
            columns: s.columns(),
            bands: usize::from(s.bands),
            cells: s.cells,
        })
    }
}

/// Most neighbours a single request may return.
pub const MAX_NEIGHBOURS: usize = 50;

/// Tracks with their features, and the analysis attached to each analyzed track.
type CatalogInput = (
    Vec<(TrackRecord, Option<Vec<sonic_core::domain::AudioFeature>>)>,
    BTreeMap<String, String>,
);

impl LibraryService {
    fn catalog_input(&self) -> Result<CatalogInput> {
        let catalog = self.catalog();
        let mut ids = BTreeMap::new();
        let entries = catalog
            .tracks()?
            .into_iter()
            .map(|t| {
                let analysis = catalog.analysis_for_track(&t.id)?;
                let features = analysis.map(|a| {
                    ids.insert(t.id.clone(), a.analysis_id);
                    a.features
                });
                Ok((t, features))
            })
            .collect::<Result<Vec<_>>>()?;
        Ok((entries, ids))
    }

    fn catalog_features(
        &self,
    ) -> Result<Vec<(TrackRecord, Option<Vec<sonic_core::domain::AudioFeature>>)>> {
        Ok(self.catalog_input()?.0)
    }

    /// The saved Sonic Atlas, read against the current catalog. The first
    /// call computes and saves one; afterwards coordinates only change on
    /// [`Self::refresh_atlas`], and the map reports when it is stale.
    ///
    /// # Errors
    ///
    /// Fails on a catalog error.
    pub fn atlas(&self) -> Result<crate::atlas::AtlasSnapshot> {
        let (entries, ids) = self.catalog_input()?;
        let digest = digest_of(&entries, &ids);
        let saved = self.catalog().latest_atlas_snapshot()?;
        if let Some(map) = saved
            .as_ref()
            .and_then(|s| crate::atlas::from_saved(s, &entries, &ids, &digest))
        {
            return Ok(map);
        }
        self.generate_atlas(&entries, &ids, &digest)
    }

    /// Recompute the projection from current measurements and save it.
    /// When the catalog cannot be mapped, nothing is saved and the reason is
    /// returned.
    ///
    /// # Errors
    ///
    /// Fails on a catalog error.
    pub fn refresh_atlas(&self) -> Result<crate::atlas::AtlasSnapshot> {
        let (entries, ids) = self.catalog_input()?;
        let digest = digest_of(&entries, &ids);
        self.generate_atlas(&entries, &ids, &digest)
    }

    fn generate_atlas(
        &self,
        entries: &[(TrackRecord, Option<Vec<sonic_core::domain::AudioFeature>>)],
        ids: &BTreeMap<String, String>,
        digest: &str,
    ) -> Result<crate::atlas::AtlasSnapshot> {
        let map = crate::atlas::snapshot(entries);
        if map.status != "ready" {
            return Ok(map);
        }
        let points = crate::atlas::snapshot_points(&map, ids);
        let model = crate::atlas::model_json(&map);
        let mut catalog = self.catalog();
        catalog.save_atlas_snapshot(&NewAtlasSnapshot {
            feature_schema_version: &map.vector_version,
            algorithm_version: &map.projection_version,
            input_digest: digest,
            model_json: &model,
            excluded_count: map.excluded.len(),
            points: &points,
        })?;
        let saved = catalog
            .latest_atlas_snapshot()?
            .ok_or(CatalogError::NotFound)?;
        drop(catalog);
        Ok(crate::atlas::from_saved(&saved, entries, ids, digest).unwrap_or(map))
    }

    /// Nearest tracks to `track_id` in the original feature space.
    ///
    /// # Errors
    ///
    /// Fails on a catalog error, or if the track is not on the map.
    pub fn atlas_neighbours(
        &self,
        track_id: &str,
        k: usize,
    ) -> Result<Vec<crate::atlas::AtlasNeighbour>> {
        crate::atlas::neighbours(
            &self.catalog_features()?,
            track_id,
            k.clamp(1, MAX_NEIGHBOURS),
        )
        .ok_or(RuntimeError::NotOnMap)
    }
}

fn view(envelope: &WaveformEnvelope, target: usize) -> WaveformView {
    let level = envelope.level_for(target);
    let buckets = &envelope.levels[level];
    let scale = 1u64 << level;
    #[allow(clippy::cast_precision_loss)]
    let bucket_duration_ms = (u64::from(BASE_BUCKET_MS) * scale) as f64;
    WaveformView {
        duration_ms: envelope.duration_ms(),
        bucket_duration_ms,
        min: buckets.iter().map(|b| b.min).collect(),
        max: buckets.iter().map(|b| b.max).collect(),
    }
}

/// Canonical JSON of every analysis setting that affects results.
fn canonical_config() -> String {
    use sonic_core::dsp::{loudness, mfcc, tempo};
    let s = SpectralConfig::default();
    format!(
        concat!(
            "{{\"loudness\":{{\"version\":\"{}\"}},",
            "\"mfcc\":{{\"bands\":{},\"coefficients\":{},\"minHz\":{},\"version\":\"{}\"}},",
            "\"spectral\":{{\"frameSize\":{},\"hopSize\":{},\"rolloffFraction\":{},\"sampleRate\":{}}},",
            "\"spectrogram\":{{\"bands\":{},\"version\":\"{}\"}},",
            "\"tempo\":{{\"maxBpm\":{},\"minBpm\":{},\"minConfidence\":{},\"version\":\"{}\"}},",
            "\"waveform\":{{\"baseBucketMs\":{}}}}}"
        ),
        loudness::ALGORITHM_VERSION,
        mfcc::BANDS,
        mfcc::COEFFICIENTS,
        mfcc::MIN_HZ,
        mfcc::ALGORITHM_VERSION,
        s.frame_size,
        s.hop_size,
        s.rolloff_fraction,
        s.sample_rate,
        spectrogram::BANDS,
        spectrogram::ALGORITHM_VERSION,
        tempo::MAX_BPM,
        tempo::MIN_BPM,
        tempo::MIN_CONFIDENCE,
        tempo::ALGORITHM_VERSION,
        BASE_BUCKET_MS
    )
}

fn digest_of(
    entries: &[(TrackRecord, Option<Vec<sonic_core::domain::AudioFeature>>)],
    ids: &BTreeMap<String, String>,
) -> String {
    let track_ids: Vec<&str> = entries.iter().map(|(t, _)| t.id.as_str()).collect();
    crate::atlas::input_digest(ids, &track_ids)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sonic_core::dsp::synth;
    use sonic_core::media::wav;

    fn temp_dir(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("sonicmirror-runtime-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn import_analyze_and_read_back() {
        let dir = temp_dir("slice");
        let audio = dir.join("Sine Study.wav");
        let original = wav::encode_pcm16(&synth::sine(22_050, 2.0, 440.0, 0.5), 1, 22_050);
        std::fs::write(&audio, &original).unwrap();

        let service = LibraryService::open(&dir.join("data")).unwrap();
        let id = service
            .import_and_analyze(&audio, &AtomicBool::new(false))
            .unwrap();

        let track = service.track(&id).unwrap();
        assert_eq!(track.title, "Sine Study");
        assert_eq!(track.duration_ms, Some(2000));

        let analysis = service.analysis(&id).unwrap().unwrap();
        assert!(
            analysis
                .features
                .iter()
                .any(|f| f.key == "spectral_centroid_mean")
        );

        let sg = service.spectrogram(&id, 64, 32).unwrap();
        assert_eq!((sg.columns, sg.bands), (64, 32));
        assert_eq!(sg.cells.len(), 64 * 32);
        assert!(sg.duration_ms.abs_diff(2000) < 120);

        let wf = service.waveform(&id, 100).unwrap();
        assert!(wf.min.len() >= 100 && wf.min.len() == wf.max.len());
        assert!(wf.max.iter().any(|m| (m - 0.5).abs() < 0.01));

        // Re-import is idempotent, and the source file is untouched.
        let again = service
            .import_and_analyze(&audio, &AtomicBool::new(false))
            .unwrap();
        assert_eq!(id, again);
        assert_eq!(service.tracks().unwrap().len(), 1);
        assert_eq!(std::fs::read(&audio).unwrap(), original);

        drop(service);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn the_atlas_is_saved_once_and_only_moves_on_refresh() {
        let dir = temp_dir("atlas");
        let service = LibraryService::open(&dir.join("data")).unwrap();
        let none = AtomicBool::new(false);
        let import = |name: &str, samples: Vec<f32>| {
            let path = dir.join(format!("{name}.wav"));
            std::fs::write(&path, wav::encode_pcm16(&samples, 1, 22_050)).unwrap();
            service.import_and_analyze(&path, &none).unwrap()
        };

        assert_eq!(service.atlas().unwrap().status, "unavailable");
        import("Low", synth::sine(22_050, 8.0, 220.0, 0.5));
        import("Noise", synth::white_noise(22_050, 8.0, 0.3, 7));
        import("Clicks", synth::click_track(22_050, 8.0, 120.0, 0.8));

        let first = service.atlas().unwrap();
        assert_eq!(
            first.status, "ready",
            "{:?} {:?}",
            first.reason, first.excluded
        );
        assert!(!first.stale);
        let id = first.snapshot_id.clone().unwrap();
        assert_eq!(service.atlas().unwrap(), first);

        import("Sweep", synth::chirp(22_050, 8.0, 200.0, 4000.0, 0.5));
        let stale = service.atlas().unwrap();
        assert!(stale.stale);
        assert_eq!(stale.snapshot_id.as_deref(), Some(id.as_str()));
        assert_eq!(stale.changes.added, 1);
        assert_eq!(stale.points, first.points);

        let fresh = service.refresh_atlas().unwrap();
        assert!(!fresh.stale);
        assert_ne!(fresh.snapshot_id.as_deref(), Some(id.as_str()));
        assert_eq!(fresh.points.len(), 4);

        drop(service);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn canonical_config_is_stable_json() {
        let a = canonical_config();
        assert_eq!(a, canonical_config());
        let parsed: serde_json::Value = serde_json::from_str(&a).unwrap();
        assert_eq!(parsed["tempo"]["minBpm"], 40.0);
        assert_eq!(parsed["spectral"]["sampleRate"], 22_050);
        assert_eq!(parsed["mfcc"]["coefficients"], 13);
    }

    #[test]
    fn rejects_directories_and_missing_files() {
        let dir = temp_dir("reject");
        let service = LibraryService::open(&dir.join("data")).unwrap();
        let cancel = AtomicBool::new(false);
        assert_eq!(
            service
                .import_and_analyze(&dir, &cancel)
                .unwrap_err()
                .code(),
            "library.not_a_file"
        );
        assert_eq!(
            service
                .import_and_analyze(&dir.join("missing.wav"), &cancel)
                .unwrap_err()
                .code(),
            "library.not_a_file"
        );
        drop(service);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn corrupt_file_reports_structured_error() {
        let dir = temp_dir("corrupt");
        let bad = dir.join("broken.mp3");
        std::fs::write(&bad, b"this is not audio".repeat(100)).unwrap();
        let service = LibraryService::open(&dir.join("data")).unwrap();
        let err = service
            .import_and_analyze(&bad, &AtomicBool::new(false))
            .unwrap_err();
        assert!(err.code().starts_with("media."), "{}", err.code());
        assert_eq!(service.tracks().unwrap().len(), 0);
        drop(service);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
