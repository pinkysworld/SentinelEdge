import { useMemo } from 'react';
import { useApi, useToast } from '../hooks.jsx';
import * as api from '../api.js';
import { JsonDetails, SideDrawer, SummaryGrid, downloadData } from './operator.jsx';

function requestSeverity(detail) {
  const risk = (detail?.risk_level || '').toLowerCase();
  if (risk === 'critical') return 'critical';
  if (risk === 'severe') return 'high';
  if (risk === 'elevated') return 'medium';
  return 'low';
}

export default function ProcessDrawer({ pid, onClose, onUpdated }) {
  const toast = useToast();
  const { data: detail, loading, error, reload } = useApi(
    () => api.processDetail(pid),
    [pid],
    { skip: !pid }
  );

  const summary = useMemo(() => {
    if (!detail) return null;
    return {
      pid: detail.pid,
      ppid: detail.ppid,
      user: detail.user,
      group: detail.group,
      cpu_percent: detail.cpu_percent,
      mem_percent: detail.mem_percent,
      hostname: detail.hostname,
      platform: detail.platform,
      start_time: detail.start_time,
      elapsed: detail.elapsed,
      risk_level: detail.risk_level,
    };
  }, [detail]);

  if (!pid) return null;

  const queueAction = async (body, label) => {
    try {
      const result = await api.responseRequest(body);
      const status = result?.request?.status || result?.status || 'submitted';
      toast(`${label} request ${String(status).toLowerCase()}`, 'success');
      onUpdated?.();
    } catch {
      toast(`${label} request failed`, 'error');
    }
  };

  const queueKill = async () => {
    if (!detail) return;
    if (!window.confirm(`Queue kill request for PID ${detail.pid} (${detail.display_name || detail.name})?`)) return;
    await queueAction({
      action: 'kill_process',
      pid: detail.pid,
      process_name: detail.display_name || detail.name,
      hostname: detail.hostname,
      severity: requestSeverity(detail),
      reason: `Operator-requested kill for ${(detail.display_name || detail.name)} via admin console`,
    }, 'Kill');
  };

  const queueIsolate = async () => {
    if (!detail) return;
    if (!window.confirm(`Queue host isolation for ${detail.hostname}?`)) return;
    await queueAction({
      action: 'isolate',
      hostname: detail.hostname,
      severity: requestSeverity(detail),
      reason: `Operator-requested host isolation while investigating PID ${detail.pid}`,
    }, 'Isolation');
  };

  return (
    <SideDrawer
      open={!!pid}
      onClose={onClose}
      title={detail?.display_name || detail?.name || `PID ${pid}`}
      subtitle={detail ? `${detail.platform} · ${detail.hostname}` : `PID ${pid}`}
      actions={
        <>
          <button className="btn btn-sm" onClick={reload}>Refresh</button>
          {detail && <button className="btn btn-sm" onClick={() => downloadData(detail, `process-${detail.pid}.json`)}>Export</button>}
          <button className="btn btn-sm" disabled={!detail || detail?.analysis?.self_process} onClick={queueKill}>Queue Kill</button>
          <button className="btn btn-sm btn-primary" disabled={!detail} onClick={queueIsolate}>Queue Isolate</button>
        </>
      }
    >
      {loading && <div className="loading"><div className="spinner" /></div>}
      {error && <div className="error-box">Failed to load process detail.</div>}
      {detail && (
        <>
          <SummaryGrid data={summary} limit={10} />

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title" style={{ marginBottom: 8 }}>Execution Context</div>
            <div className="drawer-copy-grid">
              <div>
                <div className="metric-label">Executable</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all' }}>{detail.exe_path || 'Unavailable'}</div>
              </div>
              <div>
                <div className="metric-label">Working Directory</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all' }}>{detail.cwd || 'Unavailable'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="metric-label">Command Line</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all' }}>{detail.cmd_line || 'Unavailable'}</div>
              </div>
            </div>
          </div>

          {detail.findings?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Behavioural Findings</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Risk</th><th>Reason</th><th>CPU</th><th>Memory</th></tr></thead>
                  <tbody>
                    {detail.findings.map((finding, index) => (
                      <tr key={`${finding.pid}-${index}`}>
                        <td><span className={`sev-${finding.risk_level}`}>{finding.risk_level}</span></td>
                        <td>{finding.reason}</td>
                        <td>{finding.cpu_percent?.toFixed?.(1) ?? finding.cpu_percent}</td>
                        <td>{finding.mem_percent?.toFixed?.(1) ?? finding.mem_percent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detail.analysis?.recommendations?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Analyst Guidance</div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                {detail.analysis.recommendations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          {detail.network_activity?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Network Activity</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Protocol</th><th>Endpoint</th><th>State</th></tr></thead>
                  <tbody>
                    {detail.network_activity.map((entry, index) => (
                      <tr key={`${entry.endpoint}-${index}`}>
                        <td>{entry.protocol}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{entry.endpoint}</td>
                        <td>{entry.state || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detail.code_signature && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Code Signature</div>
              <SummaryGrid data={detail.code_signature} limit={6} />
            </div>
          )}

          <JsonDetails data={detail} />
        </>
      )}
    </SideDrawer>
  );
}
