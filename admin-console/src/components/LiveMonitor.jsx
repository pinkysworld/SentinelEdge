import { useState } from 'react';
import { useApi, useInterval, useToast } from '../hooks.jsx';
import * as api from '../api.js';

export default function LiveMonitor() {
  const toast = useToast();
  const { data: alertData, loading, reload } = useApi(api.alerts);
  const { data: countData, reload: reloadCount } = useApi(api.alertsCount);
  const { data: grouped, reload: reloadGrouped } = useApi(api.alertsGrouped);
  const { data: hp } = useApi(api.health);
  const [selectedId, setSelectedId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [tab, setTab] = useState('stream');

  const reloadAll = () => { reload(); reloadCount(); reloadGrouped(); };
  useInterval(reloadAll, 10000);

  const alertList = Array.isArray(alertData) ? alertData : alertData?.alerts || [];

  return (
    <div>
      <div className="section-header">
        <h2>Live Alert Stream</h2>
        <div className="btn-group">
          <span className={`badge ${hp?.status === 'ok' ? 'badge-ok' : 'badge-err'}`}>
            {hp?.status === 'ok' ? 'System Healthy' : 'Degraded'}
          </span>
          <span className="badge badge-info">
            {countData == null ? '…' : (typeof countData === 'object' ? countData.count : countData)} alerts
          </span>
          <button className="btn btn-sm" onClick={reloadAll}>↻ Refresh</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'stream' ? 'active' : ''}`} onClick={() => setTab('stream')}>Alert Stream</button>
        <button className={`tab ${tab === 'grouped' ? 'active' : ''}`} onClick={() => setTab('grouped')}>Grouped</button>
        <button className={`tab ${tab === 'analysis' ? 'active' : ''}`} onClick={() => setTab('analysis')}>Analysis</button>
      </div>

      {loading && <div className="loading"><div className="spinner" /></div>}

      {tab === 'stream' && !loading && (
        <div className="card">
          {alertList.length === 0 ? <div className="empty">No alerts — system is quiet</div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Time</th><th>Severity</th><th>Source</th><th>Category</th><th>Message</th><th>Actions</th></tr></thead>
                <tbody>
                  {alertList.map((a, i) => {
                    const aid = a.id || a.alert_id || `${a.timestamp}-${i}`;
                    return (
                    <tr key={aid} style={selectedId === aid ? { background: 'rgba(59,130,246,.08)' } : undefined}>
                      <td style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.timestamp || a.time || '—'}</td>
                      <td><span className={`sev-${(a.severity || 'low').toLowerCase()}`}>{a.severity}</span></td>
                      <td>{a.source || '—'}</td>
                      <td>{a.category || a.type || '—'}</td>
                      <td>{a.message || a.description || '—'}</td>
                      <td>
                        <button className="btn btn-sm" onClick={() => setSelectedId(selectedId === aid ? null : aid)}>
                          {selectedId === aid ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {selectedId !== null && (() => {
            const sel = alertList.find((a, i) => (a.id || a.alert_id || `${a.timestamp}-${i}`) === selectedId);
            return sel ? (
            <div style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Alert Detail</div>
              <div className="json-block">{JSON.stringify(sel, null, 2)}</div>
            </div>
            ) : null;
          })()}
        </div>
      )}

      {tab === 'grouped' && (
        <div className="card">
          {!grouped || (Array.isArray(grouped) && grouped.length === 0) ? <div className="empty">No grouped data</div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Group</th><th>Severity</th><th>Count</th><th>Avg Score</th><th>Max Score</th><th>First Seen</th><th>Last Seen</th><th>Reasons</th></tr></thead>
                <tbody>
                  {(Array.isArray(grouped) ? grouped : []).map(g => (
                    <tr key={g.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>#{g.id}</td>
                      <td><span className={`sev-${(g.level || 'low').toLowerCase()}`}>{g.level}</span></td>
                      <td><strong>{g.count}</strong></td>
                      <td>{g.avg_score?.toFixed(2)}</td>
                      <td>{g.max_score?.toFixed(2)}</td>
                      <td style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{g.first_seen || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{g.last_seen || '—'}</td>
                      <td style={{ fontSize: 12 }}>{(g.representative_reasons || []).join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'analysis' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Alert Analysis</span>
            <button className="btn btn-sm btn-primary" onClick={async () => {
              try {
                const r = await api.alertsAnalysis({});
                setAnalysisResult(r);
                toast('Analysis complete', 'success');
              } catch { toast('Analysis failed', 'error'); }
            }}>Run Analysis</button>
          </div>
          {analysisResult ? (
            <div>
              {analysisResult.summary && (
                <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius)', marginBottom: 16, lineHeight: 1.6 }}>
                  {analysisResult.summary}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 12 }}>
                  <div className="metric-label">Total Alerts</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{analysisResult.total_alerts}</div>
                </div>
                <div className="card" style={{ padding: 12 }}>
                  <div className="metric-label">Pattern</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {typeof analysisResult.pattern === 'string' ? analysisResult.pattern : analysisResult.pattern?.Sustained?.severity ? `Sustained ${analysisResult.pattern.Sustained.severity}` : JSON.stringify(analysisResult.pattern)}
                  </div>
                </div>
                <div className="card" style={{ padding: 12 }}>
                  <div className="metric-label">Score Trend</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {analysisResult.score_trend?.Rising ? `Rising (+${analysisResult.score_trend.Rising.slope})` :
                     analysisResult.score_trend?.Falling ? `Declining (${analysisResult.score_trend.Falling.slope})` :
                     analysisResult.score_trend === 'Volatile' ? 'Volatile' : 'Stable'}
                  </div>
                </div>
                {analysisResult.severity_breakdown && (
                  <div className="card" style={{ padding: 12 }}>
                    <div className="metric-label">Severity</div>
                    <div style={{ fontSize: 13 }}>
                      <span className="sev-critical">{analysisResult.severity_breakdown.critical}</span> critical,{' '}
                      <span className="sev-severe">{analysisResult.severity_breakdown.severe}</span> severe,{' '}
                      <span className="sev-elevated">{analysisResult.severity_breakdown.elevated}</span> elevated
                    </div>
                  </div>
                )}
              </div>
              {analysisResult.dominant_reasons?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="card-title" style={{ marginBottom: 8 }}>Top Detection Reasons</div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Reason</th><th>Count</th></tr></thead>
                      <tbody>
                        {analysisResult.dominant_reasons.map(([reason, count], i) => (
                          <tr key={i}><td>{reason}</td><td>{count}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {analysisResult.isolation_guidance?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="card-title" style={{ marginBottom: 8 }}>Isolation &amp; Response Guidance</div>
                  {analysisResult.isolation_guidance.map((g, i) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)', marginBottom: 8, borderLeft: '3px solid var(--warning)' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{g.reason}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{g.threat_description}</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                        {g.steps.map((step, j) => <li key={j}>{step}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              <details>
                <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>Raw JSON</summary>
                <div className="json-block" style={{ marginTop: 8 }}>{JSON.stringify(analysisResult, null, 2)}</div>
              </details>
            </div>
          ) : (
            <div className="empty">Click "Run Analysis" to analyze current alert patterns</div>
          )}
        </div>
      )}
    </div>
  );
}
