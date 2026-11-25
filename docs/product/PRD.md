# SonicMirror — Product Requirements Document v1.0

| | |
|---|---|
| **Product** | Personal music observatory |
| **Platform** | Local-first, cross-platform desktop application |
| **Status** | Product direction approved, implementation specification established |
| **Release strategy** | Focused core, followed by progressive expansion |
| **Distribution** | Open-source software |
| **Date** | November 24, 2026 |

---

## 1. Executive summary

SonicMirror is a local-first music observatory that reveals the hidden structures, characteristics and relationships within personal music collections through digital signal processing, interactive visualization and generative expression.

Unlike conventional music players, streaming analytics services or professional audio-analysis tools, SonicMirror is designed around exploration and discovery. It allows users to experience their existing music collection as an interconnected acoustic landscape.

The application analyzes locally available audio files, extracts measurable acoustic features, constructs an interactive map of the collection and provides detailed explanations of individual tracks.

Future releases will extend this foundation into personal musical identities, procedural artwork, intelligent discovery and optional AI-assisted interpretations.

### Approved product decisions

| Dimension | Decision |
|---|---|
| Product identity | Music observatory |
| Visual direction | Editorial, scientific and generative |
| Application platform | Native desktop |
| Data architecture | Local-first |
| Analysis philosophy | Deterministic and explainable |
| Artificial intelligence | Optional, post-core release |
| Initial release | Library, Observatory and Atlas |
| Business model | Open-source, no mandatory subscription |
| Connectivity | Offline-first |
| Engineering philosophy | Correctness, simplicity, reproducibility and extensibility |

The initial product must deliver a complete, compelling experience without relying on future features to justify its existence.

## 2. Product manifesto

> Music is more than a collection of files, artists and genres. It is a landscape of relationships waiting to be discovered.
>
> **Your music. Your machine. Your discoveries.**

**Vision.** Become the most compelling way to visually explore and understand a personal music collection.

**Mission.** Make audio science accessible, meaningful and beautiful without compromising analytical integrity or user privacy.

### Product principles

1. **Science beneath the surface.** Every analytical result has a measurable foundation.
2. **Art in the experience.** Visualizations are expressive without becoming misleading.
3. **Discovery over consumption.** The application encourages exploration rather than maximizing listening time.
4. **Privacy by architecture.** Music and personal data remain under the user's control.
5. **Complexity through progressive disclosure.** Advanced capabilities do not obstruct basic interactions.
6. **No artificial intelligence dependency.** The product remains valuable without generative AI.
7. **Engineering with purpose.** Technology choices follow product requirements rather than portfolio buzzwords.

## 3. Problem definition

### 3.1 User problem

Personal music libraries contain substantial amounts of information that conventional music applications do not expose.

Most music applications organize tracks using descriptive metadata such as artist, album, genre and release year. These attributes describe the context of music but reveal little about its actual acoustic structure. Consequently, users cannot easily:

- Discover acoustic similarities between tracks from different genres.
- Understand how individual recordings differ in rhythm, dynamics and spectral characteristics.
- Visualize the diversity and structure of an entire music collection.
- Discover unusual or overlooked tracks in their existing libraries.
- Understand their collection beyond conventional metadata classifications.

Professional audio-analysis tools expose some of this information, but their workflows are generally designed for production, measurement or research rather than personal music exploration.

### 3.2 Product opportunity

SonicMirror bridges the gap between technical audio analysis and intuitive personal discovery.

| Existing approach | Limitation | SonicMirror opportunity |
|---|---|---|
| Conventional music libraries | Metadata-centric organization | Acoustic organization |
| Streaming summaries | Platform-dependent statistics | Independent, local analysis |
| Audio analyzers | Technical learning curve | Accessible analytical experiences |
| Generative music visualizers | Often transient and decorative | Reproducible, data-driven visualization |
| AI personality applications | Subjective and difficult to validate | Explainable, evidence-backed observations |

### 3.3 Jobs to be done

- When users **explore** their music collection, they want to discover connections, understand differences and find interesting patterns that ordinary music players do not expose.
- When users **investigate** a particular song, they want to understand what makes it sound distinctive without needing specialized audio-engineering knowledge.
- When users **compare** music, they want meaningful acoustic comparisons supported by actual measurements rather than arbitrary genre labels.

## 4. Target audience

### Primary persona: The Music Explorer

A music enthusiast who maintains a personal collection of locally accessible audio files and enjoys discovering patterns, artists and relationships.

| Attribute | Description |
|---|---|
| Music collection | Tens to thousands of tracks |
| Technical expertise | Not necessarily technical |
| Motivation | Curiosity, discovery and appreciation |
| Expected experience | Visually engaging and intuitive |
| Primary features | Library, Atlas, track comparisons |
| Main frustration | Conventional library organization feels limiting |

### Secondary persona: The Digital Collector

Maintains a substantial digital music archive, potentially spanning thousands of recordings, genres and formats. Values reliable indexing, organization, metadata, collection exploration and offline availability.

### Tertiary persona: The Audio Curious

A developer, musician, audio enthusiast or student interested in understanding signal characteristics and the algorithms behind music analysis. Values accurate measurements, transparent methodology, reproducibility and access to advanced analytical information.

### Explicitly excluded initial audiences

Professional mastering engineers, music producers requiring editing tools, streaming-only listeners with no accessible audio files, commercial music catalog operators and users seeking a complete music-player replacement. These audiences may benefit from parts of SonicMirror, but their requirements must not drive the initial release.

## 5. Resolving the product's strategic risks

The following decisions resolve the major uncertainties from PRD v0.1. Some are architectural decisions, while others require empirical validation before release.

### 5.1 Local music adoption

**Risk:** A significant portion of potential users consume music exclusively through streaming services.

**Resolution:** SonicMirror deliberately targets the local music community rather than competing for the entire music-streaming market. To minimize the onboarding barrier, the application includes a small, appropriately licensed **demonstration collection**, so a user can explore SonicMirror immediately without importing personal music.

First-launch options:

1. **Explore your own music** — import an existing folder of audio files.
2. **Explore the demonstration collection** — experience the Atlas and Observatory immediately.
3. **Start with an empty library** — configure your collection later.

The demo collection must contain original, public-domain or redistribution-licensed recordings with documented provenance. It must run locally and require no API credentials.

### 5.2 Streaming platform dependency

**Resolution:** No streaming-service integration in the initial release.

Spotify's current Developer Policy prohibits the creation of derived listening metrics and user profiles from Spotify content and restricts ingestion of Spotify content into AI models. The architecture keeps ingestion extensible, but no provider integration will be introduced without an explicit evaluation of its technical capabilities, permissions and licensing constraints.

### 5.3 Misleading acoustic similarity

**Resolution:** Acoustic similarity is treated as a measurable relationship between selected audio features, not an objective judgment of musical similarity.

| Concept | Meaning |
|---|---|
| Acoustic similarity | Similarity across selected signal descriptors |
| Visual proximity | Approximate relationship in the Atlas projection |
| Genre similarity | Relationship between descriptive genre classifications |
| Personal preference | A subjective judgment not established by signal analysis |

Nearest-neighbor results are calculated in the original normalized feature space, not solely from the displayed map coordinates.

### 5.4 Analysis accuracy

**Resolution:** Only validated measurements appear in the production interface. Every feature must support:

- A documented definition and unit.
- A versioned implementation.
- Reference or synthetic validation.
- An explicit unavailable or invalid state.
- Confidence information where meaningful.

Experimental metrics must not silently become production features.

### 5.5 Excessive engineering scope

**Resolution:** Release one coherent exploration workflow before expanding into the complete product ecosystem. No Identity, Studio, Journal, AI integration, plugin ecosystem or standalone CLI is required for the first stable core release.

### 5.6 Visual differentiation

**Resolution:** Product design is a prerequisite for feature completion, not a final-stage cosmetic activity. Each core experience requires a reviewed interface specification, interaction states and accessibility considerations before implementation is considered complete.

### 5.7 User validation

Before the stable release, conduct a formative evaluation with at least 10 target users, including several with substantial existing music libraries. The evaluation must investigate whether users understand the Atlas, discover meaningful relationships and consider the experience useful enough to revisit.

