# WASM Extension Tutorial

Build custom detection and response logic as sandboxed WebAssembly modules
that run inside the Wardex runtime.

> **Prerequisites:** Rust toolchain (1.85+), `wasm32-unknown-unknown` target,
> a running Wardex instance.

---

## 1. Install the Wasm target

```bash
rustup target add wasm32-unknown-unknown
```

## 2. Create a detector plugin

```bash
cargo new --lib my_detector
cd my_detector
```

Edit `Cargo.toml`:

```toml
[package]
name = "my_detector"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[profile.release]
opt-level = "s"
lto = true
```

## 3. Implement the plugin interface

Edit `src/lib.rs`:

```rust
//! Custom detector plugin — detects auth failure spikes.

use core::slice;

// ── Imported host functions ────────────────────────────────────────
extern "C" {
    /// Log a message to the Wardex audit log.
    /// severity: 0 = debug, 1 = info, 2 = warn
    fn log(severity: i32, msg_ptr: *const u8, msg_len: i32);

    /// Read the current baseline mean for dimension `dim`.
    fn baseline_mean(dim: i32) -> f32;
}

// ── Helper: write a log message ────────────────────────────────────
fn host_log(severity: i32, msg: &str) {
    unsafe { log(severity, msg.as_ptr(), msg.len() as i32) }
}

// ── Exported functions ─────────────────────────────────────────────

static mut THRESHOLD: f32 = 5.0;

/// Called once at startup. Parse config JSON for the threshold.
#[no_mangle]
pub extern "C" fn init(config_ptr: *const u8, config_len: i32) -> i32 {
    let config = unsafe { slice::from_raw_parts(config_ptr, config_len as usize) };
    if let Ok(s) = core::str::from_utf8(config) {
        // Minimal JSON parse: look for "threshold":
        if let Some(pos) = s.find("\"threshold\"") {
            if let Some(colon) = s[pos..].find(':') {
                let rest = s[pos + colon + 1..].trim();
                let end = rest.find(|c: char| !c.is_ascii_digit() && c != '.')
                    .unwrap_or(rest.len());
                if let Ok(v) = rest[..end].parse::<f32>() {
                    unsafe { THRESHOLD = v; }
                }
            }
        }
        host_log(1, &format!("auth-detector init, threshold={}", unsafe { THRESHOLD }));
    }
    0 // success
}

/// Called for each telemetry sample. Returns a score adjustment.
///
/// TelemetrySample layout (little-endian, 80 bytes):
///   offset 24: auth_failures (u32)
#[no_mangle]
pub extern "C" fn evaluate(sample_ptr: *const u8, sample_len: i32) -> f32 {
    if sample_len < 28 {
        return 0.0;
    }
    let sample = unsafe { slice::from_raw_parts(sample_ptr, sample_len as usize) };

    // Read auth_failures at offset 24 (u32 little-endian)
    let auth_failures = u32::from_le_bytes([
        sample[24], sample[25], sample[26], sample[27],
    ]);

    // Compare against the baseline
    let baseline = unsafe { baseline_mean(4) }; // dim 4 = auth_failures
    let threshold = unsafe { THRESHOLD };
    let delta = auth_failures as f32 - baseline;

    if delta > threshold {
        let score = ((delta - threshold) / threshold).min(10.0);
        host_log(2, &format!(
            "auth spike: {} failures (baseline={:.1}, delta={:.1})",
            auth_failures, baseline, delta
        ));
        score
    } else {
        0.0
    }
}

/// Return a human-readable reason string for the last evaluation.
#[no_mangle]
pub extern "C" fn explain(buf_ptr: *mut u8, buf_len: i32) -> i32 {
    let msg = b"Auth failure count exceeds baseline";
    let copy_len = msg.len().min(buf_len as usize);
    unsafe {
        core::ptr::copy_nonoverlapping(msg.as_ptr(), buf_ptr, copy_len);
    }
    copy_len as i32
}
```

## 4. Build the Wasm module

```bash
cargo build --target wasm32-unknown-unknown --release
```

The compiled module will be at:
```
target/wasm32-unknown-unknown/release/my_detector.wasm
```

