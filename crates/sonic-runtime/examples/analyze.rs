//! Import and analyze audio files from the command line, printing the same
//! JSON payloads the desktop IPC commands return, plus the Atlas for the
//! whole data directory.
//!
//! ```sh
//! cargo run -p sonic-runtime --example analyze -- <data-dir> <audio-file>...
//! ```

use std::path::PathBuf;
use std::sync::atomic::AtomicBool;

use sonic_runtime::LibraryService;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args_os().skip(1);
    let data_dir = PathBuf::from(
        args.next()
            .ok_or("usage: analyze <data-dir> <audio-file>...")?,
    );
    let library = LibraryService::open(&data_dir)?;
    let cancelled = AtomicBool::new(false);

    let mut results = Vec::new();
    for file in args {
        let path = PathBuf::from(file);
        match library.import_and_analyze(&path, &cancelled) {
            Ok(id) => {
                let track = library.track(&id)?;
                let analysis = library.analysis(&id)?;
                let waveform = library.waveform(&id, 1600)?;
                let spectrogram = library.spectrogram(&id, 1024, 128)?;
                results.push(serde_json::json!({
                    "track": track,
                    "analysis": analysis,
                    "waveform": waveform,
                    "spectrogram": spectrogram,
                }));
            }
            Err(e) => eprintln!("{}: {} ({})", path.display(), e, e.code()),
        }
    }
    let atlas = library.atlas()?;
    let neighbours: serde_json::Map<String, serde_json::Value> = atlas
        .points
        .iter()
        .filter_map(|p| {
            let n = library.atlas_neighbours(&p.track_id, 5).ok()?;
            Some((p.track_id.clone(), serde_json::to_value(n).ok()?))
        })
        .collect();
    // Every ordered pair, keyed "left|right", as the Compare page requests them.
    let ids: Vec<String> = library.tracks()?.into_iter().map(|t| t.id).collect();
    let mut comparisons = serde_json::Map::new();
    for left in &ids {
        for right in ids.iter().filter(|r| *r != left) {
            let c = library.compare(left, right)?;
            comparisons.insert(format!("{left}|{right}"), serde_json::to_value(c)?);
        }
    }
    let output = serde_json::json!({
        "tracks": results,
        "atlas": atlas,
        "neighbours": neighbours,
        "comparisons": comparisons,
    });
    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}
