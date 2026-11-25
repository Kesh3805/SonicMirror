"""Generate the codec fixtures in tests/fixtures/media.

Every fixture encodes the same synthetic signal, written here, so the files
carry no third-party rights and expected values are known exactly:

    2.0 s, 44 100 Hz, stereo, 440 Hz sine at amplitude 0.5 (-6.02 dBFS peak)
    in both channels, 16-bit PCM source.

Usage (needs FFmpeg with libmp3lame and libvorbis on PATH):

    python scripts/fixtures/make_media_fixtures.py
"""

from __future__ import annotations

import math
import struct
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

SAMPLE_RATE = 44_100
SECONDS = 2.0
FREQUENCY = 440.0
AMPLITUDE = 0.5

# (output name, FFmpeg codec arguments)
ENCODINGS = [
    ("sine440.flac", ["-c:a", "flac"]),
    ("sine440_alac.m4a", ["-c:a", "alac"]),
    ("sine440.mp3", ["-c:a", "libmp3lame", "-b:a", "192k"]),
    ("sine440.ogg", ["-c:a", "libvorbis", "-q:a", "5"]),
    ("sine440_aac.m4a", ["-c:a", "aac", "-b:a", "192k"]),
    ("sine440.aiff", ["-c:a", "pcm_s16be"]),
]


def write_source(path: Path) -> None:
    frames = int(SAMPLE_RATE * SECONDS)
    data = bytearray()
    for i in range(frames):
        s = int(round(AMPLITUDE * math.sin(2 * math.pi * FREQUENCY * i / SAMPLE_RATE) * 32767))
        data += struct.pack("<hh", s, s)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(bytes(data))


def main() -> int:
    out_dir = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "media"
    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / "sine440.wav"
        write_source(source)
        (out_dir / "sine440.wav").write_bytes(source.read_bytes())
        for name, codec in ENCODINGS:
            cmd = [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(source),
                "-map_metadata", "-1",
                "-fflags", "+bitexact", "-flags:a", "+bitexact",
                *codec,
                str(out_dir / name),
            ]
            subprocess.run(cmd, check=True)
            print(f"wrote {name} ({(out_dir / name).stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
