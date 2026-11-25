// Presentation metadata for measured features: labels, groups and short,
// honest explanations (PRD OBS-006). Explanations state limitations rather
// than overclaiming what a number means.

export type FeatureGroup = "Levels" | "Spectrum" | "Rhythm" | "Technical";

export type FeatureFormat =
  | "decibels"
  | "frequency"
  | "ratio"
  | "seconds"
  | "count"
  | "bpm";

export interface FeatureInfo {
  label: string;
  group: FeatureGroup;
  format: FeatureFormat;
  explanation: string;
  /** The group's single hero value (Redesign brief §4.4). Technical has none. */
  hero?: true;
}

export const FEATURE_CATALOG: Record<string, FeatureInfo> = {
  integrated_loudness: {
    label: "Integrated loudness",
    group: "Levels",
    format: "decibels",
    hero: true,
    explanation:
      "Programme loudness over the whole recording per ITU-R BS.1770: frequency-weighted to approximate hearing, with quiet passages gated out. Streaming services normalize around −14 LUFS.",
  },
  loudness_range: {
    label: "Loudness range",
    group: "Levels",
    format: "decibels",
    explanation:
      "How much loudness varies over the recording (EBU Tech 3342): the spread between quieter and louder sections, ignoring brief extremes.",
  },
  rms_dbfs: {
    label: "RMS level",
    group: "Levels",
    format: "decibels",
    explanation:
      "Average signal power across all channels, relative to digital full scale. It is not perceived loudness: it ignores frequency weighting.",
  },
  sample_peak_dbfs: {
    label: "Sample peak",
    group: "Levels",
    format: "decibels",
    explanation:
      "The largest absolute sample value on any channel. True peaks between samples can be slightly higher.",
  },
  crest_factor_db: {
    label: "Crest factor",
    group: "Levels",
    format: "decibels",
    explanation:
      "Peak minus RMS. Higher values suggest more dynamic, transient material; heavily compressed masters tend to be lower.",
  },
  spectral_centroid_mean: {
    label: "Spectral centroid",
    group: "Spectrum",
    format: "frequency",
    hero: true,
    explanation:
      "The spectrum's centre of mass, averaged over time. Often read as brightness, but it is a measurement of energy balance, not a perception.",
  },
  spectral_centroid_std: {
    label: "Centroid variation",
    group: "Spectrum",
    format: "frequency",
    explanation: "How much the spectral centroid moves over the course of the recording.",
  },
  spectral_bandwidth_mean: {
    label: "Spectral bandwidth",
    group: "Spectrum",
    format: "frequency",
    explanation: "How widely energy spreads around the centroid.",
  },
  spectral_rolloff_mean: {
    label: "Spectral rolloff",
    group: "Spectrum",
    format: "frequency",
    explanation: "The frequency below which 85% of spectral energy lies, averaged over time.",
  },
  spectral_flatness_mean: {
    label: "Spectral flatness",
    group: "Spectrum",
    format: "ratio",
    explanation:
      "Near 0 for tonal sounds with distinct pitches, near 1 for noise-like sounds with evenly spread energy.",
  },
  spectral_flux_mean: {
    label: "Spectral flux",
    group: "Spectrum",
    format: "ratio",
    explanation:
      "How much the spectrum's shape changes from one analysis frame to the next, on a 0–1.41 scale.",
  },
  tempo_bpm: {
    label: "Tempo",
    group: "Rhythm",
    format: "bpm",
    hero: true,
    explanation:
      "The dominant pulse, estimated from how regularly note onsets recur. Music with changing or ambiguous rhythm has no single correct tempo, and half or double time can be equally valid.",
  },
  duration: {
    label: "Duration",
    group: "Technical",
    format: "seconds",
    explanation: "Length of the decoded audio.",
  },
  sample_rate: {
    label: "Sample rate",
    group: "Technical",
    format: "frequency",
    explanation: "Samples per second in the source file.",
  },
  channel_count: {
    label: "Channels",
    group: "Technical",
    format: "count",
    explanation: "Number of audio channels in the source file.",
  },
};

export const GROUP_ORDER: FeatureGroup[] = ["Levels", "Spectrum", "Rhythm", "Technical"];

/** Human-readable reasons for diagnostic codes. */
export const UNAVAILABLE_REASONS: Record<string, string> = {
  digital_silence: "The recording is digitally silent.",
  empty_signal: "No samples were decoded.",
  signal_shorter_than_frame: "The recording is too short to analyze.",
  single_frame: "Too short to measure change over time.",
  non_finite_value: "The calculation did not produce a valid number.",
  below_absolute_gate: "Too quiet to measure loudness (below −70 LUFS).",
  signal_shorter_than_block: "Too short to measure loudness (under 0.4 s).",
  signal_shorter_than_short_term_window: "Too short to measure loudness range (under 3 s).",
  insufficient_short_term_blocks: "Too little audible material to measure loudness range.",
  unsupported_channel_layout: "Loudness is not measured for this channel layout.",
  sample_rate_too_low: "The sample rate is too low for loudness measurement.",
  signal_too_short_for_tempo: "Too short to estimate tempo (under 8 s).",
  no_rhythmic_onsets: "No rhythmic onsets were detected.",
  low_confidence: "No steady pulse was found with enough confidence.",
};