This is a release validation activity, not evidence that product-market fit has already been established.

---

# Part I — Release scope

## 6. Product ecosystem

| Module | Question it answers | Generation |
|---|---|---|
| Library | What music do I own? | Core |
| Observatory | What makes this song sound the way it does? | Core |
| Atlas | How is my music connected? | Core |
| Comparison | How do these two recordings differ? | Core |
| Identity | What defines my collection's character? | Post-core |
| Studio | What does my music look like as art? | Post-core |
| Discovery | What haven't I noticed in my collection? | Post-core |
| Journal | How has my relationship with music changed? | Future |
| Lab | How does the underlying analysis work? | Future |

## 7. Scope prioritization

**P0** — required for the first stable core release. **P1** — planned expansion after the core release. **P2** — future evaluation, not a committed feature.

| Capability | Priority |
|---|---|
| Local audio ingestion | P0 |
| Searchable music library | P0 |
| Background analysis | P0 |
| Waveform visualization | P0 |
| Spectrogram visualization | P0 |
| Acoustic feature inspection | P0 |
| Local audio playback | P0 |
| Interactive Sonic Atlas | P0 |
| Acoustic nearest-neighbor retrieval | P0 |
| Basic track comparison | P0 |
| User-created collections | P0 |
| Demonstration collection | P0 |
| Privacy and library settings | P0 |
| Analysis result export | P0 |
| Musical identity profiles | P1 |
| Generative art studio | P1 |
| Advanced discovery algorithms | P1 |
| Listening history | P2 |
| Personal journal | P2 |
| Advanced experimental workspace | P2 |
| Standalone CLI | P2 |
| External integrations | P2 |
| Optional generative AI | P2 |

### Explicit non-goals

The initial release will not include cloud synchronization, account authentication, audio editing, streaming downloads, social networking, paid subscriptions, automatic tag modification, medical or psychological profiling, collaborative playlists or mandatory internet services.

## 8. Definition of the core experience

The minimum complete SonicMirror workflow:

```
Launch → Import folder or open demo → Library builds while analysis runs in background
       → Open a track in the Observatory → Listen, inspect waveform/spectrogram/measurements
       → Open the Atlas → Explore regions, inspect neighbors → Compare two tracks
       → Save discoveries as a collection
```

The core product succeeds when **a user discovers something interesting about their music collection that would have been difficult to discover through conventional browsing.** Everything else supports this outcome.

---

# Part II — Functional requirements

## 9. FR-01: Application onboarding

**Priority:** P0 · **Objective:** Enable a new user to reach a meaningful exploration experience with minimal configuration.

| ID | Requirement |
|---|---|
| ONB-001 | Launch without requiring an account or internet access. |
| ONB-002 | Offer local folder import, demo collection and empty-library options. |
| ONB-003 | Explain that music files are analyzed locally and remain unmodified. |
| ONB-004 | Allow onboarding to be skipped and revisited. |
| ONB-005 | Explain analysis progress and allow exploration during background processing. |
| ONB-006 | Recover gracefully when selected directories are unavailable or inaccessible. |

**Acceptance criteria**

- Given a fresh installation, when the user selects the demonstration collection, then the user can access a populated Library, open a Track Observatory and explore a precomputed Atlas without internet connectivity.
- Given a user cancels folder selection, the application remains usable without showing a fatal error.
- Given an existing installation, onboarding is not repeatedly displayed unless explicitly reset.

## 10. FR-02: Sonic Library

**Priority:** P0 · **Objective:** Maintain a reliable, searchable representation of the user's locally accessible music.

| ID | Requirement |
|---|---|
| LIB-001 | Import individual audio files and directories. |
| LIB-002 | Recursively discover supported audio files. |
| LIB-003 | Extract metadata, technical format information and embedded artwork. |
| LIB-004 | Provide track, artist and album views. |
| LIB-005 | Search title, artist, album and genre metadata. |
| LIB-006 | Sort and filter tracks using metadata and available acoustic measurements. |
| LIB-007 | Detect byte-identical files and avoid duplicate analysis. |
| LIB-008 | Detect changed files through explicit or scheduled local rescanning while the application runs. |
| LIB-009 | Preserve catalog information for temporarily missing files. |
| LIB-010 | Identify unsupported, corrupt and inaccessible files. |
| LIB-011 | Create, rename and delete logical user collections. |
| LIB-012 | Add and remove tracks from collections without changing the source files. |
| LIB-013 | Show per-track metadata and analysis status. |
| LIB-014 | Allow an imported source to be removed from the catalog. |
| LIB-015 | Allow users to rescan a source on demand. |

### Supported media formats

| Format | Core release |
|---|---|
| MP3 | Required |
| WAV, common PCM variants | Required |
| FLAC | Required |
| Ogg Vorbis | Required |
| M4A, supported AAC/ALAC variants | Required following compatibility validation |
| AIFF | Best effort |
| DRM-protected files | Unsupported |
| Remote streaming URLs | Unsupported |
| Video files | Unsupported |

Format and codec detection must inspect media contents rather than trust filename extensions alone. Symphonia provides a suitable Rust decoding foundation for many of these formats, although individual codecs and container variants require explicit feature configuration and compatibility testing.

### File identity policy

Each physical file receives its own persistent catalog identifier. Byte-identical files can share analysis results through content hashing. Recordings that differ in encoding, mastering or edits must not automatically be merged based solely on matching title and artist metadata. Acoustic-fingerprint-based recording deduplication is outside P0.

**Acceptance criteria**

- Importing the same directory twice does not duplicate existing entries.
- Renamed files can be reconciled when identity matching is unambiguous.
- Removing a collection never deletes original audio.
- Missing files remain identifiable and can be reconciled when they become available again.
- One corrupt track does not interrupt processing of the entire collection.
- Search and filtering remain available while background analysis runs.

## 11. FR-03: Audio analysis engine

**Priority:** P0 · **Objective:** Produce trustworthy and reproducible acoustic measurements from decoded audio signals.

### Required analysis features

| Feature | Unit | Purpose |
|---|---|---|
| Duration | Seconds | Track length |
| Sample rate | Hz | Technical recording information |
| Channel count | Count | Signal configuration |
| RMS level | dBFS | Average signal amplitude |
| Sample peak | dBFS | Maximum sample amplitude |
| Crest factor | dB | Peak-to-RMS relationship |
| Integrated loudness | LUFS | Perceptually weighted programme loudness |
| Spectral centroid | Hz | Spectral balance indicator |
| Spectral bandwidth | Hz | Frequency dispersion |
| Spectral rolloff | Hz | Cumulative spectral-energy boundary |
| Spectral flatness | Ratio | Tonal versus noise-like characteristics |
| Spectral flux | Defined normalized scale | Frame-to-frame spectral variation |
| Zero-crossing rate | Crossings per second | Time-domain signal characteristic |
| MFCC summary | Feature vector | Broad timbral representation |
| Estimated tempo | BPM | Approximate rhythmic tempo |
| Waveform envelope | Time-indexed extrema | Signal visualization |
| Spectrogram | Time-frequency representation | Spectral visualization |

Tempo must remain explicitly labeled as an estimate. Where beat structure is ambiguous or confidence is insufficient, the application must report that a reliable estimate is unavailable.

LUFS measurements must be implemented and validated against ITU-R BS.1770 methodology rather than labeling ordinary RMS calculations as loudness. The EBU R128 framework also references BS.1770 for programme loudness measurement.

### Deferred analysis features

True-peak oversampling, musical key estimation, chord recognition, source separation, instrument recognition, vocal detection, mood classification and structural segmentation are deferred until suitable implementations have been validated.

### Initial DSP configuration

| Parameter | Proposed baseline |
|---|---|
| Spectral analysis sample rate | 22,050 Hz |
| FFT window size | 2,048 samples |
| Hop size | 512 samples |
| Window function | Hann |
| Spectral rolloff threshold | 85% of spectral energy |
| MFCC count | 13 coefficients, with exact definition versioned |
| Feature aggregation | Mean and standard deviation where applicable |
| Processing model | Streaming, bounded memory |
| Numeric representation | Floating-point PCM |
| Configuration persistence | Required per analysis run |

