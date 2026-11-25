//! Bounded-memory spectrogram artifact (PDS §14, SAD §38).
//!
//! Each analysis frame's one-sided power spectrum is pooled into
//! [`BANDS`] equal-width linear frequency bands (mean power). Columns hold the
//! mean power of consecutive frames; when the column count reaches
//! [`MAX_COLUMNS`], adjacent pairs are merged and the frames per column double,
//! so memory stays bounded for any track length.
//!
//! Levels are stored in dB relative to the power of a full-scale sine in one
//! Hann-windowed bin (`(N/4)²`), quantized to 0.5 dB in a `u8`:
//! `value = round((dB − FLOOR_DB) × 2)`, clamped to `0..=255`, so `0` means
//! "at or below −127.5 dB". The reference is stored in the artifact.

/// Format version of the serialized artifact. Bump on layout changes.
pub const FORMAT_VERSION: u16 = 1;
pub const ALGORITHM_VERSION: &str = "spectrogram/1.0.0";
pub const BANDS: usize = 256;
pub const MAX_COLUMNS: usize = 4096;
pub const FLOOR_DB: f64 = -127.5;
const STEP_DB: f64 = 0.5;
const MAGIC: &[u8; 4] = b"SMSG";

/// A decoded spectrogram: `columns × bands` levels, column-major.
#[derive(Debug, Clone, PartialEq)]
pub struct Spectrogram {
    pub sample_rate: u32,
    pub hop_size: u32,
    pub frames_per_column: u32,
    pub frames: u64,
    pub bands: u16,
    /// Quantized dB per cell, `columns × bands`, column-major, band 0 = lowest.
    pub cells: Vec<u8>,
}

impl Spectrogram {
    pub fn columns(&self) -> usize {
        self.cells.len() / usize::from(self.bands.max(1))
    }

    pub fn max_hz(&self) -> f64 {
        f64::from(self.sample_rate) / 2.0
    }

    pub fn duration_ms(&self) -> u64 {
        self.frames * u64::from(self.hop_size) * 1000 / u64::from(self.sample_rate.max(1))
    }

    pub fn db(cell: u8) -> f64 {
        FLOOR_DB + f64::from(cell) * STEP_DB
    }

    /// Resample to at most `columns × bands` cells by taking the loudest cell
    /// in each block, so short events are never averaged away.
    #[must_use]
    pub fn downsample(&self, max_columns: usize, max_bands: usize) -> Spectrogram {
        let (src_cols, src_bands) = (self.columns(), usize::from(self.bands));
        let cols = max_columns.clamp(1, src_cols.max(1));
        let bnds = max_bands.clamp(1, src_bands.max(1));
        if cols == src_cols && bnds == src_bands {
            return self.clone();
        }
        let mut cells = vec![0u8; cols * bnds];
        for c in 0..cols {
            let (c0, c1) = (
                c * src_cols / cols,
                ((c + 1) * src_cols / cols).max(c * src_cols / cols + 1),
            );
            for b in 0..bnds {
                let (b0, b1) = (
                    b * src_bands / bnds,
                    ((b + 1) * src_bands / bnds).max(b * src_bands / bnds + 1),
                );
                let mut max = 0u8;
                for sc in c0..c1.min(src_cols) {
                    let column = &self.cells[sc * src_bands..(sc + 1) * src_bands];
                    for &v in &column[b0..b1.min(src_bands)] {
                        max = max.max(v);
                    }
                }
                cells[c * bnds + b] = max;
            }
        }
        #[allow(clippy::cast_possible_truncation)]
        let frames_per_column = (self.frames.div_ceil(cols as u64)).max(1) as u32;
        Spectrogram {
            sample_rate: self.sample_rate,
            hop_size: self.hop_size,
            frames_per_column,
            frames: self.frames,
            #[allow(clippy::cast_possible_truncation)]
            bands: bnds as u16,
            cells,
        }
    }

