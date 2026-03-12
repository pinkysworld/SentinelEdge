use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::fs;
use std::path::Path;

use crate::detector::AnomalyDetector;

/// A serializable snapshot of the detector and configuration state
/// that can be used for rollback after a suspected compromise.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checkpoint {
    pub id: u64,
    pub created_at: String,
    pub baseline_cpu: f32,
    pub baseline_memory: f32,
    pub baseline_temperature: f32,
    pub baseline_network: f32,
    pub baseline_auth: f32,
    pub baseline_battery: f32,
    pub baseline_drift: f32,
    pub observed_samples: usize,
    pub digest: String,
}

/// Manages a bounded ring of checkpoints for rollback.
#[derive(Debug)]
pub struct CheckpointStore {
    max_checkpoints: usize,
    checkpoints: VecDeque<Checkpoint>,
    next_id: u64,
}

impl CheckpointStore {
    pub fn new(max_checkpoints: usize) -> Self {
        Self {
            max_checkpoints,
            checkpoints: VecDeque::new(),
            next_id: 1,
        }
    }

    pub fn capture(&mut self, detector: &AnomalyDetector) -> Option<&Checkpoint> {
        let snapshot = detector.snapshot()?;

        let payload = format!(
            "{},{},{},{},{},{},{},{}",
            snapshot.cpu_load_pct,
            snapshot.memory_load_pct,
            snapshot.temperature_c,
            snapshot.network_kbps,
            snapshot.auth_failures,
            snapshot.battery_pct,
            snapshot.integrity_drift,
            snapshot.observed_samples,
        );

        let digest = crate::audit::sha256_hex(payload.as_bytes());

        let checkpoint = Checkpoint {
            id: self.next_id,
            created_at: chrono::Utc::now().to_rfc3339(),
            baseline_cpu: snapshot.cpu_load_pct,
            baseline_memory: snapshot.memory_load_pct,
            baseline_temperature: snapshot.temperature_c,
            baseline_network: snapshot.network_kbps,
            baseline_auth: snapshot.auth_failures,
            baseline_battery: snapshot.battery_pct,
            baseline_drift: snapshot.integrity_drift,
            observed_samples: snapshot.observed_samples,
            digest,
        };

        self.next_id += 1;

        if self.checkpoints.len() >= self.max_checkpoints {
            self.checkpoints.pop_front();
        }
        self.checkpoints.push_back(checkpoint);
        self.checkpoints.back()
    }

    pub fn latest(&self) -> Option<&Checkpoint> {
        self.checkpoints.back()
    }

    pub fn all(&self) -> &VecDeque<Checkpoint> {
        &self.checkpoints
    }

    pub fn save(&self, path: &Path) -> Result<(), String> {
        let list: Vec<&Checkpoint> = self.checkpoints.iter().collect();
        let json = serde_json::to_string_pretty(&list)
            .map_err(|e| format!("failed to serialize checkpoints: {e}"))?;

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create checkpoint directory: {e}"))?;
        }

        fs::write(path, json)
            .map_err(|e| format!("failed to write checkpoints: {e}"))
    }
}

#[cfg(test)]
mod tests {
    use super::CheckpointStore;
    use crate::detector::AnomalyDetector;
    use crate::telemetry::TelemetrySample;

    fn sample() -> TelemetrySample {
        TelemetrySample {
            timestamp_ms: 1,
            cpu_load_pct: 20.0,
            memory_load_pct: 30.0,
            temperature_c: 38.0,
            network_kbps: 400.0,
            auth_failures: 0,
            battery_pct: 90.0,
            integrity_drift: 0.01,
            process_count: 40,
            disk_pressure_pct: 5.0,
        }
    }

    #[test]
    fn capture_creates_checkpoint() {
        let mut detector = AnomalyDetector::default();
        detector.evaluate(&sample());
        let mut store = CheckpointStore::new(5);
        let cp = store.capture(&detector);
        assert!(cp.is_some());
        assert_eq!(cp.unwrap().id, 1);
    }

    #[test]
    fn bounded_ring_evicts_oldest() {
        let mut detector = AnomalyDetector::default();
        detector.evaluate(&sample());
        let mut store = CheckpointStore::new(2);
        store.capture(&detector);
        store.capture(&detector);
        store.capture(&detector);
        assert_eq!(store.all().len(), 2);
        assert_eq!(store.all().front().unwrap().id, 2);
    }
}