These are implementation starting parameters, not empirically optimized settings.

Loudness measurement must operate on appropriate channel-aware signals with standard-compliant processing. Downmixed, resampled spectral-analysis input must not be indiscriminately reused for all measurements.

### Analysis result contract

Every computed feature must include the following information:

```ts
type FeatureStatus = "valid" | "unavailable" | "failed";

interface AudioFeature {
  key: string;
  value: number | number[] | null;
  unit: string | null;
  status: FeatureStatus;
  algorithmVersion: string;
  confidence?: number;
  diagnosticCode?: string;
}
```

Invalid measurements must not be replaced with fabricated zeros.

**Acceptance criteria**

| Fixture | Expected behavior |
|---|---|
| 440 Hz sine wave | Dominant spectral peak within expected FFT resolution |
| Silence | Explicit silence-aware results, no uncontrolled NaN or infinity |
| Known-amplitude signal | Correct RMS and sample-peak measurements |
| Impulse | Correct localization in waveform and time-frequency representation |
| White noise | Broad spectral distribution |
| Controlled click track | Tempo estimate within defined tolerance or explicit unavailable state |
| Corrupt audio file | Structured failure without application termination |
| Repeated analysis | Equivalent results within documented numeric tolerances |

## 12. FR-04: Background analysis runtime

**Priority:** P0 · **Objective:** Allow large collections to be analyzed reliably without compromising the application's responsiveness.

| ID | Requirement |
|---|---|
| JOB-001 | Persist queued analysis jobs across restarts. |
| JOB-002 | Execute jobs with bounded worker concurrency. |
| JOB-003 | Allow users to pause, resume and cancel processing. |
| JOB-004 | Show completed, pending, failed and active job counts. |
| JOB-005 | Allow retry of eligible failed jobs. |
| JOB-006 | Prioritize a track explicitly selected for analysis. |
| JOB-007 | Recover interrupted work after unexpected termination. |
| JOB-008 | Invalidate cached analysis when source content or relevant engine configuration changes. |
| JOB-009 | Prevent duplicate jobs for equivalent analysis inputs. |
| JOB-010 | Preserve successfully computed features when an independent analyzer fails. |
| JOB-011 | Provide configurable CPU usage preferences. |

**Job lifecycle.** An interrupted track may be restarted from its beginning. Resuming individual FFT processing windows is not required for the core release.

**Acceptance criteria**

- Closing the application during a multi-track analysis must not discard completed tracks. Upon reopening, eligible incomplete jobs must be recoverable.
- Cancelling a job must not leave partially committed results marked as complete.
- Opening an unanalysed track must allow the user to prioritize that track without waiting for the entire collection.

## 13. FR-05: Track Observatory

**Priority:** P0 · **Objective:** Allow users to inspect and understand the acoustic structure of individual recordings.

| ID | Requirement |
|---|---|
| OBS-001 | Display track metadata and artwork when available. |
| OBS-002 | Render a complete waveform envelope with playback-position synchronization. |
| OBS-003 | Support waveform seeking and zooming. |
| OBS-004 | Render a time-frequency spectrogram with labeled axes and color scale. |
| OBS-005 | Display validated acoustic measurements with units. |
| OBS-006 | Provide concise explanations of individual measurements. |
| OBS-007 | Distinguish unavailable measurements from valid measurements. |
| OBS-008 | Display analysis-engine version and analysis timestamp. |
| OBS-009 | Show acoustically similar tracks when sufficient library analysis exists. |
| OBS-010 | Allow navigation to the corresponding Atlas point. |
| OBS-011 | Allow comparison with another analyzed track. |
| OBS-012 | Export analysis results in JSON. |

**Waveform behavior.** The waveform must represent actual decoded samples through time-indexed minimum and maximum envelopes. It must not be procedurally fabricated from a track identifier, artwork or arbitrary visual seed. Seeking from the waveform must update the playback position, and playback progress must update the waveform cursor.

**Spectrogram behavior.** The spectrogram must provide a documented frequency range, visible time axis, consistent intensity mapping and a legend. Artifact resolution must be bounded. High-resolution inspection can load additional cached or on-demand tiles rather than placing unrestricted full-resolution arrays in frontend memory.

**Acceptance criteria**

- A valid analyzed track can display its metadata, waveform, spectrogram and feature measurements without requiring a network connection.
- An unavailable tempo estimate must not prevent the rest of the Observatory from functioning.
- Selecting a measurement's explanation must reveal its meaning, unit and significant limitations.

## 14. FR-06: Sonic Atlas

**Priority:** P0 · **Objective:** Transform the analyzed collection into an interactive acoustic landscape that supports meaningful discovery. **This is the defining feature of SonicMirror.**

| ID | Requirement |
|---|---|
| ATL-001 | Generate a two-dimensional projection from analyzed feature vectors. |
| ATL-002 | Support zooming, panning and resetting the viewport. |
| ATL-003 | Allow track selection and inspection. |
| ATL-004 | Provide a linked track-details panel. |
| ATL-005 | Support metadata and acoustic feature filtering. |
| ATL-006 | Support color mappings for available numerical descriptors. |
| ATL-007 | Allow rectangular or equivalent multi-track selection. |
| ATL-008 | Save selected tracks as a logical collection. |
| ATL-009 | Retrieve acoustic neighbors using original-space feature distances. |
| ATL-010 | Persist map coordinates and associated feature-schema versions. |
| ATL-011 | Communicate when the current projection excludes unanalysed tracks. |
| ATL-012 | Provide a non-visual alternative for accessing map selections and neighbors. |
| ATL-013 | Allow explicit regeneration of the Atlas following library changes. |
| ATL-014 | Explain the limitations of dimensionality reduction. |

### Algorithm selection for the initial release

Avoid committing to advanced clustering simply because it sounds impressive.

| Component | Initial implementation |
|---|---|
| Feature vector | Validated spectral and temporal summaries |
| Normalization | Robust centering and scaling using library statistics |
| Similarity metric | Weighted Euclidean distance |
| Neighbor retrieval | Exact search |
| Dimensionality reduction | Principal Component Analysis (PCA) |
| Clustering | Optional post-validation enhancement |
| Rendering | Canvas 2D |
| Coordinate storage | Versioned projection snapshots |

PCA provides a reproducible and relatively inexpensive baseline. UMAP and HDBSCAN may be evaluated later if they deliver demonstrably better exploration outcomes. The core release does not require named acoustic clusters; color-coded features and meaningful nearest-neighbor retrieval are sufficient.

### Feature vector policy

| Group | Candidate descriptors |
|---|---|
| Timbre | MFCC summaries |
| Spectral balance | Centroid, bandwidth and rolloff |
| Spectral texture | Flatness and flux |
| Dynamics | Crest factor and RMS variation |
| Rhythm | Validated rhythmic descriptors, when consistently available |

- Artist names, genres, popularity, release year and album metadata must not be incorporated into the default acoustic similarity score.
- Feature groups must have documented weights so that a group containing many coefficients does not accidentally dominate the distance calculation.
- For P0, tracks lacking mandatory vector components are excluded from that projection with a visible explanation. Optional tempo estimates must not be treated as zero.

### Atlas stability policy

A projection represents a particular collection snapshot. Newly analyzed tracks must not cause the entire map to continuously rearrange while a user explores it. The application should indicate that new data is available and allow the user to refresh the projection.

The initial projection requires at least three eligible tracks and sufficient feature variance. Degenerate or nearly identical collections must produce an explanatory empty state or reduced-dimensional representation.

**Acceptance criteria**

- Identical normalized feature vectors have zero feature distance.
- Nearest-neighbor ordering matches a reference implementation.
- A saved projection reopens with the same coordinates.
- Filtering changes the visible subset without unexpectedly regenerating coordinates.
- Ineligible tracks remain visible in the Library with an explanation.
- The interface explicitly distinguishes map proximity from original-space distance.

## 15. FR-07: Track comparison

**Priority:** P0 · **Objective:** Enable direct, understandable comparisons between two analyzed recordings.

