# Changelog

All notable changes to SentinelEdge are documented in this file.

## [0.7.0] — 2025-07-18

### Added
- **Explainable anomaly attribution** (T080): per-signal contribution breakdown in `AnomalySignal` — each signal dimension's weighted score contribution is captured and included in JSON reports.
- **Config validation** (T081): `Config::validate()` checks threshold ordering (critical > severe > elevated), smoothing in [0.0, 1.0], non-zero warmup, and checkpoint interval. Called automatically on config load.
- **Anomaly correlation engine** (T082): Pearson-based multi-signal co-movement detection across replay buffer windows with co-rising signal identification.
- **Temporal-logic runtime monitor** (T083): lightweight SentinelTL property checker supporting safety (`always P`) and bounded-liveness (`within N samples P`) properties over live event streams.
- **Adversarial test harness** (T084): grammar-based evasion fuzzer with SlowDrip, BurstMask, and DriftInject strategies, decision-surface coverage metrics, and evasion rate measurement.
- 27 new unit tests across `detector`, `config`, `correlation`, `monitor`, and `harness` modules (96 total: 82 unit + 14 integration).
- Three new source modules: `correlation.rs`, `monitor.rs`, `harness.rs`.

## [0.6.0] — 2026-03-28

### Added
- 14 end-to-end HTTP API integration tests (`tests/api_integration.rs`)
- 10,000-sample benchmark test validating detector performance at scale
- Auto-refresh exponential backoff with resume button in admin console
- Research-track status table (40 tracks) in admin console with badge styling
- Collapsible partially-wired and not-implemented detail lists in status panel
- `FEATURES.md` one-page marketing summary
- `CHANGELOG.md`

### Changed
- CI matrix expanded to Linux, macOS, and Windows with `cargo clippy` and `cargo fmt`
- Version bumped from 0.1.0 to 0.6.0; license set to MIT
- Analyze and run-demo endpoints now feed the live detector baseline (enables meaningful checkpoints)
- Server request loop extracted into `serve_loop` with `spawn_test_server` for integration testing
- `StatusManifest` now includes `research_tracks` field with all 40 R-tracks

### Fixed
- Checkpoint save returned 0 on fresh detector — now works after any analysis run
- `PersistedBaseline` now persists `process_count` and `disk_pressure_pct` (previously lost on checkpoint restore)
- CSV header detection uses exact match against known headers instead of fragile alphabetic heuristic
- Removed panicking `unwrap()` on JSON round-trips in run-demo and analyze handlers; store `JsonReport` directly
- Three endpoints now return HTTP 500 on serialization failure instead of empty 200 responses
- CSV parse error messages now report correct original line numbers
- `auth_burst_detected()` uses `u64` accumulator to prevent overflow on large `auth_failures` sums
- Ring buffers (`ReplayBuffer`, `CheckpointStore`) guard against capacity=0 edge case
- `ProofRegistry::verify()` renamed to `contains()` to avoid implying cryptographic verification
- `network_kbps` and `temperature_c` now reject NaN and Infinity values during validation
- `decay_rate` parameter validated (must be finite, 0.0–1.0) in `/api/control/mode` endpoint
- Admin console enforces 10 MB file size limit on uploads

## [0.5.0] — 2026-03-27

### Added
- Checkpoint save/restore via API (3 new endpoints)
- CSV report export from admin console
- Threat-level filter dropdown in admin console
- Improved connection error messages (auth failure, server offline, HTTP codes)
- Auto-detecting CSV column count (8 or 10 columns)
- 2 new checkpoint restore tests (54 total unit tests)

### Fixed
- CLI command count corrected to 8 across all files
- Redundant CSV parsing in analyze endpoint removed

## [0.4.0] — 2026-03-25

### Added
- Admin console auto-refresh (5 s polling) with connection status indicator
- Drag-and-drop JSONL/CSV file upload for custom analysis
- Decay rate slider for adaptation control
- Dark mode support via `prefers-color-scheme: dark`
- CORS hardened to `http://localhost` with `Vary: Origin`

## [0.3.0] — 2026-03-12

### Added
- All 17 Rust modules with 52 unit tests
- 10-stage pipeline: ingest → parse → detect → decide → act → audit → checkpoint → replay → benchmark → report
- HTTP server with token-authenticated REST API
- Browser admin console and GitHub Pages site
- 8 CLI commands (demo, analyze, report, init-config, status, status-json, serve, help)
- Research documents for phases 5–7 (40 tracks across 7 categories)
