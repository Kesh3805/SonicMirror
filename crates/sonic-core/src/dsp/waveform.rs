//! Multiresolution waveform envelope (SAD §37).
//!
//! The base level stores, for every 10 ms of audio, the minimum and maximum
//! sample value across all channels. Each higher level merges adjacent pairs of
//! buckets, so the UI can draw any zoom level from real extrema without
//! inventing detail. The final partial bucket is always retained.

/// Format version of the serialized envelope. Bump on layout changes.
pub const FORMAT_VERSION: u16 = 1;

/// Base bucket duration in milliseconds.
pub const BASE_BUCKET_MS: u32 = 10;

const MAGIC: &[u8; 4] = b"SMWF";

/// Minimum and maximum normalized sample amplitude within one bucket.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Bucket {
    pub min: f32,
    pub max: f32,
}

impl Bucket {
    const EMPTY: Self = Self {
        min: f32::INFINITY,
        max: f32::NEG_INFINITY,
    };

    fn merge(self, other: Self) -> Self {
        Self {
            min: self.min.min(other.min),
            max: self.max.max(other.max),
        }
    }
}

/// A complete envelope: level 0 is the base resolution.
#[derive(Debug, Clone, PartialEq)]
pub struct WaveformEnvelope {
    pub sample_rate: u32,
    pub total_frames: u64,
    pub frames_per_bucket: u32,
    pub levels: Vec<Vec<Bucket>>,
}

impl WaveformEnvelope {
    pub fn duration_ms(&self) -> u64 {
        self.total_frames * 1000 / u64::from(self.sample_rate.max(1))
    }

    /// The coarsest level that still has at least `target` buckets, so a
    /// viewport of `target` pixels never receives fewer buckets than pixels.
    pub fn level_for(&self, target: usize) -> usize {
        self.levels
            .iter()
            .rposition(|level| level.len() >= target)
            .unwrap_or(0)
    }

    /// Serialize as little-endian bytes:
    /// `"SMWF" u16 version u32 rate u64 frames u32 frames_per_bucket u16 levels`,
    /// then per level `u32 count` followed by `count × (f32 min, f32 max)`.
    ///
    /// # Panics
    ///
    /// Panics if there are more than `u16::MAX` levels or `u32::MAX` buckets in
    /// a level, which cannot happen for audio shorter than a year.
    pub fn to_bytes(&self) -> Vec<u8> {
        let buckets: usize = self.levels.iter().map(Vec::len).sum();
        let mut out = Vec::with_capacity(24 + self.levels.len() * 4 + buckets * 8);
        out.extend_from_slice(MAGIC);
        out.extend_from_slice(&FORMAT_VERSION.to_le_bytes());
        out.extend_from_slice(&self.sample_rate.to_le_bytes());
        out.extend_from_slice(&self.total_frames.to_le_bytes());
        out.extend_from_slice(&self.frames_per_bucket.to_le_bytes());
        out.extend_from_slice(&u16::try_from(self.levels.len()).unwrap().to_le_bytes());
        for level in &self.levels {
            out.extend_from_slice(&u32::try_from(level.len()).unwrap().to_le_bytes());
            for b in level {
                out.extend_from_slice(&b.min.to_le_bytes());
                out.extend_from_slice(&b.max.to_le_bytes());
            }
        }
        out
    }

    /// Parse bytes produced by [`Self::to_bytes`].
    ///
    /// # Errors
    ///
    /// Returns a description when the bytes are truncated, have the wrong
    /// magic number or an unsupported format version.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, &'static str> {
        let mut r = Reader { bytes, pos: 0 };
        if r.take(4)? != MAGIC {
            return Err("not a waveform envelope");
        }
        if r.u16()? != FORMAT_VERSION {
            return Err("unsupported waveform format version");
        }
        let sample_rate = r.u32()?;
        let total_frames = r.u64()?;
        let frames_per_bucket = r.u32()?;
        let level_count = r.u16()?;
        let mut levels = Vec::with_capacity(usize::from(level_count));
        for _ in 0..level_count {
            let count = r.u32()? as usize;
            if count > (bytes.len() - r.pos) / 8 {
                return Err("truncated waveform envelope");
            }
            let mut level = Vec::with_capacity(count);
            for _ in 0..count {
                level.push(Bucket {
                    min: r.f32()?,
                    max: r.f32()?,
                });
            }
            levels.push(level);
        }
        Ok(Self {
            sample_rate,
            total_frames,
            frames_per_bucket,
            levels,
        })
    }
}

struct Reader<'a> {
    bytes: &'a [u8],
    pos: usize,
}

impl<'a> Reader<'a> {
    fn take(&mut self, n: usize) -> Result<&'a [u8], &'static str> {
        let end = self
            .pos
            .checked_add(n)
            .ok_or("truncated waveform envelope")?;
        let slice = self
            .bytes
            .get(self.pos..end)
            .ok_or("truncated waveform envelope")?;
        self.pos = end;
        Ok(slice)
    }

