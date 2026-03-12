use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Runtime configuration loaded from TOML or JSON.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    pub detector: DetectorSettings,
    pub policy: PolicySettings,
    pub output: OutputSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct DetectorSettings {
    pub warmup_samples: usize,
    pub smoothing: f32,
    pub learn_threshold: f32,
    pub cpu_spike_scale: f32,
    pub memory_spike_scale: f32,
    pub thermal_scale: f32,
    pub network_burst_scale: f32,
    pub auth_surge_scale: f32,
    pub integrity_drift_scale: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct PolicySettings {
    pub elevated_score: f32,
    pub severe_score: f32,
    pub critical_score: f32,
    pub critical_drift: f32,
    pub low_battery_pct: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct OutputSettings {
    pub audit_path: String,
    pub report_path: Option<String>,
    pub baseline_path: Option<String>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            detector: DetectorSettings::default(),
            policy: PolicySettings::default(),
            output: OutputSettings::default(),
        }
    }
}

impl Default for DetectorSettings {
    fn default() -> Self {
        Self {
            warmup_samples: 4,
            smoothing: 0.22,
            learn_threshold: 1.35,
            cpu_spike_scale: 18.0,
            memory_spike_scale: 14.0,
            thermal_scale: 7.0,
            network_burst_scale: 1800.0,
            auth_surge_scale: 3.0,
            integrity_drift_scale: 0.06,
        }
    }
}

impl Default for PolicySettings {
    fn default() -> Self {
        Self {
            elevated_score: 1.4,
            severe_score: 3.0,
            critical_score: 5.2,
            critical_drift: 0.45,
            low_battery_pct: 20.0,
        }
    }
}

impl Default for OutputSettings {
    fn default() -> Self {
        Self {
            audit_path: "var/last-run.audit.log".into(),
            report_path: None,
            baseline_path: None,
        }
    }
}

impl Config {
    pub fn load(path: &Path) -> Result<Self, String> {
        let raw = fs::read_to_string(path)
            .map_err(|e| format!("failed to read config {}: {e}", path.display()))?;

        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("toml");

        match ext {
            "json" => serde_json::from_str(&raw)
                .map_err(|e| format!("invalid JSON config: {e}")),
            _ => toml::from_str(&raw)
                .map_err(|e| format!("invalid TOML config: {e}")),
        }
    }

    pub fn write_default_toml(path: &Path) -> Result<(), String> {
        let content = toml::to_string_pretty(&Config::default())
            .map_err(|e| format!("failed to serialize default config: {e}"))?;

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create config directory: {e}"))?;
        }

        fs::write(path, content)
            .map_err(|e| format!("failed to write default config: {e}"))
    }
}

#[cfg(test)]
mod tests {
    use super::Config;

    #[test]
    fn default_config_round_trips_through_toml() {
        let config = Config::default();
        let serialized = toml::to_string_pretty(&config).unwrap();
        let deserialized: Config = toml::from_str(&serialized).unwrap();
        assert_eq!(deserialized.detector.warmup_samples, 4);
        assert!((deserialized.detector.smoothing - 0.22).abs() < 0.001);
    }

    #[test]
    fn default_config_round_trips_through_json() {
        let config = Config::default();
        let serialized = serde_json::to_string_pretty(&config).unwrap();
        let deserialized: Config = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.policy.low_battery_pct, 20.0);
    }
}