    /// `"SMSG" u16 version u32 rate u32 hop u32 frames/col u64 frames u16 bands u32 columns`, then cells.
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(32 + self.cells.len());
        out.extend_from_slice(MAGIC);
        out.extend_from_slice(&FORMAT_VERSION.to_le_bytes());
        out.extend_from_slice(&self.sample_rate.to_le_bytes());
        out.extend_from_slice(&self.hop_size.to_le_bytes());
        out.extend_from_slice(&self.frames_per_column.to_le_bytes());
        out.extend_from_slice(&self.frames.to_le_bytes());
        out.extend_from_slice(&self.bands.to_le_bytes());
        #[allow(clippy::cast_possible_truncation)]
        out.extend_from_slice(&(self.columns() as u32).to_le_bytes());
        out.extend_from_slice(&self.cells);
        out
    }

    /// # Errors
    ///
    /// Rejects truncated data, a wrong magic number or an unknown version.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, &'static str> {
        let header = 4 + 2 + 4 + 4 + 4 + 8 + 2 + 4;
        if bytes.len() < header || &bytes[..4] != MAGIC {
            return Err("not a spectrogram artifact");
        }
        let u16_at = |i: usize| u16::from_le_bytes([bytes[i], bytes[i + 1]]);
        let u32_at =
            |i: usize| u32::from_le_bytes([bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]]);
        if u16_at(4) != FORMAT_VERSION {
            return Err("unsupported spectrogram format version");
        }
        let bands = u16_at(26);
        let columns = u32_at(28) as usize;
        let cells = &bytes[header..];
        if bands == 0 || cells.len() != columns * usize::from(bands) {
            return Err("truncated spectrogram artifact");
        }
        Ok(Self {
            sample_rate: u32_at(6),
            hop_size: u32_at(10),
            frames_per_column: u32_at(14),
            frames: u64::from_le_bytes([
                bytes[18], bytes[19], bytes[20], bytes[21], bytes[22], bytes[23], bytes[24],
                bytes[25],
            ]),
            bands,
            cells: cells.to_vec(),
        })
    }
}

/// Streaming builder fed one power spectrum per analysis frame.
#[derive(Debug)]
pub struct SpectrogramBuilder {
    sample_rate: u32,
    hop_size: u32,
    reference_power: f64,
    frames_per_column: u32,
    frames: u64,
    /// Mean band power per completed column.
    columns: Vec<[f32; BANDS]>,
    pending: [f64; BANDS],
    pending_frames: u32,
}

impl SpectrogramBuilder {
    pub fn new(sample_rate: u32, frame_size: usize, hop_size: usize) -> Self {
        let reference = frame_size as f64 / 4.0;
        Self {
            sample_rate,
            #[allow(clippy::cast_possible_truncation)]
            hop_size: hop_size as u32,
            reference_power: reference * reference,
            frames_per_column: 1,
            frames: 0,
            columns: Vec::new(),
            pending: [0.0; BANDS],
            pending_frames: 0,
        }
    }

    /// Add one frame's one-sided power spectrum.
    pub fn push(&mut self, power: &[f64]) {
        let bins = power.len().max(1);
        for (band, acc) in self.pending.iter_mut().enumerate() {
            let (start, end) = (
                band * bins / BANDS,
                ((band + 1) * bins / BANDS).max(band * bins / BANDS + 1),
            );
            let slice = &power[start.min(bins - 1)..end.min(bins)];
            *acc += slice.iter().sum::<f64>() / slice.len().max(1) as f64;
        }
        self.pending_frames += 1;
        self.frames += 1;
        if self.pending_frames == self.frames_per_column {
            self.flush_column();
        }
    }

    fn flush_column(&mut self) {
        let n = f64::from(self.pending_frames.max(1));
        let mut column = [0f32; BANDS];
        for (dst, acc) in column.iter_mut().zip(&self.pending) {
            #[allow(clippy::cast_possible_truncation)]
            {
                *dst = (acc / n) as f32;
            }
        }
        self.columns.push(column);
        self.pending = [0.0; BANDS];
        self.pending_frames = 0;
        if self.columns.len() >= MAX_COLUMNS {
            self.columns = self
                .columns
                .chunks(2)
                .map(|pair| {
                    let mut merged = [0f32; BANDS];
                    for (i, m) in merged.iter_mut().enumerate() {
                        *m = pair.iter().map(|c| c[i]).sum::<f32>() / pair.len() as f32;
                    }
                    merged
                })
                .collect();
            self.frames_per_column *= 2;
        }
    }

