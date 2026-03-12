use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Serializable representation of the detector's learned baseline
/// so it can be persisted between runs and reloaded on startup.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedBaseline {
    pub cpu_load_pct: f32,
    pub memory_load_pct: f32,
    pub temperature_c: f32,
    pub network_kbps: f32,
    pub auth_failures: f32,
    pub battery_pct: f32,
    pub integrity_drift: f32,
    pub observed_samples: usize,
}

impl PersistedBaseline {
    pub fn save(&self, path: &Path) -> Result<(), String> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("failed to serialize baseline: {e}"))?;

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create baseline directory: {e}"))?;
        }

        fs::write(path, json)
            .map_err(|e| format!("failed to write baseline: {e}"))
    }

    pub fn load(path: &Path) -> Result<Self, String> {
        let raw = fs::read_to_string(path)
            .map_err(|e| format!("failed to read baseline {}: {e}", path.display()))?;

        serde_json::from_str(&raw)
            .map_err(|e| format!("invalid baseline JSON: {e}"))
    }
}

#[cfg(test)]
mod tests {
    use super::PersistedBaseline;

    #[test]
    fn baseline_round_trips_through_json() {
        let baseline = PersistedBaseline {
            cpu_load_pct: 22.5,
            memory_load_pct: 31.0,
            temperature_c: 38.0,
            network_kbps: 450.0,
            auth_failures: 0.5,
            battery_pct: 88.0,
            integrity_drift: 0.02,
            observed_samples: 12,
        };

        let json = serde_json::to_string_pretty(&baseline).unwrap();
        let loaded: PersistedBaseline = serde_json::from_str(&json).unwrap();
        assert_eq!(loaded.observed_samples, 12);
        assert!((loaded.cpu_load_pct - 22.5).abs() < 0.001);
    }
}
