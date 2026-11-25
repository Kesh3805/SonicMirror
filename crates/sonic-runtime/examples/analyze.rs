//! Import and analyze audio files from the command line, printing the same
//! JSON payloads the desktop IPC commands return.
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
                results.push(serde_json::json!({
                    "track": track,
                    "analysis": analysis,
                    "waveform": waveform,
                }));
            }
            Err(e) => eprintln!("{}: {} ({})", path.display(), e, e.code()),
        }
    }
    println!("{}", serde_json::to_string_pretty(&results)?);
    Ok(())
}
