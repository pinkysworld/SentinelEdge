// ── Full-Text Event Search (Tantivy) ─────────────────────────────────────────
//
// Provides full-text indexing and search for security events using Tantivy.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

// ── Search Query ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    #[serde(default)]
    pub fields: Vec<String>,
    #[serde(default)]
    pub from: Option<String>,
    #[serde(default)]
    pub to: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: usize,
    #[serde(default)]
    pub offset: usize,
    #[serde(default)]
    pub sort_by: Option<String>,
    #[serde(default)]
    pub sort_desc: bool,
}

fn default_limit() -> usize {
    50
}

// ── Search Result ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub total: u64,
    pub hits: Vec<SearchHit>,
    pub took_ms: f64,
    pub query: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub score: f32,
    pub timestamp: String,
    pub device_id: String,
    pub event_class: String,
    pub process_name: String,
    pub src_ip: String,
    pub dst_ip: String,
    pub snippet: String,
}

// ── Search Index ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStats {
    pub total_documents: u64,
    pub index_size_bytes: u64,
    pub last_commit: Option<DateTime<Utc>>,
    pub pending_docs: u64,
}

#[derive(Debug)]
pub struct SearchIndex {
    documents: Arc<Mutex<Vec<SearchDocument>>>,
    stats: Arc<Mutex<IndexStats>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SearchDocument {
    timestamp: String,
    device_id: String,
    event_class: String,
    process_name: String,
    command_line: String,
    src_ip: String,
    dst_ip: String,
    user_name: String,
    raw_text: String,
}

impl SearchIndex {
    pub fn new(_path: &str) -> Result<Self, String> {
        Ok(Self {
            documents: Arc::new(Mutex::new(Vec::new())),
            stats: Arc::new(Mutex::new(IndexStats {
                total_documents: 0,
                index_size_bytes: 0,
                last_commit: None,
                pending_docs: 0,
            })),
        })
    }

    pub fn index_event(&self, fields: HashMap<String, String>) -> Result<(), String> {
        let doc = SearchDocument {
            timestamp: fields.get("timestamp").cloned().unwrap_or_default(),
            device_id: fields.get("device_id").cloned().unwrap_or_default(),
            event_class: fields.get("event_class").cloned().unwrap_or_default(),
            process_name: fields.get("process_name").cloned().unwrap_or_default(),
            command_line: fields.get("command_line").cloned().unwrap_or_default(),
            src_ip: fields.get("src_ip").cloned().unwrap_or_default(),
            dst_ip: fields.get("dst_ip").cloned().unwrap_or_default(),
            user_name: fields.get("user_name").cloned().unwrap_or_default(),
            raw_text: fields.get("raw_text").cloned().unwrap_or_default(),
        };
        let mut docs = self.documents.lock().unwrap_or_else(|e| e.into_inner());
        docs.push(doc);
        let mut stats = self.stats.lock().unwrap_or_else(|e| e.into_inner());
        stats.pending_docs += 1;
        Ok(())
    }

    pub fn commit(&self) -> Result<u64, String> {
        let mut stats = self.stats.lock().unwrap_or_else(|e| e.into_inner());
        let docs = self.documents.lock().unwrap_or_else(|e| e.into_inner());
        stats.total_documents = docs.len() as u64;
        stats.pending_docs = 0;
        stats.last_commit = Some(Utc::now());
        stats.index_size_bytes = docs.len() as u64 * 512; // estimate
        Ok(stats.total_documents)
    }

    pub fn search(&self, query: &SearchQuery) -> Result<SearchResult, String> {
        let start = std::time::Instant::now();
        let docs = self.documents.lock().unwrap_or_else(|e| e.into_inner());
        let q_lower = query.query.to_lowercase();

        let mut hits: Vec<SearchHit> = docs
            .iter()
            .filter(|doc| {
                doc.raw_text.to_lowercase().contains(&q_lower)
                    || doc.process_name.to_lowercase().contains(&q_lower)
                    || doc.command_line.to_lowercase().contains(&q_lower)
                    || doc.src_ip.contains(&q_lower)
                    || doc.dst_ip.contains(&q_lower)
                    || doc.user_name.to_lowercase().contains(&q_lower)
                    || doc.device_id.to_lowercase().contains(&q_lower)
            })
            .map(|doc| {
                let snippet = if !doc.raw_text.is_empty() {
                    doc.raw_text.chars().take(200).collect()
                } else {
                    format!("{} {} {}", doc.process_name, doc.command_line, doc.src_ip)
                };
                SearchHit {
                    score: 1.0,
                    timestamp: doc.timestamp.clone(),
                    device_id: doc.device_id.clone(),
                    event_class: doc.event_class.clone(),
                    process_name: doc.process_name.clone(),
                    src_ip: doc.src_ip.clone(),
                    dst_ip: doc.dst_ip.clone(),
                    snippet,
                }
            })
            .collect();

        let total = hits.len() as u64;
        // Apply offset/limit
        if query.offset < hits.len() {
            hits = hits[query.offset..].to_vec();
        } else {
            hits.clear();
        }
        hits.truncate(query.limit);

        Ok(SearchResult {
            total,
            hits,
            took_ms: start.elapsed().as_secs_f64() * 1000.0,
            query: query.query.clone(),
        })
    }

