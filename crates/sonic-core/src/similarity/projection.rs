//! Deterministic PCA projection for the Sonic Atlas (ADR-010).
//!
//! Normalized vectors are scaled by `√w` so squared Euclidean distance in the
//! projected space's source equals the weighted distance used for neighbours.
//! Columns are centred, the covariance matrix is diagonalized with the cyclic
//! Jacobi method, and the two leading components give the map coordinates.
//! Each component's sign is fixed so its largest-magnitude loading is positive,
//! making the map reproducible across runs and platforms.

// Dense linear algebra reads best in index notation (a[i][j], c, s, t).
#![allow(
    clippy::needless_range_loop,
    clippy::many_single_char_names,
    clippy::similar_names
)]

use super::vector::DIMENSIONS;

/// Version of the projection method. Bump when coordinates can change.
pub const PROJECTION_VERSION: &str = "pca/1.0.0";

/// Fewest tracks for which a projection is attempted.
pub const MIN_POINTS: usize = 3;

/// One principal axis.
#[derive(Debug, Clone, PartialEq)]
pub struct Axis {
    /// Fraction of total variance along this axis, in `[0, 1]`.
    pub explained: f64,
    /// Loading per dimension (unit vector).
    pub loadings: Vec<f64>,
}

impl Axis {
    /// The `n` dimensions with the largest absolute loadings, signed.
    pub fn top_dimensions(&self, n: usize) -> Vec<(&'static str, f64)> {
        let mut order: Vec<usize> = (0..self.loadings.len()).collect();
        order.sort_by(|&a, &b| {
            self.loadings[b]
                .abs()
                .total_cmp(&self.loadings[a].abs())
                .then(a.cmp(&b))
        });
        order
            .into_iter()
            .take(n)
            .map(|i| (DIMENSIONS.get(i).map_or("?", |d| d.name), self.loadings[i]))
            .collect()
    }
}

/// A 2D projection: one coordinate pair per input vector, plus the axes.
#[derive(Debug, Clone, PartialEq)]
pub struct Projection {
    pub coordinates: Vec<[f64; 2]>,
    pub axes: [Axis; 2],
}

/// Project weighted, normalized vectors onto their two principal components.
///
/// # Errors
///
/// `"too_few_tracks"` below [`MIN_POINTS`]; `"insufficient_variance"` when the
/// collection is (nearly) identical, so no direction carries information.
pub fn project(normalized: &[Vec<f64>], weights: &[f64]) -> Result<Projection, &'static str> {
    let n = normalized.len();
    if n < MIN_POINTS {
        return Err("too_few_tracks");
    }
    let d = weights.len();
    let scale: Vec<f64> = weights.iter().map(|w| w.max(0.0).sqrt()).collect();
    let mut rows: Vec<Vec<f64>> = normalized
        .iter()
        .map(|z| z.iter().zip(&scale).map(|(x, s)| x * s).collect())
        .collect();
    for j in 0..d {
        let mean = rows.iter().map(|r| r[j]).sum::<f64>() / n as f64;
        for r in &mut rows {
            r[j] -= mean;
        }
    }

    let mut cov = vec![vec![0.0; d]; d];
    for r in &rows {
        for i in 0..d {
            for j in i..d {
                cov[i][j] += r[i] * r[j];
            }
        }
    }
    let denom = (n - 1) as f64;
    for i in 0..d {
        for j in i..d {
            cov[i][j] /= denom;
            cov[j][i] = cov[i][j];
        }
    }

    let (values, vectors) = jacobi(cov);
    let total: f64 = values.iter().map(|v| v.max(0.0)).sum();
    let mut order: Vec<usize> = (0..d).collect();
    order.sort_by(|&a, &b| values[b].total_cmp(&values[a]).then(a.cmp(&b)));
    if total <= 1e-12 || values[order[0]] <= 1e-12 * total.max(1.0) {
        return Err("insufficient_variance");
    }

    let axis = |k: usize| -> Axis {
        let idx = order[k];
        let mut loadings: Vec<f64> = (0..d).map(|i| vectors[i][idx]).collect();
        // Fix the sign: the largest-magnitude loading is positive.
        let pivot = (0..d)
            .max_by(|&a, &b| {
                loadings[a]
                    .abs()
                    .total_cmp(&loadings[b].abs())
                    .then(b.cmp(&a))
            })
            .unwrap_or(0);
        if loadings[pivot] < 0.0 {
            for l in &mut loadings {
                *l = -*l;
            }
        }
        Axis {
            explained: values[idx].max(0.0) / total,
            loadings,
        }
    };
    let axes = [axis(0), axis(1)];
    let coordinates = rows
        .iter()
        .map(|r| {
            let dot = |a: &Axis| r.iter().zip(&a.loadings).map(|(x, l)| x * l).sum::<f64>();
            [dot(&axes[0]), dot(&axes[1])]
        })
        .collect();
    Ok(Projection { coordinates, axes })
}

