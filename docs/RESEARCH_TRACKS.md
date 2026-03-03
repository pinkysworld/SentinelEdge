# Research Tracks Status Map

This document translates the raw ideas in [`blueprint.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/blueprint.md) into an implementation-aware status map.

Legend:

- **Implemented foundation**: there is already runnable code covering the basic control-loop shape.
- **Scaffolded**: the repo contains semantics or hooks, but not the research-grade mechanism.
- **Planned**: documented and backlog-tracked, but not started in code.
- **Future**: visible in the roadmap, but intentionally deferred until the core runtime matures.

## Core detection and fusion

- **R01 Learned Multi-Modal Anomaly Detection with On-Device Continual Learning** - **Implemented foundation**
  - Adaptive multi-signal anomaly scoring exists; continual learning, privacy, and proofs do not.
- **R02 Formal Verification of Detection Rules with Runtime Checking** - **Planned**
- **R03 Cross-Device Swarm Intelligence for Collective Anomaly Detection** - **Future**
- **R04 Quantum-Inspired Anomaly Propagation Modeling** - **Future**
- **R05 On-Device Model Poisoning Detection and Self-Recovery** - **Scaffolded**
  - `integrity_drift` and critical escalation exist; poisoning analysis and recovery are not implemented.

## Response and mitigation

- **R06 Energy-Aware Verifiable Isolation with Graceful Degradation** - **Scaffolded**
  - Energy-aware downgrade logic exists; verifiable isolation does not.
- **R07 Self-Healing Network Reconfiguration with ZK Proofs** - **Planned**
- **R08 Privacy-Preserving Coordinated Response Across Devices** - **Future**
- **R09 Adaptive Response Strength Based on Threat Severity and Battery State** - **Implemented foundation**
- **R10 Verifiable Rollback and Forensic Recovery** - **Scaffolded**
  - Rollback is represented as a policy action and the audit trail is present; state snapshots are missing.

## Verifiability and audit

- **R11 Post-Quantum Secure Audit Logs** - **Scaffolded**
  - The audit chain is present, but no post-quantum signatures are implemented.
- **R12 Zero-Knowledge Proof of Entire Device State at Time T** - **Future**
- **R13 Regulatory-Compliant Verifiable Export with Selective Disclosure** - **Planned**
- **R14 Long-Term Archival with Energy-Harvesting Optimization** - **Future**
- **R15 Cross-Device Verifiable Threat Intelligence Sharing** - **Future**

## Advanced and forward-looking

- **R16 On-Device Hardware Root-of-Trust Integration** - **Planned**
- **R17 Wasm-Based Extensible Detection and Response Policies** - **Planned**
- **R18 Energy-Proportional Model Quantization with Verifiability** - **Future**
- **R19 Learned False-Positive Reduction with Causal Reasoning** - **Future**
- **R20 Verifiable Supply-Chain Attestation for Firmware and Models** - **Planned**
- **R21 Quantum-Resistant Key Rotation with Minimal Energy Overhead** - **Future**
- **R22 Cross-Platform Binary Self-Optimization** - **Future**
- **R23 Verifiable Multi-Device Swarm Defense Coordination** - **Future**
- **R24 Energy-Harvesting Aware Security Posture Adjustment** - **Future**
- **R25 Long-Term Evolutionary Model Improvement** - **Future**

## Interpretation

The codebase now makes the project concrete, but most of the research novelty remains ahead of us. That is by design: the repo can now evolve from a stable, testable systems prototype instead of a pure idea list.
