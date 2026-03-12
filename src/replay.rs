use std::collections::VecDeque;

use crate::telemetry::TelemetrySample;

/// A bounded ring buffer of recent telemetry samples for replaying
/// through the detector (e.g. for local retraining or statistical
/// analysis). Oldest samples are evicted when capacity is reached.
#[derive(Debug, Clone)]
pub struct ReplayBuffer {
    capacity: usize,
    samples: VecDeque<TelemetrySample>,
}

impl ReplayBuffer {
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity: capacity.max(1),
            samples: VecDeque::with_capacity(capacity),
        }
    }

    /// Push a sample into the buffer, evicting the oldest if full.
    pub fn push(&mut self, sample: TelemetrySample) {
        if self.samples.len() >= self.capacity {
            self.samples.pop_front();
        }
        self.samples.push_back(sample);
    }

    /// Return the most recent `n` samples (or fewer if not enough).
    pub fn window(&self, n: usize) -> Vec<&TelemetrySample> {
        let start = self.samples.len().saturating_sub(n);
        self.samples.range(start..).collect()
    }

    /// Iterate over all buffered samples in insertion order.
    pub fn iter(&self) -> impl Iterator<Item = &TelemetrySample> {
        self.samples.iter()
    }

    /// Drain all samples, returning them and leaving the buffer empty.
    pub fn drain(&mut self) -> Vec<TelemetrySample> {
        self.samples.drain(..).collect()
    }

    pub fn len(&self) -> usize {
        self.samples.len()
    }

    pub fn is_empty(&self) -> bool {
        self.samples.is_empty()
    }

    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Compute basic descriptive statistics over the buffered window.
    pub fn stats(&self) -> Option<ReplayStats> {
        if self.samples.is_empty() {
            return None;
        }

        let n = self.samples.len() as f32;
        let mut sum_cpu = 0.0_f32;
        let mut sum_mem = 0.0_f32;
        let mut sum_auth = 0.0_f32;
        let mut sum_drift = 0.0_f32;
        let mut max_cpu = f32::MIN;
        let mut max_auth = 0_u32;

        for s in &self.samples {
            sum_cpu += s.cpu_load_pct;
            sum_mem += s.memory_load_pct;
            sum_auth += s.auth_failures as f32;
            sum_drift += s.integrity_drift;
            max_cpu = max_cpu.max(s.cpu_load_pct);
            max_auth = max_auth.max(s.auth_failures);
        }

        // Compute variance for CPU (useful for poisoning detection)
        let mean_cpu = sum_cpu / n;
        let var_cpu = self
            .samples
            .iter()
            .map(|s| (s.cpu_load_pct - mean_cpu).powi(2))
            .sum::<f32>()
            / n;

        Some(ReplayStats {
            count: self.samples.len(),
            mean_cpu: mean_cpu,
            var_cpu,
            mean_memory: sum_mem / n,
            mean_auth_failures: sum_auth / n,
            mean_integrity_drift: sum_drift / n,
            max_cpu,
            max_auth_failures: max_auth,
        })
    }
}

/// Summary statistics computed from a replay buffer window.
#[derive(Debug, Clone)]
pub struct ReplayStats {
    pub count: usize,
    pub mean_cpu: f32,
    pub var_cpu: f32,
    pub mean_memory: f32,
    pub mean_auth_failures: f32,
    pub mean_integrity_drift: f32,
    pub max_cpu: f32,
    pub max_auth_failures: u32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::telemetry::TelemetrySample;

    fn sample(ts: u64, cpu: f32) -> TelemetrySample {
        TelemetrySample {
            timestamp_ms: ts,
            cpu_load_pct: cpu,
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
    fn evicts_oldest_when_full() {
        let mut buf = ReplayBuffer::new(3);
        buf.push(sample(1, 10.0));
        buf.push(sample(2, 20.0));
        buf.push(sample(3, 30.0));
        buf.push(sample(4, 40.0));
        assert_eq!(buf.len(), 3);
        assert_eq!(buf.iter().next().unwrap().timestamp_ms, 2);
    }

    #[test]
    fn window_returns_most_recent() {
        let mut buf = ReplayBuffer::new(10);
        for i in 1..=5 {
            buf.push(sample(i, i as f32 * 10.0));
        }
        let win = buf.window(2);
        assert_eq!(win.len(), 2);
        assert_eq!(win[0].timestamp_ms, 4);
        assert_eq!(win[1].timestamp_ms, 5);
    }

    #[test]
    fn stats_computes_mean_and_variance() {
        let mut buf = ReplayBuffer::new(10);
        buf.push(sample(1, 10.0));
        buf.push(sample(2, 20.0));
        buf.push(sample(3, 30.0));
        let stats = buf.stats().unwrap();
        assert!((stats.mean_cpu - 20.0).abs() < 0.01);
        // variance of [10,20,30] = ((10-20)^2 + 0 + (30-20)^2) / 3 = 200/3 ≈ 66.67
        assert!((stats.var_cpu - 66.67).abs() < 0.1);
    }

    #[test]
    fn drain_empties_buffer() {
        let mut buf = ReplayBuffer::new(5);
        buf.push(sample(1, 10.0));
        buf.push(sample(2, 20.0));
        let drained = buf.drain();
        assert_eq!(drained.len(), 2);
        assert!(buf.is_empty());
    }
}
