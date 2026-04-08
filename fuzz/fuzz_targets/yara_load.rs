#![no_main]
use libfuzzer_sys::fuzz_target;
use wardex::yara_engine::YaraEngine;

fuzz_target!(|data: &[u8]| {
    if let Ok(s) = std::str::from_utf8(data) {
        let mut engine = YaraEngine::new();
        let _ = engine.load_rules_json(s);
    }
});