    fn u16(&mut self) -> Result<u16, &'static str> {
        Ok(u16::from_le_bytes(self.take(2)?.try_into().unwrap()))
    }

    fn u32(&mut self) -> Result<u32, &'static str> {
        Ok(u32::from_le_bytes(self.take(4)?.try_into().unwrap()))
    }

    fn u64(&mut self) -> Result<u64, &'static str> {
        Ok(u64::from_le_bytes(self.take(8)?.try_into().unwrap()))
    }

    fn f32(&mut self) -> Result<f32, &'static str> {
        Ok(f32::from_le_bytes(self.take(4)?.try_into().unwrap()))
    }
}

/// Streaming builder for [`WaveformEnvelope`].
#[derive(Debug)]
pub struct EnvelopeBuilder {
    sample_rate: u32,
    frames_per_bucket: u32,
    current: Bucket,
    frames_in_current: u32,
    total_frames: u64,
    base: Vec<Bucket>,
}

impl EnvelopeBuilder {
    pub fn new(sample_rate: u32) -> Self {
        let frames_per_bucket = (sample_rate * BASE_BUCKET_MS / 1000).max(1);
        Self {
            sample_rate,
            frames_per_bucket,
            current: Bucket::EMPTY,
            frames_in_current: 0,
            total_frames: 0,
            base: Vec::new(),
        }
    }

    /// Feed interleaved samples with `channels` channels at the native rate.
    pub fn push(&mut self, interleaved: &[f32], channels: usize) {
        for frame in interleaved.chunks_exact(channels.max(1)) {
            for &s in frame {
                self.current.min = self.current.min.min(s);
                self.current.max = self.current.max.max(s);
            }
            self.frames_in_current += 1;
            self.total_frames += 1;
            if self.frames_in_current == self.frames_per_bucket {
                self.base.push(self.current);
                self.current = Bucket::EMPTY;
                self.frames_in_current = 0;
            }
        }
    }

    /// Finish the envelope, keeping the final partial bucket.
    pub fn finish(mut self) -> WaveformEnvelope {
        if self.frames_in_current > 0 {
            self.base.push(self.current);
        }
        let mut levels = Vec::new();
        let mut current = self.base;
        while current.len() > 1 {
            let next = current
                .chunks(2)
                .map(|pair| pair.iter().copied().fold(Bucket::EMPTY, Bucket::merge))
                .collect();
            levels.push(std::mem::replace(&mut current, next));
        }
        levels.push(current);
        WaveformEnvelope {
            sample_rate: self.sample_rate,
            total_frames: self.total_frames,
            frames_per_bucket: self.frames_per_bucket,
            levels,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dsp::synth;

    fn build(signal: &[f32], channels: usize, rate: u32) -> WaveformEnvelope {
        let mut b = EnvelopeBuilder::new(rate);
        for chunk in signal.chunks(777 * channels) {
            b.push(chunk, channels);
        }
        b.finish()
    }

    #[test]
    fn bucket_count_keeps_partial_tail() {
        // 1.005 s at 1 kHz → 100 full 10 ms buckets plus one partial.
        let env = build(&synth::sine(1000, 1.005, 50.0, 0.5), 1, 1000);
        assert_eq!(env.levels[0].len(), 101);
        assert_eq!(env.total_frames, 1005);
        assert_eq!(env.duration_ms(), 1005);
    }

    #[test]
    fn extrema_are_real_samples() {
        let env = build(&synth::sine(44_100, 1.0, 100.0, 0.5), 1, 44_100);
        let top = env.levels.last().unwrap()[0];
        assert!((top.max - 0.5).abs() < 1e-3 && (top.min + 0.5).abs() < 1e-3);
    }

    #[test]
    fn impulse_is_localized_at_every_level() {
        let env = build(&synth::impulse(1000, 1.0, 0.505, 1.0), 1, 1000);
        // Sample 505 falls in base bucket 50.
        let hits: Vec<usize> = env.levels[0]
            .iter()
            .enumerate()
            .filter(|(_, b)| b.max > 0.5)
            .map(|(i, _)| i)
            .collect();
        assert_eq!(hits, vec![50]);
        assert!(env.levels[1][25].max > 0.5);
    }

    #[test]
    fn channels_are_combined() {
        let stereo: Vec<f32> = (0..2000)
            .flat_map(|i| if i == 10 { [0.0, -0.9] } else { [0.0, 0.0] })
            .collect();
        let env = build(&stereo, 2, 1000);
        assert!((env.levels[0][1].min + 0.9).abs() < 1e-6);
    }

    #[test]
    fn pyramid_halves_until_single_bucket() {
        let env = build(&synth::silence(1000, 1.0), 1, 1000);
        let lens: Vec<usize> = env.levels.iter().map(Vec::len).collect();
        assert_eq!(lens, vec![100, 50, 25, 13, 7, 4, 2, 1]);
        assert_eq!(env.level_for(30), 1);
        assert_eq!(env.level_for(1000), 0);
    }

    #[test]
    fn serialization_round_trips() {
        let env = build(&synth::white_noise(8000, 0.5, 0.7, 5), 1, 8000);
        let bytes = env.to_bytes();
        assert_eq!(WaveformEnvelope::from_bytes(&bytes).unwrap(), env);
        assert!(WaveformEnvelope::from_bytes(&bytes[..bytes.len() - 3]).is_err());
        assert!(WaveformEnvelope::from_bytes(b"nope").is_err());
    }
}
