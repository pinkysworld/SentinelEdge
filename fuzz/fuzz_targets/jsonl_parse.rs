#![no_main]
use libfuzzer_sys::fuzz_target;
use wardex::telemetry::TelemetrySample;

fuzz_target!(|data: &[u8]| {
    if let Ok(s) = std::str::from_utf8(data) {
        for line in s.lines() {
            let _ = serde_json::from_str::<TelemetrySample>(line);
        }
    }
});
