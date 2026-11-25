//! Acoustic feature vectors and robust normalization (PRD §14, §31; ADR-010).
//!
//! A track's vector is assembled from validated features in five groups.
//! Metadata (artist, genre, year) never enters it, and an unavailable feature
//! is never treated as zero: a track missing a mandatory component is excluded
//! from the space with a reason.

use crate::domain::{AudioFeature, FeatureStatus, FeatureValue};

/// Version of the vector definition (dimensions, groups and weights).
pub const VECTOR_VERSION: &str = "vector/1.0.0";

/// A feature group. Each group carries equal total weight, split evenly across
/// its dimensions, so a group with many coefficients cannot dominate.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Group {
    Timbre,
    SpectralBalance,
    SpectralTexture,
    Dynamics,
}

impl Group {
    pub const ALL: [Group; 4] = [
        Group::Timbre,
        Group::SpectralBalance,
        Group::SpectralTexture,
        Group::Dynamics,
    ];

    pub fn label(self) -> &'static str {
        match self {
            Group::Timbre => "Timbre",
            Group::SpectralBalance => "Spectral balance",
            Group::SpectralTexture => "Spectral texture",
            Group::Dynamics => "Dynamics",
        }
    }
}

/// Where one dimension's value comes from.
#[derive(Debug, Clone, Copy)]
pub struct Dimension {
    pub name: &'static str,
    pub group: Group,
    key: &'static str,
    /// Index into a vector feature, or `None` for a scalar.
    index: Option<usize>,
}

const fn scalar(name: &'static str, group: Group, key: &'static str) -> Dimension {
    Dimension {
        name,
        group,
        key,
        index: None,
    }
}

const fn coefficient(name: &'static str, index: usize) -> Dimension {
    Dimension {
        name,
        group: Group::Timbre,
        key: "mfcc_mean",
        index: Some(index),
    }
}

/// The dimensions of the vector, in order. MFCC c0 is excluded because it
/// tracks overall level, which the Dynamics group already covers; tempo is
/// excluded because it is often legitimately unavailable.
pub const DIMENSIONS: &[Dimension] = &[
    coefficient("mfcc1", 1),
    coefficient("mfcc2", 2),
    coefficient("mfcc3", 3),
    coefficient("mfcc4", 4),
    coefficient("mfcc5", 5),
    coefficient("mfcc6", 6),
    coefficient("mfcc7", 7),
    coefficient("mfcc8", 8),
    coefficient("mfcc9", 9),
    coefficient("mfcc10", 10),
    coefficient("mfcc11", 11),
    coefficient("mfcc12", 12),
    scalar("centroid", Group::SpectralBalance, "spectral_centroid_mean"),
    scalar(
        "bandwidth",
        Group::SpectralBalance,
        "spectral_bandwidth_mean",
    ),
    scalar("rolloff", Group::SpectralBalance, "spectral_rolloff_mean"),
    scalar("flatness", Group::SpectralTexture, "spectral_flatness_mean"),
    scalar("flux", Group::SpectralTexture, "spectral_flux_mean"),
    scalar("crest_factor", Group::Dynamics, "crest_factor_db"),
    scalar("loudness_range", Group::Dynamics, "loudness_range"),
];

/// Read a track's raw vector, or the reason it cannot be placed.
///
/// # Errors
///
/// Returns the key of the first mandatory feature that is missing or not valid.
pub fn raw_vector(features: &[AudioFeature]) -> Result<Vec<f64>, &'static str> {
    DIMENSIONS
        .iter()
        .map(|d| {
            let f = features
                .iter()
                .find(|f| f.key == d.key && f.status == FeatureStatus::Valid)
                .ok_or(d.key)?;
            match (&f.value, d.index) {
                (Some(FeatureValue::Scalar(v)), None) => Ok(*v),
                (Some(FeatureValue::Vector(v)), Some(i)) => v.get(i).copied().ok_or(d.key),
                _ => Err(d.key),
            }
        })
        .collect()
}

/// Median and interquartile range of each dimension across a collection.
#[derive(Debug, Clone, PartialEq)]
pub struct Normalizer {
    pub median: Vec<f64>,
    pub iqr: Vec<f64>,
    /// Dimensions with too little spread to normalize are switched off rather
    /// than amplified into noise.
    pub active: Vec<bool>,
}

/// Minimum interquartile range, relative to the median's magnitude, for a
/// dimension to stay active.
const MIN_RELATIVE_IQR: f64 = 1e-6;

fn quantile(sorted: &[f64], q: f64) -> f64 {
    let pos = q * (sorted.len() - 1) as f64;
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let lo = pos.floor() as usize;
    let hi = (lo + 1).min(sorted.len() - 1);
    sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo as f64)
}

