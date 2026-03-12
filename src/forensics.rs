use std::fs;
use std::path::Path;

use crate::checkpoint::CheckpointStore;
use crate::runtime::RunResult;

/// Exports a forensic evidence bundle combining the audit log,
/// a run summary, and available checkpoint data into a single
/// human-readable and machine-parseable package.
pub fn export_bundle(
    result: &RunResult,
    checkpoints: &CheckpointStore,
    path: &Path,
) -> Result<(), String> {
    let mut bundle = String::new();

    bundle.push_str("═══════════════════════════════════════════════════\n");
    bundle.push_str(" SentinelEdge Forensic Evidence Bundle\n");
    bundle.push_str(&format!(
        " Generated: {}\n",
        chrono::Utc::now().to_rfc3339()
    ));
    bundle.push_str("═══════════════════════════════════════════════════\n\n");

    // Summary
    bundle.push_str("── Run Summary ────────────────────────────────────\n");
    bundle.push_str(&format!(
        "Total samples:  {}\n",
        result.summary.total_samples
    ));
    bundle.push_str(&format!("Alerts:         {}\n", result.summary.alert_count));
    bundle.push_str(&format!(
        "Critical:       {}\n",
        result.summary.critical_count
    ));
    bundle.push_str(&format!(
        "Average score:  {:.2}\n",
        result.summary.average_score
    ));
    bundle.push_str(&format!("Max score:      {:.2}\n", result.summary.max_score));
    bundle.push('\n');

    // Alert detail
    bundle.push_str("── Alert Detail ───────────────────────────────────\n");
    for report in &result.reports {
        if report.decision.level == crate::policy::ThreatLevel::Nominal {
            continue;
        }
        bundle.push_str(&format!(
            "Sample #{} t={} score={:.2} level={} action={}\n",
            report.index,
            report.sample.timestamp_ms,
            report.signal.score,
            report.decision.level.as_str(),
            report.decision.action.as_str(),
        ));
        bundle.push_str(&format!("  Reasons: {}\n", report.signal.reasons.join("; ")));
        bundle.push_str(&format!("  Policy:  {}\n", report.decision.rationale));
        bundle.push('\n');
    }

    // Checkpoints
    bundle.push_str("── Checkpoint History ─────────────────────────────\n");
    if checkpoints.all().is_empty() {
        bundle.push_str("No checkpoints captured during this run.\n");
    } else {
        for cp in checkpoints.all() {
            bundle.push_str(&format!(
                "CP#{} at {} samples={} digest={}\n",
                cp.id, cp.created_at, cp.observed_samples, cp.digest
            ));
        }
    }
    bundle.push('\n');

    // Audit log
    bundle.push_str("── Audit Log ──────────────────────────────────────\n");
    bundle.push_str(&result.audit.render());

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create forensics directory: {e}"))?;
    }

    fs::write(path, bundle)
        .map_err(|e| format!("failed to write forensic bundle: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::checkpoint::CheckpointStore;
    use crate::runtime::{demo_samples, execute};

    #[test]
    fn bundle_contains_all_sections() {
        let result = execute(&demo_samples());
        let store = CheckpointStore::new(5);
        let tmp = std::env::temp_dir().join("sentineledge_test_bundle.txt");
        export_bundle(&result, &store, &tmp).unwrap();
        let content = std::fs::read_to_string(&tmp).unwrap();
        assert!(content.contains("Run Summary"));
        assert!(content.contains("Alert Detail"));
        assert!(content.contains("Audit Log"));
        let _ = std::fs::remove_file(&tmp);
    }
}
