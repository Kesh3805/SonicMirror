use serde::{Deserialize, Serialize};

/// Outcome of computing a single acoustic feature.
///
/// Invalid measurements are never replaced with fabricated zeros: a feature
/// that cannot be computed reports [`FeatureStatus::Unavailable`] or
/// [`FeatureStatus::Failed`] with a `None` value.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FeatureStatus {
    /// The value was computed and passed validation.
    Valid,
    /// The feature is not meaningful for this signal (e.g. tempo of silence).
    Unavailable,
    /// The analyzer encountered an error.
    Failed,
}

/// A scalar or vector feature value.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum FeatureValue {
    Scalar(f64),
    Vector(Vec<f64>),
}

/// A single computed acoustic feature with provenance.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFeature {
    pub key: String,
    pub value: Option<FeatureValue>,
    pub unit: Option<String>,
    pub status: FeatureStatus,
    pub algorithm_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diagnostic_code: Option<String>,
}

impl AudioFeature {
    /// A valid scalar measurement. Non-finite values are demoted to
    /// [`FeatureStatus::Failed`] so NaN or infinity never reach consumers.
    pub fn scalar(
        key: impl Into<String>,
        value: f64,
        unit: Option<&str>,
        algorithm_version: impl Into<String>,
    ) -> Self {
        let key = key.into();
        let algorithm_version = algorithm_version.into();
        if !value.is_finite() {
            return Self::failed(key, unit, algorithm_version, "non_finite_value");
        }
        Self {
            key,
            value: Some(FeatureValue::Scalar(value)),
            unit: unit.map(str::to_owned),
            status: FeatureStatus::Valid,
            algorithm_version,
            confidence: None,
            diagnostic_code: None,
        }
    }

    /// A feature that is not meaningful for the analyzed signal.
    pub fn unavailable(
        key: impl Into<String>,
        unit: Option<&str>,
        algorithm_version: impl Into<String>,
        diagnostic_code: impl Into<String>,
    ) -> Self {
        Self::without_value(
            key,
            unit,
            algorithm_version,
            FeatureStatus::Unavailable,
            diagnostic_code,
        )
    }

    /// A feature whose analyzer failed.
    pub fn failed(
        key: impl Into<String>,
        unit: Option<&str>,
        algorithm_version: impl Into<String>,
        diagnostic_code: impl Into<String>,
    ) -> Self {
        Self::without_value(
            key,
            unit,
            algorithm_version,
            FeatureStatus::Failed,
            diagnostic_code,
        )
    }

    fn without_value(
        key: impl Into<String>,
        unit: Option<&str>,
        algorithm_version: impl Into<String>,
        status: FeatureStatus,
        diagnostic_code: impl Into<String>,
    ) -> Self {
        Self {
            key: key.into(),
            value: None,
            unit: unit.map(str::to_owned),
            status,
            algorithm_version: algorithm_version.into(),
            confidence: None,
            diagnostic_code: Some(diagnostic_code.into()),
        }
    }

    #[must_use]
    pub fn with_confidence(mut self, confidence: f64) -> Self {
        self.confidence = Some(confidence.clamp(0.0, 1.0));
        self
    }

    pub fn is_valid(&self) -> bool {
        self.status == FeatureStatus::Valid
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn non_finite_scalar_is_failed_not_zero() {
        let f = AudioFeature::scalar("rms_dbfs", f64::NAN, Some("dBFS"), "1");
        assert_eq!(f.status, FeatureStatus::Failed);
        assert_eq!(f.value, None);
        assert_eq!(f.diagnostic_code.as_deref(), Some("non_finite_value"));
    }

    #[test]
    fn serializes_to_ipc_contract_shape() {
        let f = AudioFeature::scalar("spectral_centroid", 2410.0, Some("Hz"), "1.0.0")
            .with_confidence(0.9);
        let json = serde_json::to_value(&f).unwrap();
        assert_eq!(json["status"], "valid");
        assert_eq!(json["algorithmVersion"], "1.0.0");
        assert_eq!(json["value"], 2410.0);
        assert!(json.get("diagnosticCode").is_none());
    }

    #[test]
    fn unavailable_has_no_value() {
        let f = AudioFeature::unavailable("tempo", Some("BPM"), "1", "low_confidence");
        assert!(!f.is_valid());
        assert!(f.value.is_none());
    }
}
