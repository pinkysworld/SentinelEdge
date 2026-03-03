use std::fs;
use std::io;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct AuditRecord {
    pub sequence: usize,
    pub category: String,
    pub summary: String,
    pub previous_hash: u64,
    pub current_hash: u64,
}

#[derive(Debug, Default, Clone)]
pub struct AuditLog {
    previous_hash: u64,
    records: Vec<AuditRecord>,
}

impl AuditLog {
    pub fn record(&mut self, category: &str, summary: impl Into<String>) {
        let summary = summary.into();
        let payload = format!("{}|{}|{}", self.previous_hash, category, summary);
        let current_hash = fnv1a64(payload.as_bytes());
        let record = AuditRecord {
            sequence: self.records.len() + 1,
            category: category.to_string(),
            summary,
            previous_hash: self.previous_hash,
            current_hash,
        };

        self.previous_hash = current_hash;
        self.records.push(record);
    }

    pub fn records(&self) -> &[AuditRecord] {
        &self.records
    }

    pub fn render(&self) -> String {
        let mut rendered = String::from("# seq|prev_hash|curr_hash|category|summary\n");
        for record in &self.records {
            rendered.push_str(&format!(
                "{:04}|{:016x}|{:016x}|{}|{}\n",
                record.sequence,
                record.previous_hash,
                record.current_hash,
                record.category,
                record.summary
            ));
        }
        rendered
    }

    pub fn write_to_path(&self, path: &Path) -> io::Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::write(path, self.render())
    }
}

fn fnv1a64(bytes: &[u8]) -> u64 {
    const OFFSET: u64 = 0xcbf29ce484222325;
    const PRIME: u64 = 0x100000001b3;

    let mut hash = OFFSET;
    for byte in bytes {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(PRIME);
    }

    hash
}

#[cfg(test)]
mod tests {
    use super::AuditLog;

    #[test]
    fn hash_chain_progresses() {
        let mut audit = AuditLog::default();
        audit.record("boot", "runtime started");
        audit.record("detect", "score=1.25");

        let records = audit.records();
        assert_eq!(records.len(), 2);
        assert_eq!(records[1].previous_hash, records[0].current_hash);
    }
}