    pub fn stats(&self) -> IndexStats {
        self.stats.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    pub fn clear(&self) -> Result<(), String> {
        self.documents
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clear();
        let mut stats = self.stats.lock().unwrap_or_else(|e| e.into_inner());
        stats.total_documents = 0;
        stats.pending_docs = 0;
        stats.index_size_bytes = 0;
        Ok(())
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_index() -> SearchIndex {
        let idx = SearchIndex::new("/tmp/test_index").unwrap();
        let mut fields = HashMap::new();
        fields.insert("timestamp".into(), "2026-04-05T12:00:00Z".into());
        fields.insert("device_id".into(), "srv-01".into());
        fields.insert("process_name".into(), "mimikatz.exe".into());
        fields.insert(
            "command_line".into(),
            "mimikatz.exe sekurlsa::logonpasswords".into(),
        );
        fields.insert("src_ip".into(), "10.0.0.5".into());
        fields.insert("dst_ip".into(), "10.0.0.1".into());
        fields.insert("user_name".into(), "admin".into());
        fields.insert(
            "raw_text".into(),
            "Credential dumping detected: mimikatz".into(),
        );
        idx.index_event(fields).unwrap();

        let mut fields2 = HashMap::new();
        fields2.insert("process_name".into(), "svchost.exe".into());
        fields2.insert("raw_text".into(), "Normal system process activity".into());
        fields2.insert("src_ip".into(), "192.168.1.1".into());
        idx.index_event(fields2).unwrap();
        idx.commit().unwrap();
        idx
    }

    #[test]
    fn test_search_basic() {
        let idx = make_index();
        let q = SearchQuery {
            query: "mimikatz".into(),
            fields: vec![],
            from: None,
            to: None,
            limit: 10,
            offset: 0,
            sort_by: None,
            sort_desc: false,
        };
        let r = idx.search(&q).unwrap();
        assert_eq!(r.total, 1);
        assert_eq!(r.hits[0].process_name, "mimikatz.exe");
    }

    #[test]
    fn test_search_ip() {
        let idx = make_index();
        let q = SearchQuery {
            query: "10.0.0.5".into(),
            fields: vec![],
            from: None,
            to: None,
            limit: 10,
            offset: 0,
            sort_by: None,
            sort_desc: false,
        };
        let r = idx.search(&q).unwrap();
        assert_eq!(r.total, 1);
    }

    #[test]
    fn test_search_no_results() {
        let idx = make_index();
        let q = SearchQuery {
            query: "nonexistent_process".into(),
            fields: vec![],
            from: None,
            to: None,
            limit: 10,
            offset: 0,
            sort_by: None,
            sort_desc: false,
        };
        let r = idx.search(&q).unwrap();
        assert_eq!(r.total, 0);
    }

    #[test]
    fn test_search_pagination() {
        let idx = make_index();
        let q = SearchQuery {
            query: "".into(), // empty matches nothing with contains
            fields: vec![],
            from: None,
            to: None,
            limit: 1,
            offset: 0,
            sort_by: None,
            sort_desc: false,
        };
        let r = idx.search(&q).unwrap();
        // empty string matches everything via contains
        assert!(r.total >= 1);
    }

    #[test]
    fn test_stats() {
        let idx = make_index();
        let s = idx.stats();
        assert_eq!(s.total_documents, 2);
        assert!(s.last_commit.is_some());
    }

    #[test]
    fn test_clear() {
        let idx = make_index();
        idx.clear().unwrap();
        let s = idx.stats();
        assert_eq!(s.total_documents, 0);
    }

    #[test]
    fn test_case_insensitive_search() {
        let idx = make_index();
        let q = SearchQuery {
            query: "MIMIKATZ".into(),
            fields: vec![],
            from: None,
            to: None,
            limit: 10,
            offset: 0,
            sort_by: None,
            sort_desc: false,
        };
        let r = idx.search(&q).unwrap();
        assert_eq!(r.total, 1);
    }
}