Optionally strip debug info to reduce size:
```bash
wasm-strip target/wasm32-unknown-unknown/release/my_detector.wasm
```

## 5. Deploy to Wardex

Copy the `.wasm` file into your Wardex plugins directory:

```bash
cp target/wasm32-unknown-unknown/release/my_detector.wasm \
   /opt/wardex/plugins/auth_detector.wasm
```

Add the plugin to your Wardex configuration (`wardex.toml`):

```toml
[[wasm.plugins]]
name       = "auth-spike-detector"
type       = "detector"
path       = "plugins/auth_detector.wasm"
config     = '{"threshold": 5}'
priority   = 10
enabled    = true
```

Restart or reload Wardex:

```bash
wardex reload
# or
systemctl restart wardex
```

## 6. Verify it's loaded

```bash
curl -s http://localhost:3000/api/wasm/plugins | jq .
```

Expected output:
```json
[
  {
    "name": "auth-spike-detector",
    "type": "detector",
    "status": "loaded",
    "fuel_remaining": 1000000,
    "memory_pages": 16
  }
]
```

---

## Response Plugin Example

Response plugins can override the built-in policy decision. Here's a
plugin that forces isolation when battery is critically low:

```rust
use core::slice;

extern "C" {
    fn log(severity: i32, msg_ptr: *const u8, msg_len: i32);
    fn battery_pct() -> f32;
}

fn host_log(severity: i32, msg: &str) {
    unsafe { log(severity, msg.as_ptr(), msg.len() as i32) }
}

#[no_mangle]
pub extern "C" fn init(_ptr: *const u8, _len: i32) -> i32 { 0 }

/// Returns action override:
///   0 = no override
///   1 = observe
///   2 = throttle
///   3 = quarantine
///   4 = isolate
#[no_mangle]
pub extern "C" fn adjust(
    _signal_ptr: *const u8, _signal_len: i32,
    _decision_ptr: *const u8, _decision_len: i32,
) -> i32 {
    let battery = unsafe { battery_pct() };
    if battery < 10.0 {
        host_log(2, "Battery critical — forcing isolation");
        4 // isolate
    } else if battery < 20.0 {
        host_log(1, "Battery low — forcing throttle");
        2 // throttle
    } else {
        0 // no override
    }
}
```

Deploy the same way with `type = "response"` in the config.

---

## Resource Limits

| Resource | Default | Config key |
|----------|---------|------------|
| Memory | 1 MiB (16 pages) | `wasm.max_memory_pages` |
| Fuel (instructions) | 1,000,000 per call | `wasm.max_fuel` |
| Stack depth | 256 frames | — |

When a plugin exceeds its fuel budget, execution is trapped and the
host falls back to the built-in result. The trap is logged in the
audit trail.

## Data Exchange Format

All data is passed as flat binary structs (little-endian, no JSON
parsing in Wasm):

| Struct | Size | Key fields |
|--------|------|------------|
| `TelemetrySample` | 80 B | timestamp, cpu, memory, temp, network, auth_failures, battery, integrity_drift, process_count, disk_pressure |
| `AnomalySignal` | 24 B | score, confidence, suspicious_axes |
| `PolicyDecision` | 16 B | level, action, isolation_pct |

See [DESIGN_WASM_EXTENSIONS.md](DESIGN_WASM_EXTENSIONS.md) for full
byte-level layout.

## Security Model

- **Memory isolation:** Wasm linear memory — plugins cannot access host memory
- **No filesystem:** No WASI filesystem imports
- **No networking:** No WASI socket imports
- **Bounded execution:** Fuel metering with trap on exhaustion
- **Audit trail:** Every plugin call and trap is recorded

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Plugin not listed in `/api/wasm/plugins` | Path wrong or file not readable | Check `path` in config, file permissions |
| `status: "trapped"` | Plugin exceeded fuel budget | Increase `wasm.max_fuel` or optimize plugin |
| `status: "init_failed"` | `init()` returned non-zero | Check plugin logs, validate config JSON |
| Score not changing | `evaluate()` returns 0.0 | Add logging, check threshold vs baseline |
