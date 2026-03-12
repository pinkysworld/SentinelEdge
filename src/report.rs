use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::policy::ThreatLevel;
use crate::runtime::{RunResult, SampleReport};

/// Structured JSON report suitable for SIEM ingestion.
#[derive(Debug, Serialize, Deserialize)]
pub struct JsonReport {
    pub version: String,
    pub generated_at: String,
    pub summary: JsonSummary,
    pub samples: Vec<JsonSampleEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonSummary {
    pub total_samples: usize,
    pub alert_count: usize,
    pub critical_count: usize,
    pub average_score: f32,
    pub max_score: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonSampleEntry {
    pub index: usize,
    pub timestamp_ms: u64,
    pub telemetry: JsonTelemetry,
    pub anomaly: JsonAnomaly,
    pub decision: JsonDecision,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonTelemetry {
    pub cpu_load_pct: f32,
    pub memory_load_pct: f32,
    pub temperature_c: f32,
    pub network_kbps: f32,
    pub auth_failures: u32,
    pub battery_pct: f32,
    pub integrity_drift: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonAnomaly {
    pub score: f32,
    pub confidence: f32,
    pub suspicious_axes: usize,
    pub reasons: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonDecision {
    pub threat_level: String,
    pub action: String,
    pub isolation_pct: u8,
    pub rationale: String,
}

impl JsonReport {
    pub fn from_run_result(result: &RunResult) -> Self {
        Self {
            version: "1.0".into(),
            generated_at: chrono::Utc::now().to_rfc3339(),
            summary: JsonSummary {
                total_samples: result.summary.total_samples,
                alert_count: result.summary.alert_count,
                critical_count: result.summary.critical_count,
                average_score: result.summary.average_score,
                max_score: result.summary.max_score,
            },
            samples: result.reports.iter().map(Self::convert_sample).collect(),
        }
    }

    fn convert_sample(report: &SampleReport) -> JsonSampleEntry {
        JsonSampleEntry {
            index: report.index,
            timestamp_ms: report.sample.timestamp_ms,
            telemetry: JsonTelemetry {
                cpu_load_pct: report.sample.cpu_load_pct,
                memory_load_pct: report.sample.memory_load_pct,
                temperature_c: report.sample.temperature_c,
                network_kbps: report.sample.network_kbps,
                auth_failures: report.sample.auth_failures,
                battery_pct: report.sample.battery_pct,
                integrity_drift: report.sample.integrity_drift,
            },
            anomaly: JsonAnomaly {
                score: report.signal.score,
                confidence: report.signal.confidence,
                suspicious_axes: report.signal.suspicious_axes,
                reasons: report.signal.reasons.clone(),
            },
            decision: JsonDecision {
                threat_level: report.decision.level.as_str().into(),
                action: report.decision.action.as_str().into(),
                isolation_pct: report.decision.isolation_pct,
                rationale: report.decision.rationale.clone(),
            },
        }
    }

    pub fn to_json(&self) -> Result<String, String> {
        serde_json::to_string_pretty(self)
            .map_err(|e| format!("failed to serialize JSON report: {e}"))
    }

    pub fn write_to_path(&self, path: &Path) -> Result<(), String> {
        let json = self.to_json()?;

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create report directory: {e}"))?;
        }

        fs::write(path, json)
            .map_err(|e| format!("failed to write JSON report: {e}"))
    }
}

/// Emit a single-line JSONL entry per sample (for streaming SIEM ingestion).
pub fn emit_jsonl(result: &RunResult) -> String {
    let mut output = String::new();
    for report in &result.reports {
        if report.decision.level == ThreatLevel::Nominal {
            continue;
        }
        let entry = JsonReport::convert_sample(report);
        if let Ok(line) = serde_json::to_string(&entry) {
            output.push_str(&line);
            output.push('\n');
        }
    }
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runtime::{demo_samples, execute};

    #[test]
    fn json_report_serializes() {
        let result = execute(&demo_samples());
        let report = JsonReport::from_run_result(&result);
        let json = report.to_json().unwrap();
        assert!(json.contains("\"version\""));
        assert!(json.contains("\"samples\""));
    }

    #[test]
    fn jsonl_outputs_alert_lines_only() {
        let result = execute(&demo_samples());
        let lines = emit_jsonl(&result);
        let count = lines.lines().count();
        assert_eq!(count, result.summary.alert_count);
    }
}
