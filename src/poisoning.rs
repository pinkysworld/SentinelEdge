use crate::replay::ReplayBuffer;

/// Result of running multiple poisoning heuristics over a replay window.
#[derive(Debug, Clone)]
pub struct PoisoningAnalysis {
    /// Overall suspicion score (0 = clean, higher = more suspicious).
    pub suspicion: f32,
    /// Individual heuristic results.
    pub heuristics: Vec<HeuristicResult>,
}

#[derive(Debug, Clone)]
pub struct HeuristicResult {
    pub name: &'static str,
    pub triggered: bool,
    pub score: f32,
    pub detail: String,
}

/// Run all poisoning heuristics against the replay buffer.
///
/// Returns `None` if the buffer has too few samples to analyze.
pub fn analyze(buffer: &ReplayBuffer) -> Option<PoisoningAnalysis> {
    let stats = buffer.stats()?;
    if stats.count < 5 {
        return None; // not enough data for meaningful analysis
    }

    let mut heuristics = Vec::new();

    // 1. Mean-shift detection: compare first-half vs second-half means.
    heuristics.push(mean_shift_heuristic(buffer));

    // 2. Variance spike: unusually high variance can indicate injection.
    heuristics.push(variance_spike_heuristic(&stats));

    // 3. Integrity drift accumulation: sustained non-zero drift is suspicious.
    heuristics.push(drift_accumulation_heuristic(buffer));

    // 4. Auth failure pattern: sudden bursts followed by zero may indicate
    //    a probe-then-hide attack.
    heuristics.push(auth_burst_heuristic(buffer));

    let suspicion = heuristics.iter().map(|h| h.score).sum();

    Some(PoisoningAnalysis {
        suspicion,
        heuristics,
    })
}

/// Heuristic 1: Compare the mean CPU of the first half vs second half.
/// A large shift suggests the baseline is being gradually pushed.
fn mean_shift_heuristic(buffer: &ReplayBuffer) -> HeuristicResult {
    let samples: Vec<_> = buffer.iter().collect();
    let mid = samples.len() / 2;

    let first_mean = samples[..mid]
        .iter()
        .map(|s| s.cpu_load_pct)
        .sum::<f32>()
        / mid as f32;
    let second_mean = samples[mid..]
        .iter()
        .map(|s| s.cpu_load_pct)
        .sum::<f32>()
        / (samples.len() - mid) as f32;

    let shift = (second_mean - first_mean).abs();
    let threshold = 15.0;
    let triggered = shift > threshold;
    let score = if triggered {
        (shift - threshold) / 10.0
    } else {
        0.0
    };

    HeuristicResult {
        name: "mean_shift",
        triggered,
        score,
        detail: format!(
            "first_half_mean={:.1} second_half_mean={:.1} shift={:.1}",
            first_mean, second_mean, shift
        ),
    }
}

/// Heuristic 2: High CPU variance can indicate injected noise.
fn variance_spike_heuristic(stats: &crate::replay::ReplayStats) -> HeuristicResult {
    let threshold = 200.0;
    let triggered = stats.var_cpu > threshold;
    let score = if triggered {
        (stats.var_cpu - threshold) / 100.0
    } else {
        0.0
    };

    HeuristicResult {
        name: "variance_spike",
        triggered,
        score,
        detail: format!("cpu_variance={:.1} threshold={:.1}", stats.var_cpu, threshold),
    }
}

/// Heuristic 3: Sustained integrity drift suggests config/model tampering.
fn drift_accumulation_heuristic(buffer: &ReplayBuffer) -> HeuristicResult {
    let total_drift: f32 = buffer.iter().map(|s| s.integrity_drift).sum();
    let avg_drift = total_drift / buffer.len() as f32;
    let threshold = 0.08;
    let triggered = avg_drift > threshold;
    let score = if triggered {
        (avg_drift - threshold) * 10.0
    } else {
        0.0
    };

    HeuristicResult {
        name: "drift_accumulation",
        triggered,
        score,
        detail: format!("avg_drift={:.3} threshold={:.3}", avg_drift, threshold),
    }
}

/// Heuristic 4: Burst-then-zero auth pattern (probe-then-hide).
fn auth_burst_heuristic(buffer: &ReplayBuffer) -> HeuristicResult {
    let samples: Vec<_> = buffer.iter().collect();
    let mut burst_count = 0;
    let mut had_burst = false;

    for window in samples.windows(3) {
        let a = window[0].auth_failures;
        let b = window[1].auth_failures;
        let c = window[2].auth_failures;

        // Pattern: low → high → low
        if a <= 1 && b >= 5 && c <= 1 {
            burst_count += 1;
            had_burst = true;
        }
    }

    let score = burst_count as f32 * 0.5;

    HeuristicResult {
        name: "auth_burst_pattern",
        triggered: had_burst,
        score,
        detail: format!("burst_then_zero_patterns={}", burst_count),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::replay::ReplayBuffer;
    use crate::telemetry::TelemetrySample;

    fn base_sample(ts: u64, cpu: f32, drift: f32, auth: u32) -> TelemetrySample {
        TelemetrySample {
            timestamp_ms: ts,
            cpu_load_pct: cpu,
            memory_load_pct: 30.0,
            temperature_c: 38.0,
            network_kbps: 400.0,
            auth_failures: auth,
            battery_pct: 90.0,
            integrity_drift: drift,
            process_count: 40,
            disk_pressure_pct: 5.0,
        }
    }

    #[test]
    fn clean_buffer_has_low_suspicion() {
        let mut buf = ReplayBuffer::new(20);
        for i in 0..10 {
            buf.push(base_sample(i, 20.0 + (i as f32 * 0.5), 0.01, 0));
        }
        let result = analyze(&buf).unwrap();
        assert!(result.suspicion < 0.5);
    }

    #[test]
    fn mean_shift_detects_gradual_poisoning() {
        let mut buf = ReplayBuffer::new(20);
        for i in 0..5 {
            buf.push(base_sample(i, 20.0, 0.01, 0));
        }
        for i in 5..10 {
            buf.push(base_sample(i, 55.0, 0.01, 0)); // shifted
        }
        let result = analyze(&buf).unwrap();
        assert!(result.heuristics.iter().any(|h| h.name == "mean_shift" && h.triggered));
    }

    #[test]
    fn drift_accumulation_detects_tampering() {
        let mut buf = ReplayBuffer::new(20);
        for i in 0..10 {
            buf.push(base_sample(i, 25.0, 0.15, 0)); // high sustained drift
        }
        let result = analyze(&buf).unwrap();
        assert!(result
            .heuristics
            .iter()
            .any(|h| h.name == "drift_accumulation" && h.triggered));
    }

    #[test]
    fn auth_burst_pattern_detected() {
        let mut buf = ReplayBuffer::new(20);
        buf.push(base_sample(1, 20.0, 0.01, 0));
        buf.push(base_sample(2, 20.0, 0.01, 8)); // burst
        buf.push(base_sample(3, 20.0, 0.01, 0));
        buf.push(base_sample(4, 20.0, 0.01, 0));
        buf.push(base_sample(5, 20.0, 0.01, 7)); // burst
        buf.push(base_sample(6, 20.0, 0.01, 0));
        let result = analyze(&buf).unwrap();
        assert!(result
            .heuristics
            .iter()
            .any(|h| h.name == "auth_burst_pattern" && h.triggered));
    }
}
