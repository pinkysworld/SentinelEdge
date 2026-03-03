# SentinelEdge

SentinelEdge is a Rust-first edge security runtime scaffold for privacy-aware anomaly detection, policy-driven response, and verifiable auditability on constrained devices.

The research blueprint in [blueprint.md](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/blueprint.md) sketches 25 ambitious tracks. This first milestone turns that blueprint into a concrete codebase:

- a runnable Rust prototype for multi-signal anomaly scoring
- an energy-aware response policy engine
- a tamper-evident audit chain for detection and response decisions
- project docs, backlog tracking, and an accompanying GitHub Pages site

## What ships today

- **Adaptive anomaly scoring:** an EWMA-style baseline learns "normal" telemetry and scores deviations across CPU, memory, temperature, network load, authentication failures, and integrity drift.
- **Policy-driven mitigation:** response strength adapts to threat score and battery state, which gives us a practical foundation for graceful degradation on edge devices.
- **Auditable decisions:** every detection and response step is added to a chained audit log so runs can be inspected after the fact.
- **Operator-facing docs:** architecture, getting-started, backlog, and track-by-track implementation status are in [`docs/`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/README.md).

## Quick start

```bash
cargo run -- demo
```

Run the included CSV scenario:

```bash
cargo run -- analyze examples/credential_storm.csv
```

Inspect the current implementation snapshot:

```bash
cargo run -- status
```

Run tests:

```bash
cargo test
```

## Repository layout

```text
src/                  Rust runtime prototype
examples/             Sample telemetry traces
docs/                 Design notes, backlog, and status documentation
site/                 Static GitHub Pages site
.github/workflows/    CI and Pages deployment
blueprint.md          Original research track ideation
```

## Documentation

Start with [`docs/README.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/README.md).

Key documents:

- [`docs/GETTING_STARTED.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/GETTING_STARTED.md)
- [`docs/ARCHITECTURE.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/ARCHITECTURE.md)
- [`docs/STATUS.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/STATUS.md)
- [`docs/PROJECT_BACKLOG.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/PROJECT_BACKLOG.md)
- [`docs/RESEARCH_TRACKS.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/RESEARCH_TRACKS.md)

## GitHub Pages

The static landing page lives in `site/`, and the Pages workflow publishes it automatically on pushes to `main`.

## License

TBD (recommended next step: MIT or Apache-2.0).
