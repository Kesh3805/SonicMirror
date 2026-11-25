//! Weighted Euclidean distance in the normalized feature space, its
//! decomposition by feature group, and exact nearest-neighbour search.
//!
//! `d(a, b) = sqrt(Σ_j w_j (z_aj − z_bj)²)`. Because the sum is over groups of
//! dimensions, each group's share of `d²` says which aspects make two tracks
//! differ. Distances are never converted into percentages.

use std::collections::BTreeMap;

use super::vector::{DIMENSIONS, Group};

/// Weighted Euclidean distance between two normalized vectors.
pub fn distance(a: &[f64], b: &[f64], weights: &[f64]) -> f64 {
    a.iter()
        .zip(b)
        .zip(weights)
        .map(|((x, y), w)| w * (x - y) * (x - y))
        .sum::<f64>()
        .sqrt()
}

/// Each group's share of the squared distance, summing to 1 when the tracks
/// differ at all (empty when they are identical).
pub fn contributions(a: &[f64], b: &[f64], weights: &[f64]) -> BTreeMap<&'static str, f64> {
    let mut parts: BTreeMap<&'static str, f64> = BTreeMap::new();
    let mut total = 0.0;
    for (d, ((x, y), w)) in DIMENSIONS.iter().zip(a.iter().zip(b).zip(weights)) {
        let part = w * (x - y) * (x - y);
        *parts.entry(d.group.label()).or_default() += part;
        total += part;
    }
    if total <= 0.0 {
        return BTreeMap::new();
    }
    for v in parts.values_mut() {
        *v /= total;
    }
    for g in Group::ALL {
        parts.entry(g.label()).or_insert(0.0);
    }
    parts
}

/// One neighbour: index into the collection and distance in the original space.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Neighbour {
    pub index: usize,
    pub distance: f64,
}

/// The `k` nearest other points to `query`, closest first. Ties are broken by
/// index so results are deterministic. Exact search: every point is compared.
pub fn nearest(points: &[Vec<f64>], query: usize, k: usize, weights: &[f64]) -> Vec<Neighbour> {
    let Some(q) = points.get(query) else {
        return Vec::new();
    };
    let mut all: Vec<Neighbour> = points
        .iter()
        .enumerate()
        .filter(|(i, _)| *i != query)
        .map(|(index, p)| Neighbour {
            index,
            distance: distance(q, p, weights),
        })
        .collect();
    all.sort_by(|a, b| {
        a.distance
            .total_cmp(&b.distance)
            .then(a.index.cmp(&b.index))
    });
    all.truncate(k);
    all
}

#[cfg(test)]
mod tests {
    use super::*;

    fn uniform(n: usize) -> Vec<f64> {
        vec![1.0 / n as f64; n]
    }

    #[test]
    fn identical_vectors_have_zero_distance() {
        let v = vec![0.3; DIMENSIONS.len()];
        assert_eq!(distance(&v, &v, &uniform(v.len())), 0.0);
        assert_eq!(contributions(&v, &v, &uniform(v.len())).len(), 0);
    }

    #[test]
    fn distance_is_symmetric_and_weighted() {
        let a = vec![0.0, 0.0];
        let b = vec![3.0, 4.0];
        assert!((distance(&a, &b, &[1.0, 1.0]) - 5.0).abs() < 1e-12);
        assert!((distance(&a, &b, &[1.0, 1.0]) - distance(&b, &a, &[1.0, 1.0])).abs() < 1e-12);
        assert!((distance(&a, &b, &[1.0, 0.0]) - 3.0).abs() < 1e-12);
    }

    #[test]
    fn contributions_attribute_difference_to_groups() {
        let dims = DIMENSIONS.len();
        let a = vec![0.0; dims];
        let mut b = vec![0.0; dims];
        // Differ only in the centroid (a Spectral balance dimension).
        let centroid = DIMENSIONS
            .iter()
            .position(|d| d.name == "centroid")
            .unwrap();
        b[centroid] = 2.0;
        let c = contributions(&a, &b, &uniform(dims));
        assert!((c["Spectral balance"] - 1.0).abs() < 1e-12);
        assert_eq!(c["Timbre"], 0.0);
        assert!((c.values().sum::<f64>() - 1.0).abs() < 1e-12);
    }

    #[test]
    fn nearest_matches_brute_force_ordering_with_stable_ties() {
        let points = vec![vec![0.0], vec![1.0], vec![-1.0], vec![5.0], vec![0.5]];
        let n = nearest(&points, 0, 3, &[1.0]);
        let order: Vec<usize> = n.iter().map(|x| x.index).collect();
        // 0.5 is closest, then 1.0 and -1.0 tie at distance 1 → lower index first.
        assert_eq!(order, vec![4, 1, 2]);
        assert!(n.windows(2).all(|w| w[0].distance <= w[1].distance));
        assert!(
            n.iter().all(|x| x.index != 0),
            "a point is never its own neighbour"
        );
    }

    #[test]
    fn nearest_handles_small_collections() {
        let points = vec![vec![0.0], vec![1.0]];
        assert_eq!(nearest(&points, 0, 10, &[1.0]).len(), 1);
        assert_eq!(nearest(&points, 9, 3, &[1.0]).len(), 0);
    }
}
