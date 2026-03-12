use serde::{Deserialize, Serialize};

use crate::policy::{ResponseAction, ThreatLevel};

/// An explicit state-machine model of the policy engine.
///
/// This makes every valid state transition enumerable and checkable.
/// The runtime can replay a sequence of decisions and verify that each
/// one corresponds to a legal transition in the formal model.
///
/// Future work (T033 upgrade path): export the transition table to
/// TLA+ or Alloy for model-checking of liveness/safety properties.

/// A snapshot of the policy state at a single point in time.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct PolicyState {
    pub level: ThreatLevel,
    pub action: ResponseAction,
}

/// A recorded transition between two policy states.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyTransition {
    pub sequence: usize,
    pub from: PolicyState,
    pub to: PolicyState,
    pub trigger: TransitionTrigger,
    pub valid: bool,
}

/// What caused the transition.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransitionTrigger {
    /// Anomaly score crossed a threshold.
    ScoreThreshold { score: f32 },
    /// Battery degradation forced a downgrade.
    BatteryDegradation { battery_pct: f32 },
    /// Integrity drift forced critical escalation.
    IntegrityDrift { drift: f32 },
}

/// The set of legal transitions. Returns `true` if a transition from
/// `from` to `to` is allowed by the formal model.
pub fn is_legal_transition(from: &PolicyState, to: &PolicyState) -> bool {
    use ThreatLevel::*;

    // Same state is always legal (no change).
    if from.level == to.level && from.action == to.action {
        return true;
    }

    match (from.level, to.level) {
        // Escalation: any level can escalate to any higher level.
        (Nominal, Elevated | Severe | Critical) => true,
        (Elevated, Severe | Critical) => true,
        (Severe, Critical) => true,

        // De-escalation: any level can de-escalate to any lower level
        // when score drops.
        (Critical, Severe | Elevated | Nominal) => true,
        (Severe, Elevated | Nominal) => true,
        (Elevated, Nominal) => true,

        // Battery-aware downgrades: action may soften while level stays
        // the same or even escalates (the model allows this).
        _ => {
            // Allow same-level action changes (battery degradation).
            from.level == to.level && from.action != to.action
        }
    }
}

/// A checker that records and validates a sequence of policy transitions.
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct PolicyStateMachine {
    current: Option<PolicyState>,
    transitions: Vec<PolicyTransition>,
}

impl PolicyStateMachine {
    pub fn new() -> Self {
        Self {
            current: None,
            transitions: Vec::new(),
        }
    }

    /// Record a new policy state. Returns the transition and whether
    /// it was legal.
    pub fn step(
        &mut self,
        level: ThreatLevel,
        action: ResponseAction,
        trigger: TransitionTrigger,
    ) -> &PolicyTransition {
        let to = PolicyState { level, action };

        let (from, valid) = match self.current {
            None => (to, true), // initial state is always valid
            Some(from) => (from, is_legal_transition(&from, &to)),
        };

        let transition = PolicyTransition {
            sequence: self.transitions.len() + 1,
            from,
            to,
            trigger,
            valid,
        };

        self.current = Some(to);
        self.transitions.push(transition);
        self.transitions.last().unwrap()
    }

    pub fn current_state(&self) -> Option<&PolicyState> {
        self.current.as_ref()
    }

    pub fn transitions(&self) -> &[PolicyTransition] {
        &self.transitions
    }

    /// Check every recorded transition for legality.
    pub fn verify_trace(&self) -> Result<(), Vec<&PolicyTransition>> {
        let violations: Vec<_> = self.transitions.iter().filter(|t| !t.valid).collect();
        if violations.is_empty() {
            Ok(())
        } else {
            Err(violations)
        }
    }

    /// Export a summary suitable for manual inspection or future
    /// TLA+/Alloy conversion.
    pub fn export_summary(&self) -> String {
        let mut out = String::from("PolicyStateMachine trace:\n");
        for t in &self.transitions {
            let mark = if t.valid { "✓" } else { "✗" };
            out.push_str(&format!(
                "  {} #{}: {:?}/{:?} → {:?}/{:?}\n",
                mark,
                t.sequence,
                t.from.level,
                t.from.action,
                t.to.level,
                t.to.action,
            ));
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::policy::{ResponseAction, ThreatLevel};

    #[test]
    fn escalation_is_legal() {
        let from = PolicyState {
            level: ThreatLevel::Nominal,
            action: ResponseAction::Observe,
        };
        let to = PolicyState {
            level: ThreatLevel::Critical,
            action: ResponseAction::RollbackAndEscalate,
        };
        assert!(is_legal_transition(&from, &to));
    }

    #[test]
    fn deescalation_is_legal() {
        let from = PolicyState {
            level: ThreatLevel::Critical,
            action: ResponseAction::RollbackAndEscalate,
        };
        let to = PolicyState {
            level: ThreatLevel::Nominal,
            action: ResponseAction::Observe,
        };
        assert!(is_legal_transition(&from, &to));
    }

    #[test]
    fn battery_downgrade_is_legal() {
        let from = PolicyState {
            level: ThreatLevel::Severe,
            action: ResponseAction::Quarantine,
        };
        let to = PolicyState {
            level: ThreatLevel::Severe,
            action: ResponseAction::RateLimit,
        };
        assert!(is_legal_transition(&from, &to));
    }

    #[test]
    fn state_machine_tracks_transitions() {
        let mut sm = PolicyStateMachine::new();
        sm.step(
            ThreatLevel::Nominal,
            ResponseAction::Observe,
            TransitionTrigger::ScoreThreshold { score: 0.5 },
        );
        sm.step(
            ThreatLevel::Severe,
            ResponseAction::Quarantine,
            TransitionTrigger::ScoreThreshold { score: 3.5 },
        );
        sm.step(
            ThreatLevel::Elevated,
            ResponseAction::RateLimit,
            TransitionTrigger::ScoreThreshold { score: 1.8 },
        );

        assert_eq!(sm.transitions().len(), 3);
        assert!(sm.verify_trace().is_ok());
    }

    #[test]
    fn export_summary_includes_all_transitions() {
        let mut sm = PolicyStateMachine::new();
        sm.step(
            ThreatLevel::Nominal,
            ResponseAction::Observe,
            TransitionTrigger::ScoreThreshold { score: 0.2 },
        );
        sm.step(
            ThreatLevel::Critical,
            ResponseAction::RollbackAndEscalate,
            TransitionTrigger::IntegrityDrift { drift: 0.55 },
        );
        let summary = sm.export_summary();
        assert!(summary.contains("#1"));
        assert!(summary.contains("#2"));
        assert!(summary.contains("Critical"));
    }
}
