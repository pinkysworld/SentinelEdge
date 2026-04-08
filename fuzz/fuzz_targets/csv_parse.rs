#![no_main]
use libfuzzer_sys::fuzz_target;
use wardex::telemetry::TelemetrySample;

fuzz_target!(|data: &[u8]| {
    if let Ok(s) = std::str::from_utf8(data) {
        for (i, line) in s.lines().enumerate() {
            let _ = TelemetrySample::parse_line(line, i + 1);
        }
    }
});