impl Normalizer {
    /// Fit on raw vectors of equal length. Returns `None` for an empty set.
    pub fn fit(vectors: &[Vec<f64>]) -> Option<Self> {
        let dims = vectors.first()?.len();
        let mut median = Vec::with_capacity(dims);
        let mut iqr = Vec::with_capacity(dims);
        let mut active = Vec::with_capacity(dims);
        for d in 0..dims {
            let mut column: Vec<f64> = vectors.iter().map(|v| v[d]).collect();
            column.sort_by(f64::total_cmp);
            let m = quantile(&column, 0.5);
            let spread = quantile(&column, 0.75) - quantile(&column, 0.25);
            let threshold = MIN_RELATIVE_IQR * m.abs().max(1.0);
            median.push(m);
            iqr.push(spread);
            active.push(spread > threshold);
        }
        Some(Self {
            median,
            iqr,
            active,
        })
    }

    /// `z = (x − median) / IQR` for active dimensions, 0 for inactive ones.
    pub fn apply(&self, raw: &[f64]) -> Vec<f64> {
        raw.iter()
            .enumerate()
            .map(|(d, &x)| {
                if self.active[d] {
                    (x - self.median[d]) / self.iqr[d]
                } else {
                    0.0
                }
            })
            .collect()
    }

    /// Per-dimension weights: each group with at least one active dimension
    /// gets equal total weight, split evenly across its active dimensions;
    /// the weights sum to 1.
    pub fn weights(&self) -> Vec<f64> {
        let groups: Vec<Group> = Group::ALL
            .into_iter()
            .filter(|g| {
                DIMENSIONS
                    .iter()
                    .zip(&self.active)
                    .any(|(d, a)| *a && d.group == *g)
            })
            .collect();
        if groups.is_empty() {
            return vec![0.0; DIMENSIONS.len()];
        }
        let per_group = 1.0 / groups.len() as f64;
        DIMENSIONS
            .iter()
            .zip(&self.active)
            .map(|(d, &a)| {
                if !a {
                    return 0.0;
                }
                let n = DIMENSIONS
                    .iter()
                    .zip(&self.active)
                    .filter(|(o, oa)| **oa && o.group == d.group)
                    .count();
                per_group / n as f64
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn features(scale: f64) -> Vec<AudioFeature> {
        let mut f: Vec<AudioFeature> = [
            ("spectral_centroid_mean", 1000.0),
            ("spectral_bandwidth_mean", 800.0),
            ("spectral_rolloff_mean", 2000.0),
            ("spectral_flatness_mean", 0.1),
            ("spectral_flux_mean", 0.2),
            ("crest_factor_db", 12.0),
            ("loudness_range", 5.0),
        ]
        .iter()
        .map(|(k, v)| AudioFeature::scalar(*k, v * scale, None, "t/1"))
        .collect();
        f.push(AudioFeature::vector(
            "mfcc_mean",
            (0..13).map(|i| f64::from(i) * scale).collect(),
            None,
            "m/1",
        ));
        f
    }

    #[test]
    fn builds_the_documented_dimensions() {
        let v = raw_vector(&features(1.0)).unwrap();
        assert_eq!(v.len(), DIMENSIONS.len());
        assert_eq!(v[0], 1.0, "mfcc1, not c0");
        assert_eq!(v[12], 1000.0, "centroid follows the 12 MFCCs");
    }

    #[test]
    fn missing_or_unavailable_features_exclude_the_track() {
        let mut f = features(1.0);
        f.retain(|x| x.key != "loudness_range");
        f.push(AudioFeature::unavailable(
            "loudness_range",
            Some("LU"),
            "l/1",
            "too_short",
        ));
        assert_eq!(raw_vector(&f), Err("loudness_range"));
    }

    #[test]
    fn normalization_is_robust_to_an_outlier() {
        let vectors: Vec<Vec<f64>> = [1.0, 2.0, 3.0, 4.0, 1000.0]
            .iter()
            .map(|x| vec![*x])
            .collect();
        let n = Normalizer::fit(&vectors).unwrap();
        assert_eq!(n.median, vec![3.0]);
        assert_eq!(n.iqr, vec![2.0]);
        assert_eq!(n.apply(&[5.0]), vec![1.0]);
    }

    #[test]
    fn constant_dimensions_are_switched_off() {
        let vectors = vec![vec![7.0, 1.0], vec![7.0, 2.0], vec![7.0, 3.0]];
        let n = Normalizer::fit(&vectors).unwrap();
        assert_eq!(n.active, vec![false, true]);
        assert_eq!(n.apply(&[7.0, 2.0]), vec![0.0, 0.0]);
    }

    #[test]
    fn group_weights_are_equal_and_sum_to_one() {
        let vectors: Vec<Vec<f64>> = (1..=5)
            .map(|i| raw_vector(&features(f64::from(i))).unwrap())
            .collect();
        let n = Normalizer::fit(&vectors).unwrap();
        let w = n.weights();
        assert!((w.iter().sum::<f64>() - 1.0).abs() < 1e-12);
        let group_total = |g: Group| -> f64 {
            DIMENSIONS
                .iter()
                .zip(&w)
                .filter(|(d, _)| d.group == g)
                .map(|(_, w)| w)
                .sum()
        };
        for g in Group::ALL {
            assert!((group_total(g) - 0.25).abs() < 1e-12, "{g:?}");
        }
        // Twelve MFCCs share one group's weight; one centroid gets a third of another's.
        assert!(w[0] < w[12]);
    }
}
