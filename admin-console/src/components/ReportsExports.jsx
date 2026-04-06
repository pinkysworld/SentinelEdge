import { useState } from 'react';
import { useApi, useToast } from '../hooks.jsx';
import * as api from '../api.js';
import { JsonDetails, SummaryGrid, downloadData } from './operator.jsx';

export default function ReportsExports() {
  const toast = useToast();
  const [tab, setTab] = useState('reports');
  const { data: rptList, reload: rReports } = useApi(api.reports);
  const { data: execSum } = useApi(api.executiveSummary);
  const { data: research } = useApi(api.researchTracks);
  const { data: auditData } = useApi(api.auditLog);
  const { data: auditVerifyData } = useApi(api.auditVerify);
  const { data: adminAudit } = useApi(api.auditAdmin);
  const { data: retStatus } = useApi(api.retentionStatus);
  const [exportData, setExportData] = useState(null);
  const [analyzeResult, setAnalyzeResult] = useState(null);

  const reportArr = Array.isArray(rptList) ? rptList : rptList?.reports || [];

  const download = (data, name, mime = 'application/json') => {
    downloadData(data, name, mime);
  };

  const runExport = async (label, name, fetcher, mime = 'application/json') => {
    try {
      const data = await fetcher();
      setExportData({ type: label, data, mime });
      download(data, name, mime);
      toast(`${label} exported`, 'success');
    } catch {
      toast(`${label} export failed`, 'error');
    }
  };

  return (
    <div>
      <div className="tabs">
        {['reports', 'exports', 'audit', 'retention'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'reports' && (
        <>
          {execSum && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>Executive Summary</div>
              <SummaryGrid data={execSum} limit={12} />
              <JsonDetails data={execSum} />
            </div>
          )}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">Reports ({reportArr.length})</span>
              <button className="btn btn-sm" onClick={rReports}>↻ Refresh</button>
            </div>
            {reportArr.length === 0 ? <div className="empty">No reports</div> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Created</th><th>Actions</th></tr></thead>
                  <tbody>
                    {reportArr.map((r, i) => (
                      <tr key={i}>
                        <td>{r.id || i}</td>
                        <td>{r.title || r.name || '—'}</td>
                        <td>{r.type || '—'}</td>
                        <td>{r.created || r.timestamp || '—'}</td>
                        <td>
                          <div className="btn-group">
                            <button className="btn btn-sm" onClick={async () => {
                              try {
                                const d = await api.reportById(r.id || i);
                                download(d, `report-${r.id || i}.json`);
                                toast('Downloaded', 'success');
                              } catch {
                                toast('Failed', 'error');
                              }
                            }}>⬇ Download</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Run Analysis</span>
              <button className="btn btn-sm btn-primary" onClick={async () => {
                try {
                  const r = await api.analyze({});
                  setAnalyzeResult(r);
                  toast('Analysis complete', 'success');
                } catch {
                  toast('Analysis failed', 'error');
                }
              }}>Analyze</button>
            </div>
            {analyzeResult ? (
              <>
                <SummaryGrid data={analyzeResult} limit={10} />
                <JsonDetails data={analyzeResult} />
              </>
            ) : (
              <div className="empty">Run analysis to capture an exportable snapshot.</div>
            )}
          </div>
        </>
      )}

      {tab === 'exports' && (
        <>
          <div className="card-grid">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Operational Exports</div>
              <div className="btn-group">
                <button className="btn" onClick={() => runExport('Alerts', 'wardex-alerts.json', api.alerts)}>Export Alerts</button>
                <button className="btn" onClick={() => runExport('Events CSV', 'wardex-events.csv', api.eventsExport, 'text/csv;charset=utf-8')}>Export Events CSV</button>
                <button className="btn" onClick={() => runExport('Audit Log', 'wardex-audit-log.json', api.auditLog)}>Export Audit Log</button>
                <button className="btn" onClick={() => runExport('Executive Summary', 'wardex-executive-summary.json', api.executiveSummary)}>Export Summary</button>
              </div>
              <div className="hint">Exports download immediately and stay visible here for operator review.</div>
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Formal Verification Exports</div>
              <div className="btn-group">
                <button className="btn" onClick={() => runExport('TLA+', 'wardex-tla.json', api.exportTla)}>Export TLA+</button>
                <button className="btn" onClick={() => runExport('Alloy', 'wardex-alloy.json', api.exportAlloy)}>Export Alloy</button>
                <button className="btn" onClick={() => runExport('Witnesses', 'wardex-witnesses.json', api.exportWitnesses)}>Export Witnesses</button>
              </div>
            </div>
          </div>
          {exportData && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <span className="card-title">{exportData.type}</span>
                <button
                  className="btn btn-sm"
                  onClick={() => download(
                    exportData.data,
                    `${exportData.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${exportData.mime?.includes('csv') ? 'csv' : 'json'}`,
                    exportData.mime
                  )}
                >
                  Download again
                </button>
              </div>
              {typeof exportData.data === 'string' ? (
                <div className="json-block">{exportData.data}</div>
              ) : (
                <>
                  <SummaryGrid data={exportData.data} limit={10} />
                  <JsonDetails data={exportData.data} />
                </>
              )}
            </div>
          )}
          {research && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>Research Tracks</div>
              <SummaryGrid data={research} limit={10} />
              <JsonDetails data={research} />
            </div>
          )}
        </>
      )}

      {tab === 'audit' && (
        <>
          <div className="card-grid">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Audit Log</div>
              <SummaryGrid data={auditData} limit={10} />
              <JsonDetails data={auditData} />
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Admin Audit</div>
              <SummaryGrid data={adminAudit} limit={10} />
              <JsonDetails data={adminAudit} />
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Audit Verification</div>
            <SummaryGrid data={auditVerifyData} limit={10} />
            <JsonDetails data={auditVerifyData} />
          </div>
        </>
      )}

      {tab === 'retention' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Data Retention</span>
            <button className="btn btn-sm btn-primary" onClick={async () => {
              try {
                await api.retentionApply({});
                toast('Retention policy applied', 'success');
              } catch {
                toast('Failed', 'error');
              }
            }}>Apply Policy</button>
          </div>
          <SummaryGrid data={retStatus} limit={10} />
          <JsonDetails data={retStatus} />
        </div>
      )}
    </div>
  );
}
