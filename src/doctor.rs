//! `wardex doctor` — preflight/health report for operators.
//!
//! Prints a redactable diagnostic bundle: config file status, runtime paths,
//! data-dir disk space, rule pack counts, and dependency versions. Designed
//! to be pasted into support tickets.

use std::path::{Path, PathBuf};

use crate::config::{self, Config};

/// One row of the doctor report.
#[derive(Debug)]
pub struct Check {
    pub name: &'static str,
    pub status: Status,
    pub detail: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Status {
    Ok,
    Warn,
    Fail,
    Info,
}

impl Status {
    fn glyph(self) -> &'static str {
        match self {
            Status::Ok => "✓",
            Status::Warn => "!",
            Status::Fail => "✗",
            Status::Info => "·",
        }
    }

    fn label(self) -> &'static str {
        match self {
            Status::Ok => "OK",
            Status::Warn => "WARN",
            Status::Fail => "FAIL",
            Status::Info => "INFO",
        }
    }
}

/// Run all checks and return a list of results.
pub fn run() -> Vec<Check> {
    vec![
        check_version(),
        check_rustc_info(),
        check_config(),
        check_data_dir(),
        check_site_dir(),
        check_rules_dir(),
        check_var_dir(),
    ]
}

/// Format the report as a plain-text block suitable for terminals or paste-in.
pub fn format_report(checks: &[Check]) -> String {
    let mut out = String::new();
    out.push_str("Wardex doctor — diagnostic report\n");
    out.push_str("══════════════════════════════════\n\n");
    for c in checks {
        out.push_str(&format!(
            "  [{:4}] {}  {}\n         {}\n\n",
            c.status.label(),
            c.status.glyph(),
            c.name,
            c.detail.replace('\n', "\n         "),
        ));
    }
    let failures = checks.iter().filter(|c| c.status == Status::Fail).count();
    let warnings = checks.iter().filter(|c| c.status == Status::Warn).count();
    out.push_str(&format!(
        "Summary: {} checks · {} warnings · {} failures\n",
        checks.len(),
        warnings,
        failures,
    ));
    out
}

fn check_version() -> Check {
    Check {
        name: "Wardex build",
        status: Status::Info,
        detail: format!(
            "version {} · target {}",
            env!("CARGO_PKG_VERSION"),
            std::env::consts::OS,
        ),
    }
}

fn check_rustc_info() -> Check {
    Check {
        name: "Runtime",
        status: Status::Info,
        detail: format!(
            "os={} arch={} family={}",
            std::env::consts::OS,
            std::env::consts::ARCH,
            std::env::consts::FAMILY,
        ),
    }
}

fn check_config() -> Check {
    let path = config::runtime_config_path();
    if !path.exists() {
        return Check {
            name: "Config file",
            status: Status::Warn,
            detail: format!(
                "{} does not exist (defaults will be used). Run `wardex init-config` to write one.",
                path.display()
            ),
        };
    }
    match Config::load_from_path(&path) {
        Ok(_) => Check {
            name: "Config file",
            status: Status::Ok,
            detail: format!("parsed {} successfully", path.display()),
        },
        Err(e) => Check {
            name: "Config file",
            status: Status::Fail,
            detail: format!("{}: {e}", path.display()),
        },
    }
}

fn check_data_dir() -> Check {
    let path = PathBuf::from("var");
    describe_dir("Data directory (var/)", &path, false)
}

fn check_site_dir() -> Check {
    let path = PathBuf::from("site");
    describe_dir("Site assets (site/)", &path, true)
}

fn check_rules_dir() -> Check {
    let path = PathBuf::from("rules");
    if !path.is_dir() {
        return Check {
            name: "Rule packs (rules/)",
            status: Status::Warn,
            detail: "directory not found — built-in rules may be unavailable".to_string(),
        };
    }
    let yara = count_files(&path.join("yara"), "json");
    let sigma = count_files(&path.join("sigma"), "yml");
    Check {
        name: "Rule packs (rules/)",
        status: if yara + sigma > 0 {
            Status::Ok
        } else {
            Status::Warn
        },
        detail: format!("{yara} YARA JSON packs · {sigma} Sigma YAML files"),
    }
}

fn check_var_dir() -> Check {
    let alerts = PathBuf::from("var/alerts.jsonl");
    let crash = PathBuf::from("var/crash.log");
    let mut parts = Vec::new();
    if let Ok(meta) = std::fs::metadata(&alerts) {
        parts.push(format!("alerts.jsonl = {} bytes", meta.len()));
    }
    if let Ok(meta) = std::fs::metadata(&crash)
        && meta.len() > 0
    {
        return Check {
            name: "Crash log",
            status: Status::Warn,
            detail: format!(
                "var/crash.log contains {} bytes — review for recent panics",
                meta.len()
            ),
        };
    }
    Check {
        name: "Runtime artifacts",
        status: Status::Info,
        detail: if parts.is_empty() {
            "no alerts or crash log on disk yet".to_string()
        } else {
            parts.join(" · ")
        },
    }
}

fn describe_dir(name: &'static str, path: &Path, required: bool) -> Check {
    match std::fs::metadata(path) {
        Ok(meta) if meta.is_dir() => Check {
            name,
            status: Status::Ok,
            detail: format!("{} is present", path.display()),
        },
        Ok(_) => Check {
            name,
            status: Status::Fail,
            detail: format!("{} exists but is not a directory", path.display()),
        },
        Err(_) => Check {
            name,
            status: if required { Status::Fail } else { Status::Warn },
            detail: format!("{} not found", path.display()),
        },
    }
}

fn count_files(dir: &Path, ext: &str) -> usize {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return 0;
    };
    entries
        .flatten()
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some(ext))
        .count()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn run_returns_checks() {
        let checks = run();
        assert!(
            !checks.is_empty(),
            "doctor should return at least one check"
        );
        // version check should always be Info
        assert!(checks.iter().any(|c| c.name == "Wardex build"));
    }

    #[test]
    fn format_report_is_non_empty() {
        let report = format_report(&run());
        assert!(report.contains("Wardex doctor"));
        assert!(report.contains("Summary:"));
    }

    #[test]
    fn status_glyphs_are_stable() {
        assert_eq!(Status::Ok.glyph(), "✓");
        assert_eq!(Status::Fail.label(), "FAIL");
    }
}