| ID | Requirement |
|---|---|
| CMP-001 | Select two analyzed tracks for comparison. |
| CMP-002 | Display matching acoustic measurements side by side. |
| CMP-003 | Display absolute differences with appropriate units. |
| CMP-004 | Distinguish raw measurements from normalized comparisons. |
| CMP-005 | Allow users to preview either track. |
| CMP-006 | Identify which validated feature groups contribute most to acoustic distance. |
| CMP-007 | Exclude missing values rather than treating them as zero. |

The application may describe a track as having a higher measured spectral centroid. It must not claim that the track is objectively better, happier or more emotionally complex.

## 16. FR-08: Integrated local playback

**Priority:** P0. Playback supports exploration rather than serving as a standalone music-player product.

| ID | Requirement |
|---|---|
| PLB-001 | Play supported local recordings. |
| PLB-002 | Pause, resume and stop playback. |
| PLB-003 | Seek to a supported playback position. |
| PLB-004 | Adjust playback volume. |
| PLB-005 | Navigate to previous and next tracks in the active queue. |
| PLB-006 | Maintain playback while switching application views. |
| PLB-007 | Display playback progress and current track identity. |
| PLB-008 | Handle unavailable files and audio-device failures gracefully. |
| PLB-009 | Isolate playback from background analysis workloads. |

Crossfade, equalization, gapless playback, streaming, synchronized lyrics and output-device customization are not required for P0.

**Acceptance criteria**

- Starting a background analysis must not unnecessarily interrupt playback.
- Navigation between Library, Atlas and Observatory must preserve the active playback session.
- The waveform cursor and global playback strip must reflect the same playback state.

## 17. FR-09: Settings and data management

**Priority:** P0

| ID | Requirement |
|---|---|
| SET-001 | Manage imported library sources. |
| SET-002 | Configure analysis concurrency within supported bounds. |
| SET-003 | Display application, catalog-schema and analysis-engine versions. |
| SET-004 | Display application-managed storage usage. |
| SET-005 | Clear regenerable visualization artifacts. |
| SET-006 | Trigger reanalysis of stale or selected tracks. |
| SET-007 | Select light, dark or system-following appearance. |
| SET-008 | Support reduced-motion preferences. |
| SET-009 | Delete catalog data without deleting source audio. |
| SET-010 | Display privacy and data-handling explanations. |
| SET-011 | Export catalog metadata and analysis measurements. |

### Export policy

| Export | Core release |
|---|---|
| Track analysis JSON | Required |
| Selected collection CSV | Required |
| Atlas coordinates CSV | Required |
| Generative artwork PNG/SVG | Deferred to Studio |
| Original audio redistribution | Not provided |

Exports must include relevant schema versions, measurement units and applicable analysis settings.

---

# Part III — Design specification

> The detailed visual specification lives in `docs/design/` (Product Design Specification). This section fixes the creative direction it must follow.

## 18. Creative direction

**Design concept: an editorial observatory for sound.** SonicMirror combines the intimacy of a personal record collection, the precision of a scientific instrument and the expressiveness of contemporary generative art.

Creative vocabulary: **editorial modernism** (architectural layouts, typography-led composition, restrained color), **scientific abstraction** (precision, mathematical patterns, meaningful data representation), **procedural expression** (geometry that reflects underlying numerical structures) and **instrument design** (physical clarity, functional controls, purposeful restraint).

### Design hierarchy

| Layer | Design language |
|---|---|
| Application shell | Editorial modernism |
| Navigation and controls | Minimal industrial design |
| Measurements | Scientific visualization |
| Sonic Atlas | Cartographic and generative |
| Future Studio | Expressive computational artwork |
| Brand and documentation | Contemporary cultural publication |

Generative design should emerge from audio data wherever possible. **A decorative visualization must never masquerade as an analytical result.**

Explicitly avoided: the generic AI-generated SaaS aesthetic — purple gradients, glassmorphism cards, generic dashboards, neon borders, decorative blobs.

## 19. Brand system

**Personality:** curious, thoughtful, precise, independent, tactile and understated. SonicMirror should feel like software built by people who genuinely care about both music and engineering. Final logo geometry is not yet approved.

### Language and copy

| Prefer | Avoid |
|---|---|
| Explore your collection | Unlock your full music potential |
| Acoustic neighbors | AI-powered recommendations |
| Estimated tempo | Perfect BPM detection |
| Spectral brightness | Happiness score |
| Analyzed locally | Military-grade privacy |
| Analysis unavailable | Something went wrong!!! |

The language should be confident without making unsupported claims.

## 20. Color system

**Light theme**

| Token | Value |
|---|---|
| Paper | `#F3F0E8` |
| Canvas | `#FAF8F3` |
| Ink | `#252622` |
| Muted Ink | `#62635C` |
| Stone | `#B6B3A9` |
| Oxide | `#BF442F` |

**Dark theme**

| Token | Value |
|---|---|
| Graphite | `#171916` |
| Surface | `#212420` |
| Chalk | `#E9E6DD` |
| Muted | `#A3A59A` |
| Boundary | `#393D36` |
| Signal | `#E17B60` |

**Data visualization.** Sequential measurements must use appropriate sequential scales. Diverging palettes require a meaningful midpoint. Categories must not rely solely on color. Color must communicate something: if a map uses red and blue, the user must know what they represent.

The palette values are design seeds. Final combinations must pass contrast testing in their intended usage contexts.

## 21. Typography

| Typeface | Role |
|---|---|
| Instrument Serif | Editorial display headings |
| Geist | Interface and body text |
| IBM Plex Mono | Measurements and technical labels |

| Token | Size | Usage |
|---|---|---|
| Display XL | 48–64 px | Hero and editorial moments |
| Display L | 36–44 px | Primary page title |
| Heading | 22–28 px | Major sections |
| Subheading | 17–20 px | Content groups |
| Body | 14–15 px | Main interface text |
| Label | 12–13 px | Controls and secondary information |
| Data | 12–16 px | Measurements |
| Annotation | 11–12 px | Supplementary metadata |

Fonts must be bundled locally with applicable license notices. No runtime font CDN.

## 22. Layout and component system

The application uses a persistent navigation shell, a flexible primary workspace and a persistent playback strip.

| Property | Specification |
|---|---|
| Base spacing unit | 4 px |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64 px |
| Sidebar width | ≈ 216 px |
| Detail inspector | ≈ 300–340 px |
| Playback strip | ≈ 64 px |
| Standard corner radius | 4–6 px |
| Panel borders | 1 px |
| Shadows | Minimal, reserved for floating surfaces |
| Reference design viewport | 1440 × 900 |
| Minimum supported viewport | 1024 × 640 logical pixels |

```
┌──────────────────────────────────────────────────────────────┐
│ TITLE BAR / GLOBAL COMMANDS                                  │
├────────────┬───────────────────────────────────┬─────────────┤
│ NAVIGATION │ PRIMARY WORKSPACE                 │ INSPECTOR   │
│ Overview   │                                   │ Track       │
│ Library    │                                   │ details     │
│ Atlas      │                                   │             │
│ Settings   │                                   │             │
├────────────┴───────────────────────────────────┴─────────────┤
│ PERSISTENT PLAYBACK                                          │
└──────────────────────────────────────────────────────────────┘
```

**Foundational components:** buttons, icon buttons, tooltips, search fields, tabs, segmented controls, data tables, filter controls, menus, dialogs, progress indicators, notifications, empty states, error states, artwork placeholders, measurement displays, chart legends and playback controls.

**Bespoke product components:** waveform viewer, spectrogram viewer, Atlas canvas, track inspector, comparison panel and analysis-progress drawer.

## 23. Motion specification

Motion should feel intentional and restrained.

| Interaction | Duration target |
|---|---|
| Hover feedback | 100–150 ms |
| Control state transition | 150–200 ms |
| Inspector expansion | 180–250 ms |
| Page transition | 180–250 ms |
| Atlas focus animation | 250–400 ms |
| Initial projection reveal | Optional, up to 600 ms |

Continuous decorative animation is prohibited in analytical workspaces. Reduced-motion mode must eliminate nonessential transitions and animated map navigation while preserving functional state changes.

## 24. Information architecture

