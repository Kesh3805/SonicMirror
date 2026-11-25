//! Streaming media decoding.
//!
//! [`DecodedStream`] probes a media source, selects its default audio track
//! and yields decoded interleaved `f32` blocks one packet at a time. The whole
//! track is never held in memory.

use symphonia::core::codecs::audio::{AudioDecoder, AudioDecoderOptions};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::probe::Hint;
use symphonia::core::formats::{FormatOptions, FormatReader, TrackType};
use symphonia::core::io::{MediaSource, MediaSourceStream, MediaSourceStreamOptions};
use symphonia::core::meta::MetadataOptions;

use super::MediaError;

/// Packets that fail to decode are skipped; more than this many in a row
/// means the stream is treated as corrupt.
const MAX_CONSECUTIVE_DECODE_ERRORS: u32 = 16;

/// Signal properties reported by the container and decoder.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TechnicalProperties {
    pub sample_rate: u32,
    pub channels: u16,
    /// Playable frames declared by the container, if known.
    pub declared_frames: Option<u64>,
    /// Short codec identifier, e.g. `flac` or `mp3`.
    pub codec: String,
}

/// One decoded block of interleaved samples.
#[derive(Debug, Clone, Copy)]
pub struct AudioBlock<'a> {
    pub samples: &'a [f32],
    pub channels: usize,
    pub sample_rate: u32,
}

impl AudioBlock<'_> {
    pub fn frames(&self) -> usize {
        self.samples.len() / self.channels.max(1)
    }
}

/// A probed, decodable audio stream.
pub struct DecodedStream {
    format: Box<dyn FormatReader>,
    decoder: Box<dyn AudioDecoder>,
    track_id: u32,
    properties: TechnicalProperties,
    buffer: Vec<f32>,
    skipped_packets: u64,
}

impl std::fmt::Debug for DecodedStream {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DecodedStream")
            .field("properties", &self.properties)
            .field("skipped_packets", &self.skipped_packets)
            .finish_non_exhaustive()
    }
}

impl DecodedStream {
    /// Probe `source` by content. `extension_hint` only helps detection; the
    /// format is never trusted from the extension alone.
    ///
    /// # Errors
    ///
    /// Returns [`MediaError`] when the format or codec is unsupported, there is
    /// no audio track, or the codec parameters are incomplete.
    pub fn open(
        source: Box<dyn MediaSource>,
        extension_hint: Option<&str>,
    ) -> Result<Self, MediaError> {
        let stream = MediaSourceStream::new(source, MediaSourceStreamOptions::default());
        let mut hint = Hint::new();
        if let Some(ext) = extension_hint {
            hint.with_extension(ext);
        }

        let format = symphonia::default::get_probe()
            .probe(
                &hint,
                stream,
                FormatOptions::default(),
                MetadataOptions::default(),
            )
            .map_err(|e| MediaError::from_symphonia(&e))?;

        let track = format
            .default_track(TrackType::Audio)
            .ok_or(MediaError::NoAudioTrack)?;
        let params = track
            .codec_params
            .as_ref()
            .and_then(|p| p.audio())
            .ok_or(MediaError::NoAudioTrack)?;

        let decoder = symphonia::default::get_codecs()
            .make_audio_decoder(params, &AudioDecoderOptions::default())
            .map_err(|e| MediaError::from_symphonia(&e))?;

        let sample_rate = params
            .sample_rate
            .ok_or(MediaError::MissingParameter("sample rate"))?;
        let channels = params
            .channels
            .as_ref()
            .map(symphonia::core::audio::Channels::count)
            .ok_or(MediaError::MissingParameter("channel layout"))?;
        let channels = u16::try_from(channels)
            .ok()
            .filter(|c| *c > 0)
            .ok_or(MediaError::MissingParameter("channel layout"))?;

        let properties = TechnicalProperties {
            sample_rate,
            channels,
            declared_frames: track.num_frames,
            codec: decoder.codec_info().short_name.to_owned(),
        };
        let track_id = track.id;

        Ok(Self {
            format,
            decoder,
            track_id,
            properties,
            buffer: Vec::new(),
            skipped_packets: 0,
        })
    }

    pub fn properties(&self) -> &TechnicalProperties {
        &self.properties
    }

    /// Packets skipped because they could not be decoded.
    pub fn skipped_packets(&self) -> u64 {
        self.skipped_packets
    }

    /// Decode the next packet of the selected track.
    ///
    /// Returns `Ok(None)` at the end of the stream.
    ///
    /// # Errors
    ///
    /// Returns [`MediaError::Corrupt`] after repeated undecodable packets, or
    /// when the stream changes sample rate or channel count mid-track.
    pub fn next_block(&mut self) -> Result<Option<AudioBlock<'_>>, MediaError> {
        let mut consecutive_errors = 0;
        loop {
            let packet = match self.format.next_packet() {
                Ok(Some(packet)) => packet,
                // End of stream. Chained streams (e.g. multi-part Ogg) and a
                // truncated tail are treated as the end of the first track.
                Ok(None) | Err(SymphoniaError::ResetRequired) => return Ok(None),
                Err(SymphoniaError::IoError(e))
                    if e.kind() == std::io::ErrorKind::UnexpectedEof =>
                {
                    return Ok(None);
                }
                Err(e) => return Err(MediaError::from_symphonia(&e)),
            };
            if packet.track_id != self.track_id {
                continue;
            }

            match self.decoder.decode(&packet) {
                Ok(decoded) => {
                    let spec = decoded.spec();
                    let channels = spec.channels().count();
                    if spec.rate() != self.properties.sample_rate
                        || channels != usize::from(self.properties.channels)
                    {
                        return Err(MediaError::Corrupt(
                            "signal format changed mid-stream".into(),
                        ));
                    }
                    decoded.copy_to_vec_interleaved(&mut self.buffer);
                    if self.buffer.is_empty() {
                        continue;
                    }
                    return Ok(Some(AudioBlock {
                        samples: &self.buffer,
                        channels,
                        sample_rate: spec.rate(),
                    }));
                }
                Err(SymphoniaError::DecodeError(_) | SymphoniaError::IoError(_)) => {
                    self.skipped_packets += 1;
                    consecutive_errors += 1;
                    if consecutive_errors > MAX_CONSECUTIVE_DECODE_ERRORS {
                        return Err(MediaError::Corrupt("too many undecodable packets".into()));
                    }
                }
                Err(e) => return Err(MediaError::from_symphonia(&e)),
            }
        }
    }
}
