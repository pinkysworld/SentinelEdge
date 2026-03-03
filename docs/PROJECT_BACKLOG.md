# SentinelEdge Project Backlog

This backlog is designed for small, concrete follow-up tasks.

## Phase 0 - Foundation (completed this milestone)

- [x] T001: Bootstrap the Rust package and module layout.
- [x] T002: Implement CSV telemetry ingestion and validation.
- [x] T003: Implement an adaptive multi-signal anomaly detector.
- [x] T004: Implement a policy engine with battery-aware mitigation scaling.
- [x] T005: Implement a chained audit log for run forensics.
- [x] T006: Add baseline documentation and a GitHub Pages landing site.

## Phase 1 - Runtime hardening

- [ ] T010: Add TOML/JSON configuration loading for thresholds, battery policies, and output paths.
- [ ] T011: Support JSONL telemetry ingestion in addition to CSV.
- [ ] T012: Emit structured JSON reports for SIEM ingestion.
- [ ] T013: Persist and reload learned baselines between runs.
- [ ] T014: Add richer anomaly features (process count, disk pressure, sensor drift windows).
- [ ] T015: Add replayable deterministic test fixtures for benign and adversarial traces.

## Phase 2 - Device actions

- [ ] T020: Replace abstract response actions with pluggable device action adapters.
- [ ] T021: Add soft-throttle, service quarantine, and network isolate implementations behind traits.
- [ ] T022: Add rollback checkpoints for configuration and model state.
- [ ] T023: Add a forensic bundle exporter (audit log + summarized evidence).

## Phase 3 - Verifiability

- [ ] T030: Replace the prototype hash chain with a cryptographic digest chain.
- [ ] T031: Add signed audit checkpoints.
- [ ] T032: Define proof-carrying update metadata for future ZK integration.
- [ ] T033: Model the response policy as a formally checkable state machine.

## Phase 4 - Edge learning

- [ ] T040: Add a bounded replay buffer for telemetry windows.
- [ ] T041: Add incremental baseline adaptation controls (freeze, decay, retrain).
- [ ] T042: Add poisoning heuristics beyond `integrity_drift`.
- [ ] T043: Add benchmark harnesses for false-positive / false-negative tradeoffs.

## Phase 5 - Research blueprint expansion

- [ ] T050: Formalize the subset of blueprint tracks targeted for the first research paper draft.
- [ ] T051: Design a swarm-coordination protocol sketch for R03/R08/R15/R23.
- [ ] T052: Specify a Wasm extension surface for R17.
- [ ] T053: Specify supply-chain attestation inputs for R20.
- [ ] T054: Define a post-quantum logging upgrade path for R11/R21.

## Recommended next build order

1. T010-T013 to make the current runtime persist and integrate more cleanly.
2. T020-T023 to turn the prototype decisions into real device actions.
3. T030-T033 to start making the "verifiable" claims technically rigorous.