Only implemented experiences appear in primary navigation. Unreleased modules must not occupy the application as disabled placeholders.

| Screen | Core responsibility |
|---|---|
| Welcome | Import or explore demonstration collection |
| Overview | Explain library state and provide entry into exploration |
| Library / Tracks | Searchable track catalog |
| Library / Albums | Browse grouped albums |
| Library / Artists | Browse artist groupings |
| Library / Collections | Manage saved selections |
| Observatory | Inspect individual recordings |
| Atlas | Explore acoustic relationships |
| Comparison | Compare two recordings |
| Analysis drawer | Monitor and manage jobs |
| Settings | Configure the application and local data |
| About | Versions, acknowledgments and methodology references |

**Required screen states.** Each applicable screen must support loading, empty, partial-data, success, error and recovery states. For example, the Atlas must behave differently for an empty library, an unanalysed library, a partially analyzed library, a valid projection and a stale projection. A polished success state alone is not sufficient to complete the interface.

---

# Part IV — Technical architecture

## 25. Technology decisions

| Layer | Selected technology | Rationale |
|---|---|---|
| Desktop shell | Tauri 2 | Native capabilities and Rust integration |
| Core language | Rust | Performance, explicit resource control and memory safety |
| Frontend | React + TypeScript | Typed interactive UI ecosystem |
| Bundler | Vite | Lightweight frontend build workflow |
| Package management | pnpm + Cargo | Reproducible dependency management |
| UI primitives | Radix UI | Accessible interaction primitives |
| Styling | Tailwind CSS + CSS variables | Design-system implementation |
| Data queries | TanStack Query | Native IPC-backed asynchronous state |
| Local UI state | Zustand | Viewport, selection and interface state |
| Audio decoding | Symphonia | Rust-native media decoding |
| Metadata | Lofty | Tag and artwork extraction |
| FFT | RustFFT | Efficient spectral processing |
| Resampling | Rubato | Dedicated signal resampling |
| Loudness | Validated BS.1770 implementation | Standards-aligned measurement |
| Playback | Rodio / CPAL | Native local playback |
| Database | SQLite + rusqlite | Embedded transactional persistence |
| CPU parallelism | Rayon | Bounded parallel analysis |
| Async coordination | Tokio | Application orchestration |
| Linear algebra | nalgebra or equivalent | PCA and feature-space operations |
| Charts | D3 utilities + custom rendering | Scales, axes and interactions |
| Atlas rendering | Canvas 2D | Sufficient baseline for targeted library sizes |
| Artwork and vector graphics | SVG + Canvas | Reproducible graphical output |
| Animation | Motion + CSS | Controlled interface transitions |
| IPC contracts | Generated Rust-to-TypeScript bindings | Reduce cross-layer schema drift |
| Logging | tracing | Structured local diagnostics |
| Rust validation | Clippy, cargo test, proptest | Static and behavioral validation |
| Performance benchmarks | Criterion | Reproducible measurements |
| Frontend tests | Vitest + Testing Library | Component and integration validation |
| UI automation | Playwright | Frontend interaction flows |
| CI and releases | GitHub Actions | Automated cross-platform quality gates |

Exact dependency versions are selected during repository initialization, committed through lockfiles and updated through reviewed dependency changes. The selected audio libraries, playback integration and generated IPC bindings require a compatibility spike before their corresponding architecture decisions become irreversible.

**Architectural constraints.** No separate HTTP backend, no mandatory Python runtime, no microservices, no external database server and no mandatory API keys. The Rust engine should be accessible independently of Tauri, but initially ships as part of one desktop application.

## 26. System architecture

```
┌───────────────────────── React desktop interface ─────────────────────────┐
│  features (library, observatory, atlas, comparison, playback, settings)   │
│  TanStack Query ◄── typed IPC adapters ──► Zustand (view/selection state) │
└──────────────────────────────────┬────────────────────────────────────────┘
                     Typed Tauri commands │ ▲ throttled domain events
┌──────────────────────────────────▼────────────────────────────────────────┐
│ Desktop adapter (src-tauri): commands, events, capabilities, lifecycle    │
├───────────────────────────────────────────────────────────────────────────┤
│ sonic-runtime: application services · persistent job scheduler · playback │
├──────────────────────────────┬────────────────────────────────────────────┤
│ sonic-core                   │ sonic-catalog                              │
│ domain · media · dsp ·       │ SQLite repositories · migrations ·         │
│ similarity                   │ artifact cache                             │
└──────────────────────────────┴────────────────────────────────────────────┘
      Original audio files (read-only)       SQLite catalog + artifact cache
```

### Dependency rules

- The domain and computational core must not depend on React, Tauri or platform-specific UI code.
- The application layer coordinates analysis, persistence and playback through explicit interfaces.
- The desktop adapter handles native IPC, permissions, platform configuration and application lifecycle.
- The frontend receives application-level data transfer objects rather than issuing arbitrary SQL queries or accessing unrestricted filesystem paths.

## 27. Repository structure

Start with a small number of well-defined crates. Expand the workspace only when independent boundaries justify it.

```
sonicmirror/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── app/  routes/  components/  design-system/
│       │   ├── features/{onboarding,library,observatory,atlas,comparison,playback,settings}/
│       │   ├── visualizations/  ipc/  stores/
│       ├── src-tauri/
│       │   ├── src/{commands,events,platform}/
│       │   ├── capabilities/  Cargo.toml  tauri.conf.json
│       └── package.json
├── crates/
│   ├── sonic-core/      (domain, media, dsp, similarity)
│   ├── sonic-catalog/   (repositories, migrations, artifacts)
│   └── sonic-runtime/   (services, jobs, playback)
├── assets/{brand,fonts,demo}/
├── benchmarks/  experiments/
├── tests/{fixtures,integration,e2e}/
├── docs/{product,architecture,adr,design,methodology,security}/
├── .github/{workflows,ISSUE_TEMPLATE}/
├── Cargo.toml  Cargo.lock  rust-toolchain.toml
├── pnpm-workspace.yaml  pnpm-lock.yaml
└── README.md  CONTRIBUTING.md  SECURITY.md  CHANGELOG.md  LICENSE
```

Starting with three core crates avoids premature abstraction across seven or eight packages while preserving clear boundaries.

## 28. Data model

Conceptual domain model (not final SQL):

| Entity | Responsibility |
|---|---|
| `library_sources` | Imported directories and source configuration |
| `tracks` | Catalog entry per physical audio file (P0) |
| `analysis_runs` | Engine versions, job status and configuration |
| `audio_features` | Computed feature values and validity information |
| `analysis_artifacts` | Waveforms, spectrogram tiles and derived resources |
| `analysis_jobs` | Persistent work queue |
| `collections` / `collection_tracks` | User-defined track groups |
| `projection_snapshots` / `projection_points` | Atlas coordinates per snapshot |
| `settings` | User configuration |

For the initial release, each imported audio file acts as a catalog track entry. A more elaborate canonical-recording identity system is deferred.

### Persistence rules

- Use transactional writes for catalog changes and analysis completion.
- Enable foreign-key enforcement.
- Maintain ordered, versioned schema migrations.
- Use parameterized SQL statements.
- Index searchable metadata and commonly queried identifiers.
- Store large waveform and spectrogram artifacts outside SQLite.
- Make regenerable cache artifacts distinguishable from user-created data.
- Never persist decoded full-track PCM unnecessarily.

### Analysis cache identity

A cached analysis result is valid only when the content digest, relevant engine version, feature-schema version and normalized analysis configuration match:

```
K = H( D_audio ‖ V_engine ‖ V_schema ‖ C )
```

where `H` is a deterministic hash function, `D_audio` identifies the source content and `C` is the canonical analysis configuration. Field encoding must be unambiguous and versioned. **BLAKE3** is the proposed content-hashing implementation.

File size and modification time may be used as fast rescan hints, but they must not be treated as definitive content identity when reliable invalidation requires verification.

## 29. IPC contract

Tauri commands expose narrow application operations rather than generic native capabilities.

### Core commands

