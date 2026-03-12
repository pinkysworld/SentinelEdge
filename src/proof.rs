use serde::{Deserialize, Serialize};

use crate::audit::sha256_hex;

/// Metadata proving that a state update was derived from a known
/// prior state by a deterministic transformation.
///
/// This is the structural skeleton for future ZK integration. Today
/// the proof is a SHA-256 digest binding before → after states with
/// the transformation tag. A real deployment would replace `digest`
/// with a Halo2 / zk-SNARK proof blob (T032 upgrade path).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProof {
    /// Monotonically increasing proof sequence.
    pub sequence: u64,
    /// Human-readable tag describing the transform (e.g. "baseline_update").
    pub transform: String,
    /// SHA-256 of the serialized prior state.
    pub prior_digest: String,
    /// SHA-256 of the serialized post state.
    pub post_digest: String,
    /// Combined digest binding prior → transform → post.
    pub binding_digest: String,
    /// Placeholder for a future ZK proof blob (empty for now).
    pub zk_proof: Vec<u8>,
}

impl UpdateProof {
    /// Construct a proof binding a state transition.
    ///
    /// `prior_bytes` and `post_bytes` should be canonical serializations
    /// of the before/after state (e.g. JSON of the baseline).
    pub fn bind(
        sequence: u64,
        transform: &str,
        prior_bytes: &[u8],
        post_bytes: &[u8],
    ) -> Self {
        let prior_digest = sha256_hex(prior_bytes);
        let post_digest = sha256_hex(post_bytes);
        let binding_payload = format!("{prior_digest}|{transform}|{post_digest}");
        let binding_digest = sha256_hex(binding_payload.as_bytes());

        Self {
            sequence,
            transform: transform.to_string(),
            prior_digest,
            post_digest,
            binding_digest,
            zk_proof: Vec::new(),
        }
    }

    /// Verify that the binding digest is consistent with the stored
    /// prior, transform, and post digests.
    pub fn verify_binding(&self) -> bool {
        let expected = format!("{}|{}|{}", self.prior_digest, self.transform, self.post_digest);
        sha256_hex(expected.as_bytes()) == self.binding_digest
    }
}

/// A registry that accumulates update proofs for later audit.
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct ProofRegistry {
    proofs: Vec<UpdateProof>,
    next_seq: u64,
}

impl ProofRegistry {
    pub fn new() -> Self {
        Self {
            proofs: Vec::new(),
            next_seq: 1,
        }
    }

    /// Record a state transition and return its proof.
    pub fn record(
        &mut self,
        transform: &str,
        prior_bytes: &[u8],
        post_bytes: &[u8],
    ) -> &UpdateProof {
        let proof = UpdateProof::bind(self.next_seq, transform, prior_bytes, post_bytes);
        self.next_seq += 1;
        self.proofs.push(proof);
        self.proofs.last().unwrap()
    }

    pub fn proofs(&self) -> &[UpdateProof] {
        &self.proofs
    }

    /// Verify all stored proofs' internal consistency.
    pub fn verify_all(&self) -> Result<(), String> {
        for proof in &self.proofs {
            if !proof.verify_binding() {
                return Err(format!(
                    "proof #{} ({}) has inconsistent binding digest",
                    proof.sequence, proof.transform
                ));
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn proof_binding_verifies() {
        let proof = UpdateProof::bind(1, "baseline_update", b"state_v1", b"state_v2");
        assert!(proof.verify_binding());
        assert_eq!(proof.zk_proof.len(), 0); // placeholder for future ZK
    }

    #[test]
    fn registry_records_and_verifies() {
        let mut reg = ProofRegistry::new();
        reg.record("baseline_update", b"old", b"new");
        reg.record("config_change", b"cfg1", b"cfg2");
        assert_eq!(reg.proofs().len(), 2);
        assert!(reg.verify_all().is_ok());
    }

    #[test]
    fn tampered_proof_fails_verification() {
        let mut proof = UpdateProof::bind(1, "test", b"a", b"b");
        proof.prior_digest = "0".repeat(64); // tamper
        assert!(!proof.verify_binding());
    }
}
