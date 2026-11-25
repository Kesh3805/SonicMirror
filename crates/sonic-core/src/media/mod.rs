//! Media probing and streaming decoding.

mod decode;
pub mod metadata;
pub mod wav;

pub use decode::{AudioBlock, DecodedStream, TechnicalProperties};

/// Structured media failures. Messages are safe to show: they never contain
/// file paths or tag contents.
#[derive(Debug, thiserror::Error)]
pub enum MediaError {
    #[error("unsupported format or codec: {0}")]
    Unsupported(String),
    #[error("the file has no decodable audio track")]
    NoAudioTrack,
    #[error("the audio stream is missing its {0}")]
    MissingParameter(&'static str),
    #[error("the audio data is corrupt: {0}")]
    Corrupt(String),
    #[error("the file could not be read")]
    Io(#[from] std::io::Error),
}

impl MediaError {
    /// Stable machine-readable code for the IPC error contract.
    pub fn code(&self) -> &'static str {
        match self {
            Self::Unsupported(_) => "media.unsupported",
            Self::NoAudioTrack => "media.no_audio_track",
            Self::MissingParameter(_) => "media.missing_parameter",
            Self::Corrupt(_) => "media.corrupt",
            Self::Io(_) => "media.io",
        }
    }

    pub(crate) fn from_symphonia(error: &symphonia::core::errors::Error) -> Self {
        use symphonia::core::errors::Error;
        match error {
            Error::Unsupported(what) => Self::Unsupported((*what).to_owned()),
            Error::DecodeError(what) => Self::Corrupt((*what).to_owned()),
            Error::IoError(e) => Self::Io(std::io::Error::new(e.kind(), "read failed")),
            other => Self::Corrupt(other.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::io::Cursor;

    use super::*;
    use crate::dsp::synth;

    fn open(bytes: Vec<u8>) -> Result<DecodedStream, MediaError> {
        DecodedStream::open(Box::new(Cursor::new(bytes)), Some("wav"))
    }

    #[test]
    fn decodes_mono_wav_without_loss_beyond_quantization() {
        let signal = synth::sine(8000, 1.0, 440.0, 0.5);
        let mut stream = open(wav::encode_pcm16(&signal, 1, 8000)).unwrap();
        assert_eq!(stream.properties().sample_rate, 8000);
        assert_eq!(stream.properties().channels, 1);

        let mut decoded = Vec::new();
        while let Some(block) = stream.next_block().unwrap() {
            assert_eq!(block.channels, 1);
            decoded.extend_from_slice(block.samples);
        }
        assert_eq!(decoded.len(), signal.len());
        let max_err = signal
            .iter()
            .zip(&decoded)
            .map(|(a, b)| (a - b).abs())
            .fold(0.0f32, f32::max);
        assert!(max_err < 1.0 / 16_000.0, "max error {max_err}");
    }

    #[test]
    fn decodes_interleaved_stereo() {
        let left = synth::sine(8000, 0.5, 300.0, 0.5);
        let right = synth::silence(8000, 0.5);
        let interleaved: Vec<f32> = left
            .iter()
            .zip(&right)
            .flat_map(|(l, r)| [*l, *r])
            .collect();
        let mut stream = open(wav::encode_pcm16(&interleaved, 2, 8000)).unwrap();
        assert_eq!(stream.properties().channels, 2);
        let mut frames = 0;
        while let Some(block) = stream.next_block().unwrap() {
            assert!(block.samples.chunks(2).all(|f| f[1] == 0.0));
            frames += block.frames();
        }
        assert_eq!(frames, left.len());
    }

    #[test]
    fn garbage_is_rejected_with_structured_error() {
        let err = open(b"definitely not audio, just some bytes".repeat(64)).unwrap_err();
        assert_eq!(err.code(), "media.unsupported");
    }

    #[test]
    fn truncated_file_ends_cleanly() {
        let mut bytes = wav::encode_pcm16(&synth::sine(8000, 1.0, 440.0, 0.5), 1, 8000);
        bytes.truncate(bytes.len() / 2);
        let mut stream = open(bytes).unwrap();
        let mut frames = 0;
        while let Some(block) = stream.next_block().unwrap() {
            frames += block.frames();
        }
        assert!(frames > 3000 && frames < 4100, "frames {frames}");
    }
}