| Command | Responsibility |
|---|---|
| `library_add_source` | Register an authorized local directory |
| `library_import_files` | Import selected local files |
| `library_list_tracks` | Paginated and filtered catalog retrieval |
| `library_get_track` | Retrieve a track DTO |
| `library_rescan_source` | Schedule source reconciliation |
| `library_remove_source` | Remove source associations |
| `analysis_enqueue` | Request track analysis |
| `analysis_get_features` | Retrieve validated measurements |
| `analysis_get_waveform` | Retrieve bounded waveform data |
| `analysis_get_spectrogram` | Retrieve bounded visualization artifacts |
| `jobs_get_status` | Retrieve analysis-job state |
| `jobs_pause` | Pause processing |
| `jobs_resume` | Resume processing |
| `jobs_cancel` | Cancel requested work |
| `atlas_generate` | Generate a projection snapshot |
| `atlas_get_snapshot` | Retrieve saved projection data |
| `atlas_get_neighbors` | Retrieve original-space neighbors |
| `collections_create` | Create logical collections |
| `playback_load` | Load an authorized track |
| `playback_control` | Apply playback commands |
| `export_analysis` | Export analysis data through a scoped destination |
| `settings_get` | Retrieve user configuration |
| `settings_update` | Validate and persist configuration changes |

### Domain events

| Event | Payload purpose |
|---|---|
| `library.scan.progress` | Scan totals and current state |
| `library.scan.completed` | Scan completion summary |
| `analysis.job.updated` | Individual job state change |
| `analysis.batch.progress` | Aggregate progress |
| `analysis.track.completed` | New available analysis |
| `atlas.snapshot.ready` | New projection metadata |
| `playback.state.changed` | Track and playback state |
| `playback.position.updated` | Throttled playback progress |
| `application.error` | Structured recoverable error |

Events must be throttled where necessary to prevent native IPC from becoming a frontend rendering bottleneck.

### Error contract

```ts
interface ApplicationError {
  code: string;
  message: string;
  recoverable: boolean;
  correlationId?: string;
  details?: Record<string, unknown>;
}
```

Technical diagnostics must not expose unrestricted filesystem paths, personal library metadata or other sensitive details outside their intended local context.

## 30. Audio processing pipeline

```
file → probe/demux (Symphonia) → streaming decode (f32 PCM, channel-aware)
     ├─► level metrics + BS.1770 loudness (native rate, all channels)
     └─► downmix → resample to 22,050 Hz (Rubato) → frame (2048 / hop 512, Hann)
             → FFT (RustFFT) → spectral features, MFCC, onset/tempo
             → waveform envelope + spectrogram artifacts
     → per-feature aggregation (mean / std) → AudioFeature records → catalog
```

**Engineering constraints**

- Audio decoding must be streaming-based. An arbitrary-length recording cannot require loading its entire decoded contents into memory.
- Cancellation checks must exist at suitable processing boundaries.
- Downmixing policies must be documented and account for channel interactions. Unsupported channel configurations must produce explicit limitations rather than silently incorrect results.
- Feature computation should be separable so an analyzer-specific failure can produce a partial result.

## 31. Similarity pipeline

The initial acoustic similarity engine uses an interpretable mathematical baseline.

**Robust normalization** of feature `x_j` using the collection median and interquartile range:

```
z_j = (x_j − median(x_j)) / IQR(x_j)
```

Features with insufficient variance must be excluded or handled using a documented fallback.

**Weighted Euclidean distance:**

```
d(a, b) = sqrt( Σ_{j=1..m} w_j · (z_{a,j} − z_{b,j})² )
```

where `z_{a,j}` and `z_{b,j}` are normalized feature values, `w_j` is the documented feature weight and `m` is the number of active feature dimensions. Feature-group weighting is normalized independently of the number of coefficients in each group.

The application must not convert distance into an arbitrary percentage labeled as scientific similarity.

**Algorithm evaluation.** Before freezing the feature schema, compare the baseline against curated examples containing known acoustic similarities, contrasting recordings and unrelated controls. Evaluate whether results are interpretable, reasonably stable and useful to target users. More complex algorithms are introduced only when they outperform this baseline against documented evaluation criteria.

---

# Part V — Non-functional requirements

## 32. Performance budgets

The following are engineering acceptance targets, **not benchmark results**.

**Reference test environment (proposed):** x86-64 CPU with six physical cores, 16 GB RAM, SSD storage, integrated or entry-level graphics, a 10,000-track representative local library with mixed MP3, FLAC and other supported formats. Exact hardware, OS version, codec distribution, track lengths and test conditions must be recorded alongside results.

| ID | Measurement | Target |
|---|---|---|
| PERF-001 | Warm startup | P95 ≤ 2 s |
| PERF-002 | Cold startup | P95 ≤ 4 s |
| PERF-003 | Library search | P95 ≤ 100 ms |
| PERF-004 | Metadata page retrieval | P95 ≤ 100 ms |
| PERF-005 | Observatory opening from cache | P95 ≤ 500 ms |
| PERF-006 | Atlas rendering | Target 60 FPS, minimum sustained 30 FPS |
| PERF-007 | Exact neighbor retrieval | P95 ≤ 150 ms for 10,000 vectors |
| PERF-008 | Idle application memory | ≤ 250 MiB private memory across associated processes |
| PERF-009 | Default analysis throughput | ≥ 5× real-time per worker |
| PERF-010 | Cancellation acknowledgment | ≤ 1 s under normal conditions |
| PERF-011 | Catalog capacity | ≥ 10,000 indexed tracks |
| PERF-012 | New Atlas projection | ≤ 10 s for 10,000 eligible tracks (baseline algorithm) |

The application must not claim performance compliance before running the benchmarks. Targets that prove unrealistic must be revised through a documented trade-off decision, not silently removed.

**Why incremental analysis matters.** 3,300 tracks × 4 min average at 5× real-time per worker with 4 workers ≈ 11 hours of idealized processing — before I/O, contention, codec complexity and thermal limits. Asynchronous, incremental processing is therefore a P0 product requirement, not an optional optimization.

## 33. Reliability and integrity

| ID | Requirement |
|---|---|
| REL-001 | Original audio files remain unmodified. |
| REL-002 | Database transactions prevent partial successful commits. |
| REL-003 | Interrupted jobs are recoverable. |
| REL-004 | Corrupt media does not terminate unrelated analysis work. |
| REL-005 | Cache corruption can be recovered through regeneration. |
| REL-006 | Unsupported measurements produce explicit status values. |
| REL-007 | Database migrations are covered by automated tests. |
| REL-008 | Equivalent analysis requests are idempotent. |
| REL-009 | Disk exhaustion produces a recoverable error. |
| REL-010 | Unavailable source directories do not destroy catalog metadata. |

## 34. Security and privacy

The initial release is a single-user, local-first application. It does not require a login system.

### Threat model

| Threat | Required mitigation |
|---|---|
| Malformed media | Safe decoding, fuzz testing and bounded processing |
| Excessive metadata/artwork | Validated dimensions and size limits |
| Symlink traversal | Explicit directory traversal policy and canonicalization |
| Arbitrary filesystem access | Native capability restrictions and authorized sources |
| IPC abuse | Narrow typed commands and argument validation |
| Metadata-based script injection | Safe text rendering, no unsanitized HTML |
| Dependency vulnerabilities | Automated audits and reviewed upgrades |
| Resource exhaustion | Bounded memory, concurrency and cache policies |
| Accidental data deletion | Read-only source handling and explicit data-reset semantics |
| Personal data leakage | No automatic telemetry or external media uploads |

### Mandatory privacy guarantees

- SonicMirror must not require external requests for core functionality.
- The application must not automatically upload recordings, filenames, filesystem paths, artwork, acoustic measurements or listening behavior.
- Users must be able to remove application-managed data independently from their music files.
- External integrations, if added later, require separate consent, explicit data-flow documentation and a security review.

## 35. Accessibility

Accessibility is a product requirement, not a post-release enhancement. The interface targets WCAG 2.2 AA criteria where applicable to the desktop webview experience.

