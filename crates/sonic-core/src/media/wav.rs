//! Minimal 16-bit PCM WAV encoder for deterministic test fixtures.
//!
//! SonicMirror never writes user media; this exists so tests and benchmarks
//! can produce real container bytes from synthetic signals.

/// Encode interleaved samples in `[-1.0, 1.0]` as a 16-bit PCM WAV file.
///
/// # Panics
///
/// Panics if `channels` is zero or the data exceeds the 4 GiB RIFF limit.
pub fn encode_pcm16(interleaved: &[f32], channels: u16, sample_rate: u32) -> Vec<u8> {
    assert!(channels > 0, "channels must be non-zero");
    let data_len = u32::try_from(interleaved.len() * 2).expect("fixture too large for RIFF");
    let block_align = channels * 2;
    let byte_rate = sample_rate * u32::from(block_align);

    let mut out = Vec::with_capacity(44 + data_len as usize);
    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&(36 + data_len).to_le_bytes());
    out.extend_from_slice(b"WAVEfmt ");
    out.extend_from_slice(&16u32.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes()); // PCM
    out.extend_from_slice(&channels.to_le_bytes());
    out.extend_from_slice(&sample_rate.to_le_bytes());
    out.extend_from_slice(&byte_rate.to_le_bytes());
    out.extend_from_slice(&block_align.to_le_bytes());
    out.extend_from_slice(&16u16.to_le_bytes());
    out.extend_from_slice(b"data");
    out.extend_from_slice(&data_len.to_le_bytes());
    for &s in interleaved {
        #[allow(clippy::cast_possible_truncation)]
        let q = (s.clamp(-1.0, 1.0) * 32767.0).round() as i16;
        out.extend_from_slice(&q.to_le_bytes());
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn header_is_well_formed() {
        let bytes = encode_pcm16(&[0.0, 1.0, -1.0], 1, 44_100);
        assert_eq!(&bytes[0..4], b"RIFF");
        assert_eq!(&bytes[8..16], b"WAVEfmt ");
        assert_eq!(bytes.len(), 44 + 6);
        assert_eq!(i16::from_le_bytes([bytes[46], bytes[47]]), 32767);
        assert_eq!(i16::from_le_bytes([bytes[48], bytes[49]]), -32767);
    }
}
