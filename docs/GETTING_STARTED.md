# Getting Started

## Requirements

- Rust toolchain (`cargo`)
- A recent macOS, Linux, or Windows environment capable of running a single Rust binary

## Build

```bash
cargo build
```

## Run the built-in demo

```bash
cargo run -- demo
```

This executes a short internal telemetry sequence and writes an audit trail to `var/demo.audit.log`.

## Analyze a CSV telemetry trace

```bash
cargo run -- analyze examples/credential_storm.csv
```

Default audit output for `analyze` is `var/last-run.audit.log`.

## Inspect the project status snapshot

```bash
cargo run -- status
```

## Telemetry CSV format

The parser expects this exact header:

```text
timestamp_ms,cpu_load_pct,memory_load_pct,temperature_c,network_kbps,auth_failures,battery_pct,integrity_drift
```

Field notes:

- `timestamp_ms`: monotonically increasing sample timestamp
- `cpu_load_pct`: 0-100
- `memory_load_pct`: 0-100
- `temperature_c`: operating temperature in Celsius
- `network_kbps`: observed network throughput
- `auth_failures`: failed authentication attempts in the sampling window
- `battery_pct`: 0-100
- `integrity_drift`: normalized 0-1 signal for model/config drift

## What to expect from the prototype

The current runtime is intentionally compact:

- it learns a rolling baseline
- it emits anomaly scores and explanations
- it chooses a response level
- it appends a chained audit log

The advanced roadmap items in the blueprint (differential privacy, zero-knowledge proofs, swarm coordination, formal verification, Wasm policies, post-quantum signatures) are documented but not implemented yet.