| Requirement | Expected behavior |
|---|---|
| Keyboard navigation | All core actions accessible without a mouse |
| Focus visibility | Clearly visible keyboard focus indicators |
| Contrast | Accessible text and interactive-control contrast |
| Reduced motion | Nonessential motion can be disabled |
| Chart alternatives | Tabular or descriptive alternatives to visual measurements |
| Atlas alternatives | Searchable track and neighbor lists |
| Screen readers | Accessible names and meaningful semantic structure |
| Color independence | Labels, shape or position supplement color |
| Text scaling | No critical information loss at supported scaling levels |
| Error communication | Errors use meaningful text, not color alone |

---

# Part VI — Validation and engineering quality

## 36. Testing strategy

| Test suite | Scope |
|---|---|
| Rust unit tests | Domain logic, DSP, feature aggregation |
| Property-based tests | Numerical invariants and edge cases |
| Reference tests | Comparison against validated implementations |
| Integration tests | SQLite, media decoding, jobs, cache |
| Fuzz tests | Media parsing and externally supplied data |
| Frontend unit tests | Formatting, state and view logic |
| Component tests | Controls, interaction and accessibility |
| Browser E2E tests | UI flows using controlled IPC adapters |
| Native smoke tests | Actual packaged application behavior |
| Visual regression tests | Core screens and themes |
| Performance tests | Processing, search, visualization |
| Usability tests | Discovery and comprehension |

Playwright tests alone do not validate the native runtime; separate packaged-application tests are required.

**Reference fixtures.** The test corpus must include generated sine waves, silence, impulses, chirps, white noise, pink noise, known-amplitude signals, clipped signals, stereo test signals, controlled click tracks, variable-duration recordings, malformed files and appropriately licensed real music. Fixtures must include provenance, expected outputs and relevant numerical tolerances.

**Coverage policy.** An initial 80% line-coverage target for owned core and application-domain code is reasonable, but it must not substitute for behavioral correctness. Critical invariants, error paths, persistence recovery and numerical algorithms require explicit tests regardless of the overall coverage percentage.

## 37. Continuous integration

Every pull request must pass applicable quality gates before merging.

| Ecosystem | Gate |
|---|---|
| Rust | `cargo fmt --check` |
| Rust | Clippy with enforced warning policy |
| Rust | Workspace unit and integration tests |
| Rust | Dependency security audit |
| TypeScript | Strict type checking |
| Frontend | ESLint and formatting checks |
| Frontend | Vitest test suite |
| Frontend | Production build |
| Application | IPC schema compatibility |
| Security | Secret scanning and dependency review |
| Release | Package verification and smoke tests |

The main branch should be protected where repository settings permit. Releases must originate from versioned, reproducible source revisions.

## 38. Platform support and distribution

Cross-platform is the architectural goal. Actual platform support must be earned through testing.

| Platform | Release strategy |
|---|---|
| Windows 11, x86-64 | Primary development and validation target |
| macOS, Apple Silicon | Secondary native target |
| Linux, x86-64 | Secondary native target |
| Windows ARM64 | Future evaluation |
| macOS Intel | Future evaluation |
| Mobile | Out of scope |
| Web browser | Out of scope |

| Platform | Intended artifact |
|---|---|
| Windows | Installer package |
| macOS | Application bundle / DMG |
| Linux | AppImage, with additional packaging evaluated |
| Source | GitHub repository and versioned source archive |

Code signing, macOS notarization and installer trust requirements must be addressed before making unrestricted claims about production-ready distribution. Unsigned development builds must be labeled accordingly. The project must not instruct users to permanently disable operating-system security protections.

---

# Part VII — Delivery roadmap

## 39. Implementation phases

| Phase | Name | Scope | Exit criteria |
|---|---|---|---|
| 00 | Foundation | Repository, design system, architecture spikes, CI, synthetic fixtures, minimal Tauri app | Working dev environment, reviewed core design, documented technical feasibility |
| 01 | Audio vertical slice | Import, decode, analyze and display one recording | One supported recording can be imported, analyzed, stored and visualized with validated numerical output |
| 02 | Library and runtime | Directory traversal, catalog, metadata indexing, search, hashing, scheduling, caching, job recovery | A 10,000-track test collection can be indexed, queried and processed incrementally without unacceptable interface blocking |
| 03 | Complete Observatory | Waveform interaction, spectrogram, feature explanations, diagnostics, integrated playback | Users can inspect and listen to analyzed recordings while understanding the primary measurements |
| 04 | Sonic Atlas | Feature vectors, exact similarity, PCA, map rendering, filters, inspection, comparison, collections | Users can explore acoustic relationships, identify neighbors and save discoveries |
| 05 | Product hardening | Demo onboarding, complete interface states, accessibility, privacy controls, recovery tests, benchmarks, packaging | All mandatory release gates satisfied or explicitly revised |
| 06 | Core release | Publish product, documentation, demonstrations, benchmark results and release artifacts | A new user can independently install SonicMirror and complete its primary workflow |

No calendar-based estimates are assigned yet. Delivery dates should be based on completed technical spikes and measured implementation capacity.

## 40. Implementation backlog

| Epic | Work items | Dependencies | Priority |
|---|---|---|---|
| E00: Foundation | Workspace, CI, licensing, ADRs | — | P0 |
| E01: Design system | Tokens, typography, components, prototypes | E00 | P0 |
| E02: Media engine | Decoder, metadata, artwork, hashing | E00 | P0 |
| E03: DSP engine | FFT, level metrics, features, validation | E02 | P0 |
| E04: Persistence | SQLite, migrations, repositories, cache | E00 | P0 |
| E05: IPC contracts | DTO generation, command validation, errors | E00 | P0 |
| E06: Vertical slice | Single-track workflow | E01–E05 | P0 |
| E07: Library | Sources, indexing, search, collections | E02, E04, E05 | P0 |
| E08: Jobs | Queue, cancellation, recovery, progress | E03, E04 | P0 |
| E09: Playback | Native audio, seeking, state events | E02, E05 | P0 |
| E10: Observatory | Waveform, spectrogram, measurements | E01, E03, E09 | P0 |
| E11: Similarity | Feature schema, weights, exact retrieval | E03 | P0 |
| E12: Atlas | PCA, canvas, filters, map persistence | E07, E11 | P0 |
| E13: Comparisons | Comparative measurements and playback | E10, E11 | P0 |
| E14: Onboarding | Welcome flow, demonstration collection | E07, E10, E12 | P0 |
| E15: Data management | Settings, exports, privacy, reset | E04, E05, E08 | P0 |
| E16: Hardening | Performance, accessibility, recovery | E06–E15 | P0 |
| E17: Distribution | Packaging, release docs, smoke tests | E16 | P0 |

**Critical path.** The primary technical risk sits in the media and DSP foundation. The primary product risk sits in whether the Atlas produces discoveries that users find meaningful.

---

# Part VIII — Success criteria

## 41. Product validation metrics

Since the application includes no mandatory telemetry, these measurements come from controlled usability sessions, opt-in feedback and local benchmark reports.

| Metric | Proposed validation target |
|---|---|
| First meaningful interaction | Within 2 minutes using demo collection |
| Independent library import | At least 8 of 10 test users |
| Successful Atlas exploration | At least 8 of 10 test users |
| Successful track comparison | At least 8 of 10 test users |
| Meaningful acoustic discovery | At least 7 of 10 test users identify an interesting relationship |
| Understanding of Atlas limitations | At least 8 of 10 understand that visual proximity is approximate |
| Source file integrity | Zero unintended modifications |
| Offline experience | All core workflows available |
| Critical crashes or data-loss defects | Zero known unresolved |

The usability targets are formative acceptance thresholds, not statistically representative claims about market demand.

**Primary product success metric — meaningful discovery rate:** the proportion of evaluated users who identify and can explain at least one interesting acoustic relationship in a music collection through SonicMirror. This is more useful than session duration, number of clicks or total imported tracks.

## 42. Engineering success metrics

| Metric | Required evidence |
|---|---|
| DSP correctness | Reference and synthetic test reports |
| Reproducibility | Versioned analysis regression tests |
| Reliability | Job interruption and recovery tests |
| Performance | Published benchmark results |
| Security | Threat model and dependency review |
| Maintainability | Documented module boundaries and passing CI |
| Accessibility | Audit results and keyboard interaction tests |
| Platform compatibility | Native package smoke-test results |

