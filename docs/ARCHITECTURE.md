# Architecture

## Runtime pipeline

The current SentinelEdge prototype follows a simple edge-first control loop:

1. **Telemetry ingestion**
   - CSV or JSONL samples are parsed into typed `TelemetrySample` records.
   - Format auto-detected by file extension. Both legacy 8-column and extended 10-column CSV are supported.
2. **Adaptive baseline + anomaly scoring**
   - An `AnomalyDetector` maintains an EWMA-like baseline for "normal" behavior.
   - Deviations across CPU, memory, temperature, bandwidth, auth failures, integrity drift, process count, and disk pressure are weighted into a single anomaly score.
   - Baselines can be persisted between runs and reloaded on startup.
3. **Policy evaluation**
   - A `PolicyEngine` converts the anomaly signal into a threat level and response action.
   - Battery level can soften heavy-handed actions to support graceful degradation on constrained devices.
4. **Response execution**
   - Pluggable `ActionAdapter` trait implementations (throttle, quarantine, isolate, logging) execute the decided response.
   - A `CompositeAdapter` chains multiple adapters for multi-stage enforcement.
5. **Audit trail**
   - Every detection and response step is chained into an append-only audit log with SHA-256 cryptographic hash links.
   - Signed checkpoints are inserted at configurable intervals.
   - Chain integrity can be verified programmatically.
6. **Rollback checkpoints**
   - A bounded `CheckpointStore` captures detector state snapshots when severe/critical thresholds are crossed.
   - Enables future rollback to a known-good state after suspected compromise.
7. **Output**
   - Console reports with per-sample detail.
   - Structured JSON reports for SIEM ingestion.
   - JSONL streaming output for alert-only events.
   - Forensic evidence bundles combining audit log, summary, and checkpoints.

## Implemented modules

- `src/config.rs`
  - TOML/JSON configuration loading and serialization
- `src/telemetry.rs`
  - CSV and JSONL input parsing with field validation
- `src/detector.rs`
  - adaptive scoring logic, anomaly explanations, baseline persistence
- `src/policy.rs`
  - response mapping for nominal/elevated/severe/critical states
- `src/actions.rs`
  - pluggable device action adapters (throttle, quarantine, isolate, logging)
- `src/audit.rs`
  - SHA-256 cryptographic digest chain with signed checkpoints and chain verification
- `src/baseline.rs`
  - serializable baseline state for persistence between runs
- `src/checkpoint.rs`
  - bounded rollback checkpoint ring buffer
- `src/report.rs`
  - structured JSON and JSONL report generation for SIEM
- `src/forensics.rs`
  - forensic evidence bundle exporter
- `src/runtime.rs`
  - orchestration, summaries, and CLI-facing report rendering

## Mapping to the research blueprint

The codebase now covers Phases 0–2 and partial Phase 3 of the backlog. Here is how the implementation maps to the research tracks:

- **R01 Learned Multi-Modal Anomaly Detection**
  - Implemented as a practical adaptive detector foundation with 8 signal dimensions.
  - Missing: on-device continual learning, differential privacy, and proof generation.
- **R05 Model Poisoning Detection and Self-Recovery**
  - Partially scaffolded through `integrity_drift`, forced critical escalation, and rollback checkpoints.
  - Missing: spectral poisoning analysis, verified checkpoint rollback, and recovery proofs.
- **R06 Energy-Aware Verifiable Isolation**
  - Scaffolded via battery-aware policy downgrades and pluggable action adapters.
  - Missing: formal proof machinery and hardware-level isolation enforcement.
- **R09 Adaptive Response Strength**
  - Implemented through response selection based on score and battery, with pluggable adapter chain.
- **R10 Verifiable Rollback and Forensic Recovery**
  - Checkpoints captured on severe/critical events. Forensic bundle export available.
  - Missing: real device state restore and cryptographic proof of restoration.
- **R11 Post-Quantum Secure Audit Logs**
  - SHA-256 cryptographic digest chain with signed checkpoints and chain verification.
  - Missing: post-quantum signature algorithms.
- **R13 Regulatory-Compliant Verifiable Export**
  - Forensic bundle export and structured JSON reports provide a foundation.
  - Missing: selective disclosure and ZK-based redaction.

## Design principle

The code is honest about scope:

- implemented features run now
- partially implemented features expose hooks and semantics
- advanced tracks remain explicit backlog items instead of implied promises
