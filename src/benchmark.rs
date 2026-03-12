use crate::detector::AnomalyDetector;
use crate::policy::{PolicyEngine, ThreatLevel};
use crate::telemetry::TelemetrySample;

/// A labeled sample for benchmark evaluation.
#[derive(Debug, Clone)]
pub struct LabeledSample {
    pub sample: TelemetrySample,
    /// `true` if this sample is genuinely anomalous.
    pub is_anomaly: bool,
}

/// Confusion matrix and derived metrics.
#[derive(Debug, Clone)]
pub struct BenchmarkResult {
    pub true_positives: usize,
    pub false_positives: usize,
    pub true_negatives: usize,
    pub false_negatives: usize,
    pub total: usize,
}

impl BenchmarkResult {
    pub fn precision(&self) -> f64 {
        let denom = self.true_positives + self.false_positives;
        if denom == 0 {
            0.0
        } else {
            self.true_positives as f64 / denom as f64
        }
    }

    pub fn recall(&self) -> f64 {
        let denom = self.true_positives + self.false_negatives;
        if denom == 0 {
            0.0
        } else {
            self.true_positives as f64 / denom as f64
        }
    }

    pub fn f1(&self) -> f64 {
        let p = self.precision();
        let r = self.recall();
        if p + r == 0.0 {
            0.0
        } else {
            2.0 * p * r / (p + r)
        }
    }

    pub fn accuracy(&self) -> f64 {
        if self.total == 0 {
            0.0
        } else {
            (self.true_positives + self.true_negatives) as f64 / self.total as f64
        }
    }

    pub fn summary(&self) -> String {
        format!(
            "TP={} FP={} TN={} FN={} | precision={:.3} recall={:.3} F1={:.3} accuracy={:.3}",
            self.true_positives,
            self.false_positives,
            self.true_negatives,
            self.false_negatives,
            self.precision(),
            self.recall(),
            self.f1(),
            self.accuracy(),
        )
    }
}

/// Run a labeled dataset through the detector and policy engine,
/// producing confusion-matrix metrics.
///
/// A sample is classified as "detected" if the policy engine
/// assigns a threat level above `Nominal`.
pub fn run_benchmark(labeled: &[LabeledSample]) -> BenchmarkResult {
    let mut detector = AnomalyDetector::default();
    let policy = PolicyEngine;

    let mut tp = 0;
    let mut fp = 0;
    let mut tn = 0;
    let mut r#fn = 0;

    for entry in labeled {
        let signal = detector.evaluate(&entry.sample);
        let decision = policy.evaluate(&signal, &entry.sample);
        let detected = decision.level != ThreatLevel::Nominal;

        match (entry.is_anomaly, detected) {
            (true, true) => tp += 1,
            (false, true) => fp += 1,
            (false, false) => tn += 1,
            (true, false) => r#fn += 1,
        }
    }

    BenchmarkResult {
        true_positives: tp,
        false_positives: fp,
        true_negatives: tn,
        false_negatives: r#fn,
        total: labeled.len(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::telemetry::TelemetrySample;

    fn benign(ts: u64) -> LabeledSample {
        LabeledSample {
            sample: TelemetrySample {
                timestamp_ms: ts,
                cpu_load_pct: 15.0 + (ts % 5) as f32,
                memory_load_pct: 25.0,
                temperature_c: 37.0,
                network_kbps: 350.0,
                auth_failures: 0,
                battery_pct: 90.0,
                integrity_drift: 0.01,
                process_count: 45,
                disk_pressure_pct: 8.0,
            },
            is_anomaly: false,
        }
    }

    fn attack(ts: u64) -> LabeledSample {
        LabeledSample {
            sample: TelemetrySample {
                timestamp_ms: ts,
                cpu_load_pct: 78.0,
                memory_load_pct: 72.0,
                temperature_c: 55.0,
                network_kbps: 6000.0,
                auth_failures: 12,
                battery_pct: 50.0,
                integrity_drift: 0.22,
                process_count: 130,
                disk_pressure_pct: 70.0,
            },
            is_anomaly: true,
        }
    }

    #[test]
    fn benchmark_produces_valid_metrics() {
        let dataset: Vec<_> = (1..=6)
            .map(|i| benign(i))
            .chain((7..=10).map(|i| attack(i)))
            .collect();

        let result = run_benchmark(&dataset);
        assert_eq!(result.total, 10);
        // With 6 benign warmup then 4 attacks, detector should catch most
        assert!(result.true_positives >= 2, "should detect some attacks");
        assert!(result.precision() > 0.0);
        assert!(result.recall() > 0.0);
    }

    #[test]
    fn all_benign_yields_no_false_positives_eventually() {
        // After warmup, pure benign data should not trigger
        let dataset: Vec<_> = (1..=20).map(|i| benign(i)).collect();
        let result = run_benchmark(&dataset);
        // The first few samples during warmup might trigger, but most should be TN
        assert!(result.true_negatives > result.false_positives);
    }

    #[test]
    fn summary_string_contains_metrics() {
        let result = BenchmarkResult {
            true_positives: 5,
            false_positives: 1,
            true_negatives: 10,
            false_negatives: 2,
            total: 18,
        };
        let s = result.summary();
        assert!(s.contains("TP=5"));
        assert!(s.contains("precision="));
        assert!(s.contains("F1="));
    }
}