/// Eigen-decomposition of a symmetric matrix by cyclic Jacobi rotations.
/// Returns eigenvalues and a matrix whose columns are the eigenvectors.
fn jacobi(mut a: Vec<Vec<f64>>) -> (Vec<f64>, Vec<Vec<f64>>) {
    let n = a.len();
    let mut v = vec![vec![0.0; n]; n];
    for (i, row) in v.iter_mut().enumerate() {
        row[i] = 1.0;
    }
    for _sweep in 0..100 {
        let off: f64 = (0..n)
            .flat_map(|i| (0..n).filter(move |&j| j != i).map(move |j| (i, j)))
            .map(|(i, j)| a[i][j] * a[i][j])
            .sum();
        if off < 1e-22 {
            break;
        }
        for p in 0..n {
            for q in (p + 1)..n {
                if a[p][q].abs() < 1e-300 {
                    continue;
                }
                let theta = (a[q][q] - a[p][p]) / (2.0 * a[p][q]);
                let t = theta.signum() / (theta.abs() + (theta * theta + 1.0).sqrt());
                let t = if theta == 0.0 { 1.0 } else { t };
                let c = 1.0 / (t * t + 1.0).sqrt();
                let s = t * c;
                for k in 0..n {
                    let (akp, akq) = (a[k][p], a[k][q]);
                    a[k][p] = c * akp - s * akq;
                    a[k][q] = s * akp + c * akq;
                }
                for k in 0..n {
                    let (apk, aqk) = (a[p][k], a[q][k]);
                    a[p][k] = c * apk - s * aqk;
                    a[q][k] = s * apk + c * aqk;
                }
                for row in &mut v {
                    let (vkp, vkq) = (row[p], row[q]);
                    row[p] = c * vkp - s * vkq;
                    row[q] = s * vkp + c * vkq;
                }
            }
        }
    }
    ((0..n).map(|i| a[i][i]).collect(), v)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn jacobi_diagonalizes_a_known_matrix() {
        // Eigenvalues of [[2,1],[1,2]] are 3 and 1.
        let (mut values, vectors) = jacobi(vec![vec![2.0, 1.0], vec![1.0, 2.0]]);
        values.sort_by(f64::total_cmp);
        assert!((values[0] - 1.0).abs() < 1e-12 && (values[1] - 3.0).abs() < 1e-12);
        let dot = vectors[0][0] * vectors[0][1] + vectors[1][0] * vectors[1][1];
        assert!(dot.abs() < 1e-12, "eigenvectors are orthogonal");
    }

    #[test]
    fn recovers_the_direction_of_greatest_variance() {
        // Points along the line y = 2x with a little orthogonal spread.
        let points: Vec<Vec<f64>> = (0..20)
            .map(|i| {
                let t = f64::from(i) - 10.0;
                let e = if i % 2 == 0 { 0.05 } else { -0.05 };
                vec![t - 2.0 * e, 2.0 * t + e]
            })
            .collect();
        let p = project(&points, &[1.0, 1.0]).unwrap();
        let l = &p.axes[0].loadings;
        let expected = [1.0 / 5f64.sqrt(), 2.0 / 5f64.sqrt()];
        assert!(
            (l[0] - expected[0]).abs() < 1e-3 && (l[1] - expected[1]).abs() < 1e-3,
            "{l:?}"
        );
        assert!(p.axes[0].explained > 0.99);
        assert!((p.axes[0].explained + p.axes[1].explained - 1.0).abs() < 1e-9);
    }

    #[test]
    fn projection_is_deterministic_including_sign() {
        let points: Vec<Vec<f64>> = (0..10)
            .map(|i| vec![f64::from(i), -f64::from(i) * 0.5, 1.0])
            .collect();
        let a = project(&points, &[0.5, 0.25, 0.25]).unwrap();
        let b = project(&points, &[0.5, 0.25, 0.25]).unwrap();
        assert_eq!(a, b);
        let pivot = a.axes[0]
            .loadings
            .iter()
            .copied()
            .max_by(|x, y| x.abs().total_cmp(&y.abs()))
            .unwrap();
        assert!(pivot > 0.0, "largest loading is positive");
    }

    #[test]
    fn coordinates_preserve_weighted_distances_when_two_dimensional() {
        let points = vec![
            vec![0.0, 0.0],
            vec![3.0, 0.0],
            vec![0.0, 4.0],
            vec![1.0, 1.0],
        ];
        let weights = [0.5, 0.5];
        let p = project(&points, &weights).unwrap();
        let mapped = |i: usize, j: usize| {
            let (a, b) = (p.coordinates[i], p.coordinates[j]);
            ((a[0] - b[0]).powi(2) + (a[1] - b[1]).powi(2)).sqrt()
        };
        let original = super::super::distance::distance(&points[1], &points[2], &weights);
        assert!((mapped(1, 2) - original).abs() < 1e-9);
    }

    #[test]
    fn refuses_degenerate_or_tiny_collections() {
        assert_eq!(
            project(&[vec![1.0], vec![2.0]], &[1.0]),
            Err("too_few_tracks")
        );
        let same = vec![vec![1.0, 2.0]; 5];
        assert_eq!(project(&same, &[0.5, 0.5]), Err("insufficient_variance"));
    }
}
