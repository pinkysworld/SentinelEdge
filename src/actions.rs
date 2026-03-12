use crate::policy::ResponseAction;
use std::fmt;

/// Trait for pluggable device action adapters.
///
/// Implementations translate abstract response actions into real
/// device-level enforcement. The default `LoggingAdapter` simply
/// records what *would* happen, making it safe for prototype and
/// test usage.
pub trait ActionAdapter: fmt::Debug {
    fn execute(&self, action: ResponseAction, isolation_pct: u8) -> ActionResult;
    fn name(&self) -> &str;
}

#[derive(Debug, Clone)]
pub struct ActionResult {
    pub adapter: String,
    pub action: ResponseAction,
    pub success: bool,
    pub detail: String,
}

/// Logs the action without performing real enforcement.
#[derive(Debug, Default)]
pub struct LoggingAdapter;

impl ActionAdapter for LoggingAdapter {
    fn execute(&self, action: ResponseAction, isolation_pct: u8) -> ActionResult {
        ActionResult {
            adapter: self.name().into(),
            action,
            success: true,
            detail: format!(
                "logged {} at {}% isolation (no enforcement)",
                action.as_str(),
                isolation_pct
            ),
        }
    }

    fn name(&self) -> &str {
        "logging"
    }
}

/// Simulates soft rate-limiting by recording throttle parameters.
#[derive(Debug, Default)]
pub struct ThrottleAdapter;

impl ActionAdapter for ThrottleAdapter {
    fn execute(&self, action: ResponseAction, isolation_pct: u8) -> ActionResult {
        let detail = match action {
            ResponseAction::Observe => "no throttle applied".into(),
            ResponseAction::RateLimit => {
                format!("soft-throttle engaged at {}% capacity reduction", isolation_pct)
            }
            ResponseAction::Quarantine => {
                format!("hard-throttle engaged with {}% isolation", isolation_pct)
            }
            ResponseAction::RollbackAndEscalate => {
                "full throttle before rollback sequence".into()
            }
        };

        ActionResult {
            adapter: self.name().into(),
            action,
            success: true,
            detail,
        }
    }

    fn name(&self) -> &str {
        "throttle"
    }
}

/// Simulates network-level quarantine enforcement.
#[derive(Debug, Default)]
pub struct QuarantineAdapter;

impl ActionAdapter for QuarantineAdapter {
    fn execute(&self, action: ResponseAction, isolation_pct: u8) -> ActionResult {
        let (success, detail) = match action {
            ResponseAction::Observe | ResponseAction::RateLimit => {
                (true, "quarantine not triggered at this threat level".into())
            }
            ResponseAction::Quarantine => (
                true,
                format!(
                    "network quarantine applied: {}% of connections severed",
                    isolation_pct
                ),
            ),
            ResponseAction::RollbackAndEscalate => (
                true,
                "full network isolation applied prior to rollback".into(),
            ),
        };

        ActionResult {
            adapter: self.name().into(),
            action,
            success,
            detail,
        }
    }

    fn name(&self) -> &str {
        "quarantine"
    }
}

/// Simulates service isolation by dropping non-essential workloads.
#[derive(Debug, Default)]
pub struct IsolateAdapter;

impl ActionAdapter for IsolateAdapter {
    fn execute(&self, action: ResponseAction, isolation_pct: u8) -> ActionResult {
        let detail = match action {
            ResponseAction::Observe => "no isolation needed".into(),
            ResponseAction::RateLimit => {
                format!("non-critical services deprioritized ({}% isolation)", isolation_pct)
            }
            ResponseAction::Quarantine => {
                format!("non-essential services suspended ({}% isolation)", isolation_pct)
            }
            ResponseAction::RollbackAndEscalate => {
                "all non-core services terminated for rollback".into()
            }
        };

        ActionResult {
            adapter: self.name().into(),
            action,
            success: true,
            detail,
        }
    }

    fn name(&self) -> &str {
        "isolate"
    }
}

/// Composite adapter that chains multiple adapters in order.
#[derive(Debug)]
pub struct CompositeAdapter {
    adapters: Vec<Box<dyn ActionAdapter>>,
}

impl CompositeAdapter {
    pub fn new(adapters: Vec<Box<dyn ActionAdapter>>) -> Self {
        Self { adapters }
    }

    pub fn default_chain() -> Self {
        Self::new(vec![
            Box::new(ThrottleAdapter),
            Box::new(QuarantineAdapter),
            Box::new(IsolateAdapter),
            Box::new(LoggingAdapter),
        ])
    }

    pub fn execute_all(&self, action: ResponseAction, isolation_pct: u8) -> Vec<ActionResult> {
        self.adapters
            .iter()
            .map(|adapter| adapter.execute(action, isolation_pct))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::policy::ResponseAction;

    #[test]
    fn logging_adapter_always_succeeds() {
        let adapter = LoggingAdapter;
        let result = adapter.execute(ResponseAction::Quarantine, 75);
        assert!(result.success);
        assert!(result.detail.contains("75%"));
    }

    #[test]
    fn composite_chain_runs_all_adapters() {
        let chain = CompositeAdapter::default_chain();
        let results = chain.execute_all(ResponseAction::Quarantine, 75);
        assert_eq!(results.len(), 4);
        assert!(results.iter().all(|r| r.success));
    }

    #[test]
    fn throttle_adapts_to_action_level() {
        let adapter = ThrottleAdapter;
        let observe = adapter.execute(ResponseAction::Observe, 0);
        assert!(observe.detail.contains("no throttle"));
        let limit = adapter.execute(ResponseAction::RateLimit, 30);
        assert!(limit.detail.contains("soft-throttle"));
    }
}
