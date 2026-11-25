//! Descriptive tag metadata (title, artist, album, genre, year).
//!
//! Tags are untrusted input: text is stripped of control characters and
//! bounded in length before it reaches the catalog or the interface. Reading
//! tags never fails the import; missing or malformed tags simply yield `None`.

use std::io::{Read, Seek};

use lofty::config::ParseOptions;
use lofty::file::TaggedFileExt;
use lofty::probe::Probe;
use lofty::tag::{Accessor, Tag};

/// Upper bound on any single metadata string, in characters.
const MAX_TEXT_CHARS: usize = 512;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct TrackMetadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub year: Option<u32>,
}

/// Read tags from a seekable source. Returns empty metadata when the file has
/// no readable tags.
pub fn read_metadata<R: Read + Seek>(reader: R) -> TrackMetadata {
    let options = ParseOptions::new().read_properties(false);
    let tagged = Probe::new(reader)
        .options(options)
        .guess_file_type()
        .ok()
        .and_then(|probe| probe.read().ok());
    let Some(tagged) = tagged else {
        return TrackMetadata::default();
    };
    tagged
        .primary_tag()
        .or_else(|| tagged.first_tag())
        .map(from_tag)
        .unwrap_or_default()
}

fn from_tag(tag: &Tag) -> TrackMetadata {
    TrackMetadata {
        title: tag.title().and_then(|s| sanitize(&s)),
        artist: tag.artist().and_then(|s| sanitize(&s)),
        album: tag.album().and_then(|s| sanitize(&s)),
        genre: tag.genre().and_then(|s| sanitize(&s)),
        year: tag
            .date()
            .map(|d| u32::from(d.year))
            .filter(|y| (1000..=9999).contains(y)),
    }
}

/// Remove control characters, collapse surrounding whitespace and bound the
/// length. Returns `None` for text that is empty after cleaning.
pub fn sanitize(text: &str) -> Option<String> {
    let cleaned: String = text
        .chars()
        .filter(|c| !c.is_control())
        .take(MAX_TEXT_CHARS)
        .collect();
    let trimmed = cleaned.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_owned())
}

#[cfg(test)]
mod tests {
    use std::io::Cursor;

    use super::*;
    use crate::dsp::synth;
    use crate::media::wav;

    #[test]
    fn sanitize_strips_controls_and_bounds_length() {
        assert_eq!(
            sanitize("  Hello\u{0}\u{7} World \n"),
            Some("Hello World".into())
        );
        assert_eq!(sanitize(" \t\r\n"), None);
        assert_eq!(sanitize(&"x".repeat(10_000)).unwrap().chars().count(), 512);
    }

    #[test]
    fn untagged_file_yields_empty_metadata() {
        let bytes = wav::encode_pcm16(&synth::sine(8000, 0.1, 440.0, 0.5), 1, 8000);
        assert_eq!(read_metadata(Cursor::new(bytes)), TrackMetadata::default());
    }

    #[test]
    fn garbage_yields_empty_metadata() {
        let bytes = b"not a media file at all".repeat(10);
        assert_eq!(read_metadata(Cursor::new(bytes)), TrackMetadata::default());
    }
}
