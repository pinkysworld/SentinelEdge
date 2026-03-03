use std::fmt::Write;
use std::path::Path;

use crate::audit::AuditLog;
use crate::detector::{AnomalyDetector, AnomalySignal};
use crate::policy::{PolicyDecision, PolicyEngine, ThreatLevel};
use crate::telemetry::TelemetrySample;

#[derive(Debug, Clone)]
pub struct SampleReport {
    pub index: usize,
    pub sample: TelemetrySample,
    pub signal: AnomalySignal,
    pub decision: PolicyDecision,
}

#[derive(Debug, Clone)]
pub struct RunSummary {
    pub total_samples: usize,
    pub alert_count: usize,
    pub critical_count: usize,
    pub average_score: f32,
    pub max_score: f32,
}

#[derive(Debug, Clone)]
pub struct RunResult {
    pub reports: Vec<SampleReport>,
    pub summary: RunSummary,
    pub audit: AuditLog,
}

pub fn demo_samples() -> Vec<TelemetrySample> {
    vec![
        TelemetrySample {
            timestamp_ms: 1_000,
            cpu_load_pct: 18.0,
            memory_load_pct: 32.0,
            temperature_c: 41.0,
            network_kbps: 500.0,
            auth_failures: 0,
            battery_pct: 94.0,
            integrity_drift: 0.01,
        },
        TelemetrySample {
            timestamp_ms: 2_000,
            cpu_load_pct: 23.0,
            memory_load_pct: 34.0,
            temperature_c: 42.0,
            network_kbps: 550.0,
            auth_failures: 1,
            battery_pct: 92.0,
            integrity_drift: 0.02,
        },
        TelemetrySample {
            timestamp_ms: 3_000,
            cpu_load_pct: 26.0,
            memory_load_pct: 36.0,
            temperature_c: 43.0,
            network_kbps: 620.0,
            auth_failures: 0,
            battery_pct: 90.0,
            integrity_drift: 0.02,
        },
        TelemetrySample {
            timestamp_ms: 4_000,
            cpu_load_pct: 64.0,
            memory_load_pct: 58.0,
            temperature_c: 51.0,
            network_kbps: 5_400.0,
            auth_failures: 8,
            battery_pct: 63.0,
            integrity_drift: 0.11,
        },
        TelemetrySample {
            timestamp_ms: 5_000,
            cpu_load_pct: 81.0,
            memory_load_pct: 69.0,
            temperature_c: 57.0,
            network_kbps: 7_000.0,
            auth_failures: 15,
            battery_pct: 47.0,
            integrity_drift: 0.19,
        },
    ]
}

pub fn execute(samples: &[TelemetrySample]) -> RunResult {
    let mut detector = AnomalyDetector::default();
    let policy = PolicyEngine;
    let mut audit = AuditLog::default();
    let mut reports = Vec::with_capacity(samples.len());

    audit.record("boot", "SentinelEdge runtime started in prototype mode");

    for (index, sample) in samples.iter().enumerate() {
        let signal = detector.evaluate(sample);
        let decision = policy.evaluate(&signal, sample);

        audit.record(
            "detect",
            format!(
                "sample={} score={:.2} level={} axes={} reasons={}",
                index + 1,
                signal.score,
                decision.level.as_str(),
                signal.suspicious_axes,
                signal.reasons.join(", ")
            ),
        );

        if decision.level != ThreatLevel::Nominal {
            audit.record(
                "respond",
                format!(
                    "sample={} action={} isolation={} rationale={}",
                    index + 1,
                    decision.action.as_str(),
                    decision.isolation_pct,
                    decision.rationale
                ),
            );
        }

        reports.push(SampleReport {
            index: index + 1,
            sample: *sample,
            signal,
            decision,
        });
    }

    let total_samples = reports.len();
    let alert_count = reports
        .iter()
        .filter(|report| report.decision.level != ThreatLevel::Nominal)
        .count();
    let critical_count = reports
        .iter()
        .filter(|report| report.decision.level == ThreatLevel::Critical)
        .count();
    let max_score = reports
        .iter()
        .map(|report| report.signal.score)
        .fold(0.0_f32, f32::max);
    let average_score = if total_samples == 0 {
        0.0
    } else {
        reports
            .iter()
            .map(|report| report.signal.score)
            .sum::<f32>()
            / total_samples as f32
    };

    audit.record(
        "summary",
        format!(
            "samples={} alerts={} critical={} avg_score={:.2} max_score={:.2}",
            total_samples, alert_count, critical_count, average_score, max_score
        ),
    );

    RunResult {
        reports,
        summary: RunSummary {
            total_samples,
            alert_count,
            critical_count,
            average_score,
            max_score,
        },
        audit,
    }
}

pub fn render_console_report(result: &RunResult, audit_path: Option<&Path>) -> String {
    let mut output = String::new();
    let _ = writeln!(output, "SentinelEdge prototype analysis");
    let _ = writeln!(
        output,
        "samples: {} | alerts: {} | critical: {} | avg score: {:.2} | max score: {:.2}",
        result.summary.total_samples,
        result.summary.alert_count,
        result.summary.critical_count,
        result.summary.average_score,
        result.summary.max_score
    );

    for report in &result.reports {
        let _ = writeln!(
            output,
            "\n#{} t={} score={:.2} level={} action={} isolation={}%",
            report.index,
            report.sample.timestamp_ms,
            report.signal.score,
            report.decision.level.as_str(),
            report.decision.action.as_str(),
            report.decision.isolation_pct
        );
        let _ = writeln!(
            output,
            "  cpu={:.1}% mem={:.1}% temp={:.1}C net={:.0}kbps auth_failures={} battery={:.1}% integrity={:.2}",
            report.sample.cpu_load_pct,
            report.sample.memory_load_pct,
            report.sample.temperature_c,
            report.sample.network_kbps,
            report.sample.auth_failures,
            report.sample.battery_pct,
            report.sample.integrity_drift
        );
        let _ = writeln!(output, "  reasons: {}", report.signal.reasons.join("; "));
        let _ = writeln!(output, "  policy: {}", report.decision.rationale);
    }

    if let Some(path) = audit_path {
        let _ = writeln!(output, "\naudit log: {}", path.display());
    }

    output
}

pub fn status_snapshot() -> String {
    [
        "SentinelEdge status snapshot (2026-03-03)",
        "",
        "Implemented now:",
        "  - adaptive multi-signal anomaly scoring",
        "  - battery-aware mitigation scaling",
        "  - chained audit log output",
        "  - CLI demo/analyze/status commands",
        "  - documentation and a GitHub Pages site scaffold",
        "",
        "Not built yet:",
        "  - continual learning and privacy-preserving updates",
        "  - zero-knowledge proofs and formal verification",
        "  - swarm coordination and post-quantum cryptography",
        "",
        "See docs/STATUS.md and docs/PROJECT_BACKLOG.md for the full breakdown.",
    ]
    .join("\n")
}

#[cfg(test)]
mod tests {
    use super::{demo_samples, execute};

    #[test]
    fn demo_sequence_produces_alerts() {
        let result = execute(&demo_samples());

        assert_eq!(result.summary.total_samples, 5);
        assert!(result.summary.alert_count >= 2);
        assert!(result.summary.max_score > 4.0);
    }
}