## 43. Definition of done

- [ ] Functional requirements satisfied
- [ ] Acceptance criteria implemented and tested
- [ ] Empty, loading, partial and error states handled
- [ ] Relevant unit and integration tests passing
- [ ] Rust and TypeScript quality checks passing
- [ ] Keyboard and accessibility behavior verified
- [ ] Performance impact reviewed
- [ ] Security and privacy implications reviewed
- [ ] Documentation and methodology updated
- [ ] No unresolved critical defects

A feature is not complete merely because its happy-path implementation works.

## 44. Core release acceptance gates

| Gate | Release condition |
|---|---|
| G01: Installation | Tested packages available for declared supported platforms |
| G02: Onboarding | New users can launch and explore the demo |
| G03: Library | Supported local files can be imported and searched |
| G04: Analysis | Production measurements pass numerical validation |
| G05: Recovery | Analysis resumes correctly following interruption |
| G06: Observatory | Waveforms, spectrograms and measurements work |
| G07: Playback | Local playback functions across primary views |
| G08: Atlas | Acoustic projection and original-space neighbors work |
| G09: Discovery | Users can save explored tracks into collections |
| G10: Privacy | Core workflows require no external data transfer |
| G11: Accessibility | Mandatory accessibility checks pass |
| G12: Performance | Published targets pass or approved revisions are documented |
| G13: Documentation | Installation, architecture and methodology are documented |
| G14: Security | No known unresolved critical security vulnerabilities |
| G15: Usability | Formative evaluation identifies no critical workflow blockers |

---

# Part IX — Open-source strategy

## 45. Repository identity

| Field | Value |
|---|---|
| Repository name | SonicMirror |
| Product name | SonicMirror |
| Tagline | A personal observatory for sound. |
| Primary language | Rust |
| Secondary language | TypeScript |
| License | Apache-2.0 |
| Versioning | Semantic Versioning |
| Commit convention | Conventional Commits |
| Default branch | `main` |
| Distribution | GitHub Releases |
| Issue tracking | GitHub Issues and Projects |

**Repository description:** A local-first music observatory. Explore the hidden structure of your music through audio science, interactive acoustic maps, and beautiful visualizations.

**Topics:** `rust` `tauri` `react` `audio-analysis` `digital-signal-processing` `music-information-retrieval` `data-visualization` `local-first` `desktop-app`

## 46. Documentation inventory

| Document | Purpose |
|---|---|
| `README.md` | Product introduction, demonstrations and installation |
| `CONTRIBUTING.md` | Development and contribution workflow |
| `SECURITY.md` | Vulnerability reporting |
| `CHANGELOG.md` | Release history |
| `LICENSE` | Project licensing |
| `docs/product/PRD.md` | Product requirements |
| `docs/product/ROADMAP.md` | Release scope and milestones |
| `docs/architecture/OVERVIEW.md` | System architecture |
| `docs/architecture/DATA_MODEL.md` | Persistence contracts |
| `docs/architecture/IPC.md` | Native interaction contracts |
| `docs/design/DESIGN_SYSTEM.md` | Visual and interaction guidelines |
| `docs/design/SCREEN_SPECIFICATIONS.md` | Individual screen behavior |
| `docs/methodology/AUDIO_FEATURES.md` | Feature definitions and algorithms |
| `docs/methodology/SIMILARITY.md` | Normalization, weighting and distances |
| `docs/methodology/PROJECTION.md` | Atlas methodology and limitations |
| `docs/security/THREAT_MODEL.md` | Security boundaries and mitigations |
| `docs/BENCHMARKS.md` | Performance evaluation |
| `docs/adr/` | Architecture decision records |

The README should remain product-oriented. Detailed technical material belongs in dedicated documentation.

## 47. Initial architecture decision records

| ADR | Decision |
|---|---|
| ADR-001 | Local-first native desktop architecture |
| ADR-002 | Tauri and Rust computational core |
| ADR-003 | Modular application instead of microservices |
| ADR-004 | SQLite catalog and external artifact cache |
| ADR-005 | Streaming audio decoding and processing |
| ADR-006 | Content-addressed analysis caching |
| ADR-007 | Persistent background-job execution |
| ADR-008 | Generated typed IPC contracts |
| ADR-009 | Versioned acoustic feature schema |
| ADR-010 | Exact similarity and PCA baseline |
| ADR-011 | Canvas-first Atlas renderer |
| ADR-012 | No mandatory telemetry or external APIs |
| ADR-013 | Read-only original media policy |
| ADR-014 | Demonstration collection licensing and packaging |
| ADR-015 | Deferred generative AI and provider integrations |

Each ADR records context, decision, alternatives, consequences and the conditions under which the decision should be reconsidered.

---

# Part X — Long-term product evolution

## 48. Post-core roadmap

| Generation | Theme | Scope |
|---|---|---|
| I | Observatory | Library · Observatory · Atlas · Comparison — **approved scope** |
| II | Identity | Collection signatures, archetypes and analytical portraits |
| III | Studio | Generative acoustic artwork and visual exports |
| IV | Discovery | Sonic journeys, collection bridges and advanced retrieval |
| V | Extended ecosystem | Journal, Lab, CLI, optional AI and evaluated integrations |

**Future Identity.** Describe the acoustic composition of the collection through reproducible feature aggregation and transparent archetypes. Collection characteristics must not be presented as scientifically established personality traits. Owning music is not the same as listening to it.

**Future Studio.** Generate visual artwork through deterministic mappings from waveform, spectral and other acoustic measurements: acoustic imprints, sonic terrains, collection constellations and spectral compositions. Same features + template version + parameters ⇒ same geometry.

**Future AI policy.** Generative AI is an optional presentation capability, not the analytical foundation. Any future AI functionality must operate on appropriately authorized inputs, require explicit consent for external transfers, distinguish creative interpretations from measured facts and preserve full functionality when disabled. The deterministic engine remains the source of truth.

---

# Part XI — Final decision register

## 49. Locked decisions and validation gates

| Decision | Status |
|---|---|
| Music observatory product identity | Approved |
| Editorial, scientific and generative aesthetic | Approved |
| Desktop application | Approved |
| Optional AI after the core release | Approved |
| Focused initial release | Approved |
| Local audio as initial data source | Adopted |
| Demonstration collection onboarding | Adopted |
| Rust + Tauri + React architecture | Selected, compatibility validation required |
| SQLite persistence | Selected |
| Deterministic acoustic analysis | Selected |
| PCA and exact similarity baseline | Selected, empirical validation required |
| Canvas 2D renderer | Selected, benchmark validation required |
| Three initial Rust core crates | Selected |
| Light and dark themes | Selected |
| Apache-2.0 license | Adopted |
| Windows-first validation strategy | Confirmed (Windows 11 development environment) |
| Final logo and high-fidelity screen designs | Pending |
| Performance compliance | Pending implementation and measurement |
| User adoption and discovery value | Pending usability evaluation |
| Code signing and platform release readiness | Pending |

The product decisions are sufficiently established to begin implementation. The remaining validation gates are normal engineering and design activities, not reasons to indefinitely postpone development.

Several technical decisions were deliberately simplified from PRD v0.1: exact search instead of approximate vector indexing, PCA instead of mandatory UMAP, Canvas instead of immediate WebGL, and three Rust crates instead of a highly fragmented workspace. Engineering sophistication comes from solving the actual problem well, not maximizing architectural complexity.

## 50. Companion specifications

The PRD establishes **what** is being built and **why**. It is accompanied by:

1. **Product Design Specification** — branding, design tokens, high-fidelity screens, component anatomy, interaction behavior and interface states.
2. **Software Architecture Document** — module dependencies, Rust traits, services, SQL schemas, IPC contracts, concurrency model and error semantics.
3. **Audio Analysis Technical Specification** — equations, FFT configuration, aggregation, resampling, validation fixtures, similarity weighting and numerical tolerances.
4. **Implementation Plan** — atomic engineering tasks with dependencies, acceptance criteria and verification commands.

> *Your music is a world of its own. SonicMirror lets you explore it.*
