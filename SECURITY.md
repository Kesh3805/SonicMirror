# Security Policy

SonicMirror parses untrusted media files with native code and has local filesystem access, so
security reports are taken seriously.

## Reporting a vulnerability

Please **do not** open a public issue. Use GitHub's
[private vulnerability reporting](https://github.com/Kesh3805/SonicMirror/security/advisories/new)
with a description, reproduction steps and, if possible, a minimal sample file.

You can expect an acknowledgment within a few days.

## Scope

In scope: crashes or memory exhaustion from crafted media or metadata, path traversal, escaping
the Tauri capability model, script injection through metadata, and any write to user audio files.

## Supported versions

Only the latest commit on `main` is supported until the first release.
