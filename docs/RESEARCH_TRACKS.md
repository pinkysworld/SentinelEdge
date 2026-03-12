# Research Tracks Status Map

This document translates the raw ideas in [`blueprint.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/blueprint.md) into an implementation-aware status map.

Legend:

- **Implemented foundation**: there is already runnable code covering the basic control-loop shape.
- **Scaffolded**: the repo contains semantics or hooks, but not the research-grade mechanism.
- **Planned**: documented and backlog-tracked, but not started in code.
- **Future**: visible in the roadmap, but intentionally deferred until the core runtime matures.

## How to read the tracks

Each track should be read through three lenses:

- **Research idea**: the novel mechanism or systems claim the track is trying to establish.
- **Why it matters**: what capability it would unlock for a real edge-defense runtime.
- **Current repo state**: what the codebase already covers today, if anything.

The current prototype intentionally implements only the smallest useful control loop. Most of the novelty is still roadmap work, but the list below now spells out what each item would actually mean in practice.

## Core detection and fusion

- **R01 Learned Multi-Modal Anomaly Detection with On-Device Continual Learning** - **Implemented foundation**
  - Research idea: let the detector keep adapting to the device's own local patterns instead of relying on fixed thresholds or cloud retraining.
  - Why it matters: edge devices drift over time, so adaptive on-device learning is essential if anomaly detection is supposed to stay useful.
  - Current repo state: adaptive multi-signal scoring exists with a bounded replay buffer providing windowed statistics. Adaptation controls (freeze, decay, reset) support safe baseline management. Missing: continual learning loop, differential privacy, and proof-carrying update generation.
- **R02 Formal Verification of Detection Rules with Runtime Checking** - **Scaffolded**
  - Research idea: represent the detection policy as a formally specified state machine and validate runtime behavior against that specification.
  - Why it matters: it moves the system from "heuristically works" toward "we can state and check what correctness means."
  - Current repo state: a `PolicyStateMachine` records and validates all threat-level transitions against formally defined legal rules. Transition traces are exportable for future TLA+/Alloy model checking. Missing: actual TLA+/Alloy integration and automated invariant checking.
- **R03 Cross-Device Swarm Intelligence for Collective Anomaly Detection** - **Future**
  - Research idea: let multiple devices share partial threat signals and collectively detect patterns that any one node would miss.
  - Why it matters: many real attacks only become obvious when low-confidence evidence is aggregated across a fleet.
  - Current repo state: there is no cross-device communication in the prototype.
- **R04 Quantum-Inspired Anomaly Propagation Modeling** - **Future**
  - Research idea: use quantum-walk-inspired propagation models to predict how suspicious behavior may spread through a mesh or dependency graph.
  - Why it matters: it would turn SentinelEdge from purely reactive detection toward predictive isolation planning.
  - Current repo state: no propagation graph or predictive spread model exists yet.
- **R05 On-Device Model Poisoning Detection and Self-Recovery** - **Implemented foundation**
  - Research idea: detect when the local model or policy has been tampered with and recover to a known-good state.
  - Why it matters: a detector that can be poisoned without noticing is a weak security primitive.
  - Current repo state: four poisoning heuristics (mean shift, variance spike, drift accumulation, auth burst) analyze replay buffers for manipulation attempts. Adaptation controls allow freezing baselines during suspected poisoning. Rollback checkpoints are available. Missing: verified checkpoint rollback automation and recovery proofs.

## Response and mitigation

- **R06 Energy-Aware Verifiable Isolation with Graceful Degradation** - **Implemented foundation**
  - Research idea: choose mitigations that respect both security urgency and the device's energy budget, then prove the action matched policy.
  - Why it matters: edge security cannot assume desktop-class power or cooling.
  - Current repo state: energy-aware downgrade logic exists with pluggable action adapters (throttle, quarantine, isolate). Proof mechanisms are not yet implemented.
- **R07 Self-Healing Network Reconfiguration with ZK Proofs** - **Planned**
  - Research idea: after isolating compromised nodes, automatically repair the network topology while preserving security invariants.
  - Why it matters: isolation without recovery can turn defense into self-inflicted outage.
  - Current repo state: no topology model or repair engine exists yet.
- **R08 Privacy-Preserving Coordinated Response Across Devices** - **Future**
  - Research idea: let devices coordinate a shared defense action without exposing raw local telemetry.
  - Why it matters: fleet response becomes much more useful when it does not require centralized visibility into everything.
  - Current repo state: no secure multi-party coordination path exists yet.
- **R09 Adaptive Response Strength Based on Threat Severity and Battery State** - **Implemented foundation**
  - Research idea: map detection confidence and local constraints into different response intensities rather than a single fixed action.
  - Why it matters: it prevents overreaction on benign spikes and underreaction on truly dangerous events.
  - Current repo state: threat score and battery state shape the response, with pluggable adapter chain for multi-stage enforcement. Adaptation mode controls (Normal, Frozen, Decay) further refine detector sensitivity and baseline drift management.
- **R10 Verifiable Rollback and Forensic Recovery** - **Implemented foundation**
  - Research idea: restore device state to a known-safe checkpoint and preserve a verifiable record of what was changed.
  - Why it matters: recovery is far more credible when it can be replayed and audited after the incident.
  - Current repo state: rollback checkpoints are captured on severe/critical events in a bounded ring buffer. Forensic evidence bundles are exportable. Proof-carrying updates bind every baseline change with SHA-256 cryptographic evidence. Missing: real device state restore and cryptographic proof of restoration.

## Verifiability and audit

- **R11 Post-Quantum Secure Audit Logs** - **Implemented foundation**
  - Research idea: make the event history tamper-evident and signed with algorithms that remain viable in a post-quantum setting.
  - Why it matters: "verifiable security" depends on the evidence trail remaining trustworthy.
  - Current repo state: SHA-256 cryptographic digest chain with signed checkpoints and programmatic chain verification. Missing: post-quantum signature algorithms.
- **R12 Zero-Knowledge Proof of Entire Device State at Time T** - **Future**
  - Research idea: prove that a device was in a particular historical state without disclosing the underlying sensitive data.
  - Why it matters: it would allow audits and incident response without exposing full device contents.
  - Current repo state: there is no historical state proof machinery yet.
- **R13 Regulatory-Compliant Verifiable Export with Selective Disclosure** - **Scaffolded**
  - Research idea: export only the subset of logs or evidence required for a regulator while proving the rest was not altered.
  - Why it matters: many real deployments need auditability and privacy at the same time.
  - Current repo state: forensic bundle export and structured JSON reports provide a foundation. FP/FN benchmark harness enables precision/recall/F1 measurement for regulatory compliance evidence. Missing: selective disclosure and ZK-based redaction.
- **R14 Long-Term Archival with Energy-Harvesting Optimization** - **Future**
  - Research idea: defer expensive archival work until harvested energy is available, such as solar or scavenged power.
  - Why it matters: long-lived remote edge devices often operate under severe energy constraints.
  - Current repo state: there is no archival scheduler yet.
- **R15 Cross-Device Verifiable Threat Intelligence Sharing** - **Future**
  - Research idea: let nodes share threat indicators with proof of provenance and integrity.
  - Why it matters: shared signatures become more trustworthy when receivers can verify where they came from.
  - Current repo state: no threat-intelligence exchange protocol exists yet.

## Advanced and forward-looking

- **R16 On-Device Hardware Root-of-Trust Integration** - **Planned**
  - Research idea: bind critical keys or trust anchors to TPM, secure enclave, or similar hardware where available.
  - Why it matters: the runtime becomes harder to subvert when its root secrets are not just files on disk.
  - Current repo state: no hardware-attestation path exists yet.
- **R17 Wasm-Based Extensible Detection and Response Policies** - **Planned**
  - Research idea: let users ship custom detection or response logic as sandboxed Wasm modules.
  - Why it matters: it opens the project to extension without requiring forks of the core runtime.
  - Current repo state: no Wasm policy surface or sandbox exists yet.
- **R18 Energy-Proportional Model Quantization with Verifiability** - **Future**
  - Research idea: adjust model precision to save energy, while proving the detector stayed within an acceptable accuracy envelope.
  - Why it matters: edge deployments often need to trade precision for power without losing trust in the result.
  - Current repo state: the prototype does not include quantized models.
- **R19 Learned False-Positive Reduction with Causal Reasoning** - **Future**
  - Research idea: use lightweight causal models to distinguish actual threats from noisy correlations.
  - Why it matters: false positives are one of the fastest ways to make operators stop trusting a detector.
  - Current repo state: no causal inference layer exists yet.
- **R20 Verifiable Supply-Chain Attestation for Firmware and Models** - **Planned**
  - Research idea: prove that the running firmware and model artifacts match a known-good build or vendor-signed release.
  - Why it matters: it strengthens trust before runtime detection even begins.
  - Current repo state: no firmware/model attestation path exists yet.
- **R21 Quantum-Resistant Key Rotation with Minimal Energy Overhead** - **Future**
  - Research idea: rotate keys periodically using post-quantum-safe primitives without burning too much device energy.
  - Why it matters: key hygiene is essential, but heavy cryptography can be expensive on small devices.
  - Current repo state: the prototype has no key lifecycle subsystem.
- **R22 Cross-Platform Binary Self-Optimization** - **Future**
  - Research idea: let the runtime specialize itself for different target architectures and energy profiles.
  - Why it matters: the project is explicitly edge-oriented, so hardware diversity is part of the challenge.
  - Current repo state: there is no architecture-specific specialization logic yet.
- **R23 Verifiable Multi-Device Swarm Defense Coordination** - **Future**
  - Research idea: let multiple devices vote or coordinate on defensive action and prove the tally was honest.
  - Why it matters: collective defense becomes much stronger when no single node has to be blindly trusted.
  - Current repo state: there is no multi-device voting or swarm defense layer yet.
- **R24 Energy-Harvesting Aware Security Posture Adjustment** - **Future**
  - Research idea: adapt cryptographic or defensive intensity based on predicted near-term energy availability.
  - Why it matters: a node with scarce harvested power may need a different posture than one with abundant power.
  - Current repo state: there is no energy forecasting or posture scheduler yet.
- **R25 Long-Term Evolutionary Model Improvement** - **Future**
  - Research idea: let local models improve over months using bounded evolutionary search instead of one-shot training.
  - Why it matters: this is the longest-horizon path toward self-improving edge detection without permanent cloud dependence.
  - Current repo state: there is no long-horizon model adaptation system yet.

## Interpretation

The codebase now makes the project concrete, but most of the research novelty remains ahead of us. That is deliberate: SentinelEdge can grow from a stable, testable prototype while still keeping the larger research agenda explicit and legible.