    fn quantize(&self, power: f64) -> u8 {
        let db = 10.0 * (power.max(1e-30) / self.reference_power).log10();
        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        let q = ((db - FLOOR_DB) / STEP_DB).round().clamp(0.0, 255.0) as u8;
        q
    }

    pub fn finish(mut self) -> Spectrogram {
        if self.pending_frames > 0 {
            self.flush_column();
        }
        let cells = self
            .columns
            .iter()
            .flat_map(|c| c.iter().map(|&p| f64::from(p)).collect::<Vec<_>>())
            .map(|p| self.quantize(p))
            .collect();
        Spectrogram {
            sample_rate: self.sample_rate,
            hop_size: self.hop_size,
            frames_per_column: self.frames_per_column,
            frames: self.frames,
            #[allow(clippy::cast_possible_truncation)]
            bands: BANDS as u16,
            cells,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: u32 = 22_050;
    const N: usize = 2048;
    const BINS: usize = N / 2 + 1;

    fn tone(bin: usize, magnitude: f64) -> Vec<f64> {
        let mut p = vec![0.0; BINS];
        p[bin] = magnitude * magnitude;
        p
    }

    #[test]
    fn full_scale_bin_reads_zero_db_in_its_band() {
        let mut b = SpectrogramBuilder::new(SR, N, 512);
        // A full-scale sine peaks at N/4 in a Hann-windowed bin. Pooling a
        // 4-bin band averages it with three empty bins: −6.02 dB.
        b.push(&tone(400, N as f64 / 4.0));
        let s = b.finish();
        assert_eq!(s.columns(), 1);
        let band = (0..BANDS)
            .find(|b| b * BINS / BANDS <= 400 && 400 < (b + 1) * BINS / BANDS)
            .unwrap();
        let db = Spectrogram::db(s.cells[band]);
        assert!((db + 6.0).abs() < 0.6, "band {band}: {db} dB");
        assert_eq!(s.cells[0], 0, "empty bands sit at the floor");
    }

    #[test]
    fn memory_stays_bounded_for_long_tracks() {
        let mut b = SpectrogramBuilder::new(SR, N, 512);
        let silence = vec![0.0; BINS];
        for _ in 0..(MAX_COLUMNS * 5) {
            b.push(&silence);
        }
        let s = b.finish();
        assert!(s.columns() < MAX_COLUMNS, "{} columns", s.columns());
        assert_eq!(s.frames, (MAX_COLUMNS * 5) as u64);
        assert!(s.frames_per_column >= 4);
    }

    #[test]
    fn serialization_round_trips_and_rejects_damage() {
        let mut b = SpectrogramBuilder::new(SR, N, 512);
        for i in 0..10 {
            b.push(&tone(10 + i, 100.0));
        }
        let s = b.finish();
        let bytes = s.to_bytes();
        assert_eq!(Spectrogram::from_bytes(&bytes).unwrap(), s);
        assert!(Spectrogram::from_bytes(&bytes[..bytes.len() - 1]).is_err());
        assert!(Spectrogram::from_bytes(b"nope").is_err());
    }

    #[test]
    fn downsampling_keeps_the_loudest_cell() {
        let mut b = SpectrogramBuilder::new(SR, N, 512);
        for i in 0..100 {
            let level = if i == 37 { N as f64 / 4.0 } else { 1.0 };
            b.push(&tone(600, level));
        }
        let s = b.finish();
        let small = s.downsample(10, 16);
        assert_eq!(small.columns(), 10);
        assert_eq!(small.bands, 16);
        let loudest = *small.cells.iter().max().unwrap();
        assert_eq!(
            loudest,
            *s.cells.iter().max().unwrap(),
            "a brief event survives"
        );
    }

    #[test]
    fn duration_follows_frames_and_hop() {
        let mut b = SpectrogramBuilder::new(SR, N, 512);
        for _ in 0..431 {
            b.push(&vec![0.0; BINS]);
        }
        let s = b.finish();
        assert_eq!(s.duration_ms(), 431 * 512 * 1000 / u64::from(SR));
        assert!((s.max_hz() - 11_025.0).abs() < 1e-9);
    }
}
