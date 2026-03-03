# Architecture

## Runtime pipeline

The current SentinelEdge prototype follows a simple edge-first control loop:

1. **Telemetry ingestion**
   - CSV samples are parsed into typed `TelemetrySample` records.
2. **Adaptive baseline + anomaly scoring**
   - An `AnomalyDetector` maintains an EWMA-like baseline for "normal" behavior.
   - Deviations across CPU, memory, temperature, bandwidth, auth failures, and integrity drift are weighted into a single anomaly score.
3. **Policy evaluation**
   - A `PolicyEngine` converts the anomaly signal into a threat level and response action.
   - Battery level can soften heavy-handed actions to support graceful degradation on constrained devices.
4. **Audit trail**
   - Every detection and response step is chained into an append-only audit log with a deterministic hash link.

## Implemented modules

- `src/telemetry.rs`
  - input parsing and sample validation
- `src/detector.rs`
  - adaptive scoring logic and anomaly explanations
- `src/policy.rs`
  - response mapping for nominal/elevated/severe/critical states
- `src/audit.rs`
  - tamper-evident run log chaining
- `src/runtime.rs`
  - orchestration, summaries, and CLI-facing report rendering

## Mapping to the research blueprint

This first milestone intentionally implements the smallest useful slice of the larger blueprint:

- **R01 Learned Multi-Modal Anomaly Detection**
  - Implemented as a practical adaptive detector foundation.
  - Missing: on-device continual learning, differential privacy, and proof generation.
- **R05 Model Poisoning Detection and Self-Recovery**
  - Partially scaffolded through the `integrity_drift` signal and forced critical escalation.
  - Missing: spectral poisoning analysis, verified checkpoint rollback, and recovery proofs.
- **R06 Energy-Aware Verifiable Isolation**
  - Partially scaffolded via battery-aware policy downgrades.
  - Missing: formal proof machinery and device-level isolation enforcement.
- **R09 Adaptive Response Strength**
  - Partially implemented through response selection based on score and battery.
- **R10 Verifiable Rollback and Forensic Recovery**
  - Partially scaffolded through the audit chain and "rollback" action semantics.
  - Missing: real snapshots, restore, and proof of restoration.
- **R11 Post-Quantum Secure Audit Logs**
  - Only the audit-log shape is implemented today.
  - Missing: cryptographic and post-quantum signatures.

## Design principle

The code is honest about scope:

- implemented features run now
- partially implemented features expose hooks and semantics
- advanced tracks remain explicit backlog items instead of implied promises
