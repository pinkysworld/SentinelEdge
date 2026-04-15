import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, useToast } from '../hooks.jsx';
import * as api from '../api.js';
import { JsonDetails, SummaryGrid, SideDrawer, formatDateTime, formatRelativeTime } from './operator.jsx';

const SAVED_VIEWS = [
  { id: 'noisy', label: 'Noisy', match: (rule, ctx) => (rule.last_test_match_count || 0) >= 5 || ctx.suppressionCount[rule.id] > 0 },
  { id: 'recent', label: 'Recently Tuned', match: (rule) => !!rule.last_test_at || !!rule.last_promotion_at },
  { id: 'review', label: 'Needs Review', match: (rule) => !rule.last_test_at || ['draft', 'test'].includes(rule.lifecycle) },
  { id: 'disabled', label: 'Disabled', match: (rule) => rule.enabled === false || rule.lifecycle === 'deprecated' },
  { id: 'suppressed', label: 'Suppressed', match: (rule, ctx) => ctx.suppressionCount[rule.id] > 0 },
];

const lifecycleTone = (lifecycle) => {
  if (lifecycle === 'active') return 'badge-ok';
  if (lifecycle === 'canary' || lifecycle === 'test') return 'badge-warn';
  if (lifecycle === 'deprecated' || lifecycle === 'rolled_back') return 'badge-err';
  return 'badge-info';
};

const severityTone = (value) => {
  if (value === 'critical' || value === 'high') return 'badge-err';
  if (value === 'medium' || value === 'elevated') return 'badge-warn';
  return 'badge-info';
};

export default function ThreatDetection() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: profile } = useApi(api.detectionProfile);
  const { data: summary } = useApi(api.detectionSummary);
  const { data: weights, reload: reloadWeights } = useApi(api.detectionWeights);
  const { data: fpStats } = useApi(api.fpFeedbackStats);
  const { data: contentRulesData, reload: reloadRules } = useApi(api.contentRules);
  const { data: packsData } = useApi(api.contentPacks);
  const { data: huntsData } = useApi(api.hunts);
  const { data: suppressionsData, reload: reloadSuppressions } = useApi(api.suppressions);
  const { data: mitreCoverage } = useApi(api.mitreCoverageAlt);
  const [testResult, setTestResult] = useState(null);
  const [drawerMode, setDrawerMode] = useState(null);
  const [weightInput, setWeightInput] = useState('0.50');
  const [suppressionForm, setSuppressionForm] = useState({
    name: '',
    justification: 'Operator suppression',
    severity: '',
    text: '',
  });

  const allRules = Array.isArray(contentRulesData?.rules) ? contentRulesData.rules : [];
  const packs = Array.isArray(packsData?.packs) ? packsData.packs : [];
  const hunts = Array.isArray(huntsData?.hunts) ? huntsData.hunts : [];
  const suppressions = Array.isArray(suppressionsData?.suppressions) ? suppressionsData.suppressions : [];
  const suppressionCount = suppressions.reduce((acc, suppression) => {
    if (suppression.rule_id) acc[suppression.rule_id] = (acc[suppression.rule_id] || 0) + 1;
    return acc;
  }, {});

  const queue = searchParams.get('queue') || 'noisy';
  const query = searchParams.get('q') || '';
  const ownerFilter = searchParams.get('owner') || 'all';
  const selectedRuleId = searchParams.get('rule');
  const tuneOpen = searchParams.get('tune') === '1';

  const filteredRules = allRules.filter((rule) => {
    const savedView = SAVED_VIEWS.find((item) => item.id === queue);
    const queueMatch = savedView ? savedView.match(rule, { suppressionCount }) : true;
    const q = query.trim().toLowerCase();
    const searchMatch = !q
      || String(rule.title || '').toLowerCase().includes(q)
      || String(rule.id || '').toLowerCase().includes(q)
      || String(rule.description || '').toLowerCase().includes(q);
    const ownerMatch = ownerFilter === 'all' || String(rule.owner || 'system') === ownerFilter;
    return queueMatch && searchMatch && ownerMatch;
  });

  const selectedRule = filteredRules.find((rule) => rule.id === selectedRuleId)
    || allRules.find((rule) => rule.id === selectedRuleId)
    || filteredRules[0]
    || allRules[0]
    || null;

  useEffect(() => {
    if (!selectedRule || selectedRule.id === selectedRuleId) return;
    const next = new URLSearchParams(searchParams);
    next.set('rule', selectedRule.id);
    setSearchParams(next, { replace: true });
  }, [selectedRule, selectedRuleId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedRule) return;
    const initialWeight = weights?.weights?.[selectedRule.id] ?? weights?.[selectedRule.id] ?? 0.5;
    setWeightInput(Number(initialWeight).toFixed(2));
    setSuppressionForm((form) => ({
      ...form,
      name: `Suppress ${selectedRule.title || selectedRule.id}`,
      severity: selectedRule.severity_mapping || '',
    }));
  }, [selectedRule, weights]);

  const openDrawer = (mode) => {
    const next = new URLSearchParams(searchParams);
    if (!selectedRule) return;
    next.set('rule', selectedRule.id);
    if (mode === 'tune') next.set('tune', '1');
    else next.delete('tune');
    setSearchParams(next, { replace: true });
    setDrawerMode(mode);
  };

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('tune');
    setSearchParams(next, { replace: true });
    setDrawerMode(null);
  };

  const saveWeight = async () => {
    if (!selectedRule) return;
    const parsed = Number(weightInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast('Enter a valid weight greater than zero.', 'error');
      return;
    }
    try {
      await api.setDetectionWeights({ rule_id: selectedRule.id, weight: parsed });
      toast('Detection weight updated.', 'success');
      reloadWeights();
      closeDrawer();
    } catch {
      toast('Unable to save detection weight.', 'error');
    }
  };

  const testRule = async () => {
    if (!selectedRule) return;
    try {
      const result = await api.contentRuleTest(selectedRule.id);
      setTestResult(result?.result || result);
      toast('Rule test completed.', 'success');
      reloadRules();
    } catch {
      toast('Rule test failed.', 'error');
    }
  };

  const promoteRule = async (target) => {
    if (!selectedRule) return;
    try {
      await api.contentRulePromote(selectedRule.id, { target_status: target, reason: `Promoted from workspace to ${target}` });
      toast(`Rule moved to ${target}.`, 'success');
      reloadRules();
    } catch {
      toast('Rule promotion failed.', 'error');
    }
  };

  const rollbackRule = async () => {
    if (!selectedRule) return;
    try {
      await api.contentRuleRollback(selectedRule.id);
      toast('Rule rolled back.', 'success');
      reloadRules();
    } catch {
      toast('Rule rollback failed.', 'error');
    }
  };

  const disableRule = async () => {
    if (!selectedRule) return;
    try {
      await api.createContentRule({
        ...selectedRule,
        id: selectedRule.id,
        builtin: selectedRule.builtin,
        enabled: false,
        query: selectedRule.query,
      });
      toast('Rule disabled.', 'success');
      reloadRules();
    } catch {
      toast('Rule disable failed.', 'error');
    }
  };

  const createSuppression = async () => {
    if (!selectedRule) return;
    try {
      await api.createSuppression({
        name: suppressionForm.name,
        rule_id: selectedRule.id,
        severity: suppressionForm.severity || undefined,
        text: suppressionForm.text || undefined,
        justification: suppressionForm.justification,
      });
      toast('Suppression saved.', 'success');
      reloadSuppressions();
      closeDrawer();
    } catch {
      toast('Failed to save suppression.', 'error');
    }
  };

  const packNames = (selectedRule?.pack_ids || []).map((packId) => packs.find((pack) => pack.id === packId)?.name || packId);
  const relatedHunts = hunts.filter((hunt) => {
    const text = `${hunt.name || ''} ${JSON.stringify(hunt.query || {})}`.toLowerCase();
    return selectedRule && (text.includes(String(selectedRule.id).toLowerCase()) || text.includes(String(selectedRule.title || '').toLowerCase()));
  });
  const fpEntries = Object.entries(fpStats || {}).filter(([, value]) => value && typeof value === 'object');
  const fpPreview = fpEntries.slice(0, 3).map(([pattern, value]) => ({ pattern, ratio: value.fp_ratio ?? value.ratio ?? value.suppression_weight ?? '—' }));

  const queueCounts = SAVED_VIEWS.reduce((acc, item) => {
    acc[item.id] = allRules.filter((rule) => item.match(rule, { suppressionCount })).length;
    return acc;
  }, {});
  const owners = ['all', ...new Set(allRules.map((rule) => rule.owner || 'system'))];

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Detection Engineering Workspace</div>
            <div className="hint">Triage noisy rules, validate changes, and move detections through lifecycle gates without inline edits.</div>
          </div>
          <div className="btn-group">
            {['aggressive', 'balanced', 'quiet'].map((option) => (
              <button
                key={option}
                className={`btn btn-sm ${profile?.profile === option ? 'btn-primary' : ''}`}
                onClick={() => api.setDetectionProfile({ profile: option }).then(() => toast(`Profile set to ${option}.`, 'success')).catch(() => toast('Unable to update profile.', 'error'))}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-label">Active Profile</div>
            <div className="summary-value">{profile?.profile || '—'}</div>
            <div className="summary-meta">Threshold multiplier {profile?.threshold_multiplier ?? '—'}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Rules In Workspace</div>
            <div className="summary-value">{allRules.length}</div>
            <div className="summary-meta">{filteredRules.length} currently in the active queue</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Coverage</div>
            <div className="summary-value">{mitreCoverage?.coverage_pct != null ? `${mitreCoverage.coverage_pct}%` : '—'}</div>
            <div className="summary-meta">{mitreCoverage?.covered_techniques ?? '—'} techniques covered</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Pending Suppressions</div>
            <div className="summary-value">{suppressions.filter((item) => item.active !== false).length}</div>
            <div className="summary-meta">Live exceptions currently shaping rule outcomes</div>
          </div>
        </div>
        {summary && <JsonDetails data={summary} label="Detection summary details" />}
      </div>

      <div className="triage-layout">
        <section className="triage-list">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Rule Queues</div>
            <div className="chip-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SAVED_VIEWS.map((item) => (
                <button
                  key={item.id}
                  className={`filter-chip-button ${queue === item.id ? 'active' : ''}`}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set('queue', item.id);
                    next.delete('rule');
                    setSearchParams(next, { replace: true });
                  }}
                >
                  {item.label} ({queueCounts[item.id] || 0})
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="triage-toolbar">
              <div className="triage-toolbar-group">
                <input
                  className="form-input triage-search"
                  value={query}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    if (event.target.value) next.set('q', event.target.value);
                    else next.delete('q');
                    setSearchParams(next, { replace: true });
                  }}
                  placeholder="Search rules, IDs, or descriptions"
                  aria-label="Search rules"
                />
                <select
                  className="form-select"
                  value={ownerFilter}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    if (event.target.value === 'all') next.delete('owner');
                    else next.set('owner', event.target.value);
                    setSearchParams(next, { replace: true });
                  }}
                  aria-label="Filter by owner"
                >
                  {owners.map((owner) => <option key={owner} value={owner}>{owner === 'all' ? 'All owners' : owner}</option>)}
                </select>
              </div>
              <div className="triage-toolbar-group">
                <button className="btn btn-sm" onClick={reloadRules}>Refresh</button>
                <button className="btn btn-sm btn-primary" onClick={testRule} disabled={!selectedRule}>Test Selected</button>
              </div>
            </div>

            <div className="sticky-bulk-bar">
              <span className="hint">Queue focuses noisy, recently changed, and suppressed detections first.</span>
            </div>

            <div className="split-list-table">
              <table>
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Owner</th>
                    <th>ATT&CK</th>
                    <th>Noise</th>
                    <th>Lifecycle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.length === 0 ? (
                    <tr><td colSpan="5"><div className="empty" style={{ padding: 24 }}>No rules match this queue and filter scope.</div></td></tr>
                  ) : filteredRules.map((rule) => (
                    <tr
                      key={rule.id}
                      className={selectedRule?.id === rule.id ? 'row-active' : ''}
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.set('rule', rule.id);
                        setSearchParams(next, { replace: true });
                      }}
                      onMouseEnter={() => {
                        const next = new URLSearchParams(searchParams);
                        next.set('rule', rule.id);
                        setSearchParams(next, { replace: true });
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="row-primary">{rule.title || rule.id}</div>
                        <div className="row-secondary">{rule.description || 'No rule narrative available.'}</div>
                      </td>
                      <td>{rule.owner || 'system'}</td>
                      <td>{Array.isArray(rule.attack) ? rule.attack.length : 0} mappings</td>
                      <td>
                        <span className={`badge ${severityTone((rule.last_test_match_count || 0) >= 5 ? 'high' : 'low')}`}>
                          {(rule.last_test_match_count || 0)} hits
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${lifecycleTone(rule.lifecycle)}`}>{rule.lifecycle || 'draft'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="triage-detail">
          <div className="card">
            {!selectedRule ? <div className="empty">Select a rule to inspect lifecycle, validation, and related suppressions.</div> : (
              <>
                <div className="detail-hero">
                  <div>
                    <div className="detail-hero-title">{selectedRule.title || selectedRule.id}</div>
                    <div className="detail-hero-copy">{selectedRule.description || 'This rule needs a clearer analyst-facing summary before rollout.'}</div>
                  </div>
                  <span className={`badge ${lifecycleTone(selectedRule.lifecycle)}`}>{selectedRule.lifecycle || 'draft'}</span>
                </div>

                <div className="chip-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <span className={`badge ${selectedRule.enabled === false ? 'badge-err' : 'badge-ok'}`}>{selectedRule.enabled === false ? 'Disabled' : 'Enabled'}</span>
                  <span className="badge badge-info">{selectedRule.kind || 'sigma'}</span>
                  <span className="badge badge-info">Owner: {selectedRule.owner || 'system'}</span>
                  <span className={`badge ${severityTone(selectedRule.severity_mapping || 'low')}`}>{selectedRule.severity_mapping || 'severity inherited'}</span>
                </div>

                <div className="btn-group" style={{ marginTop: 16 }}>
                  <button className="btn btn-sm btn-primary" onClick={testRule}>Test</button>
                  <button className="btn btn-sm" onClick={() => { setDrawerMode('tune'); openDrawer('tune'); }}>Tune</button>
                  <button className="btn btn-sm" onClick={() => setDrawerMode('suppress')}>Suppress</button>
                  <button className="btn btn-sm" onClick={() => promoteRule('canary')}>Promote</button>
                  <button className="btn btn-sm" onClick={rollbackRule}>Rollback</button>
                  <button className="btn btn-sm btn-danger" onClick={disableRule}>Disable</button>
                </div>

                <div className="summary-grid" style={{ marginTop: 16 }}>
                  <div className="summary-card">
                    <div className="summary-label">Last Test</div>
                    <div className="summary-value">{selectedRule.last_test_at ? formatRelativeTime(selectedRule.last_test_at) : 'Never'}</div>
                    <div className="summary-meta">{selectedRule.last_test_at ? formatDateTime(selectedRule.last_test_at) : 'Run a validation replay before promotion.'}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Validation Hits</div>
                    <div className="summary-value">{selectedRule.last_test_match_count || 0}</div>
                    <div className="summary-meta">Replay hit count from the most recent rule test.</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Suppressions</div>
                    <div className="summary-value">{suppressionCount[selectedRule.id] || 0}</div>
                    <div className="summary-meta">Active exceptions tied directly to this rule.</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Content Packs</div>
                    <div className="summary-value">{packNames.length}</div>
                    <div className="summary-meta">{packNames.slice(0, 2).join(' • ') || 'No pack membership recorded.'}</div>
                  </div>
                </div>

                <div className="detail-callout" style={{ marginTop: 16 }}>
                  <strong>MITRE impact</strong>
                  <div style={{ marginTop: 6 }}>
                    {Array.isArray(selectedRule.attack) && selectedRule.attack.length > 0
                      ? selectedRule.attack.map((attack) => `${attack.technique_name || attack.technique_id} (${attack.tactic || 'mapped tactic'})`).join(' • ')
                      : 'No ATT&CK mapping is attached yet. Add one before broad promotion so analysts understand coverage intent.'}
                  </div>
                </div>

                <div className="card" style={{ marginTop: 16, padding: 16, background: 'var(--bg)' }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Validation and Context</div>
                  {testResult ? (
                    <div className="summary-grid">
                      <div className="summary-card">
                        <div className="summary-label">Tested At</div>
                        <div className="summary-value">{formatRelativeTime(testResult.tested_at)}</div>
                        <div className="summary-meta">{formatDateTime(testResult.tested_at)}</div>
                      </div>
                      <div className="summary-card">
                        <div className="summary-label">Visible Matches</div>
                        <div className="summary-value">{testResult.match_count}</div>
                        <div className="summary-meta">{testResult.summary}</div>
                      </div>
                      <div className="summary-card">
                        <div className="summary-label">Suppressed Matches</div>
                        <div className="summary-value">{testResult.suppressed_count}</div>
                        <div className="summary-meta">Hidden by active suppressions or exceptions.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="hint">Run a rule test to preview impact before tuning or promotion.</div>
                  )}
                </div>

                <div className="card" style={{ marginTop: 16, padding: 16, background: 'var(--bg)' }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>False-Positive Signals</div>
                  {fpPreview.length === 0 ? (
                    <div className="hint">False-positive feedback will appear here once analysts label alert outcomes.</div>
                  ) : fpPreview.map((entry) => (
                    <div key={entry.pattern} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13 }}>{entry.pattern}</span>
                      <span className="badge badge-info">ratio {entry.ratio}</span>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ marginTop: 16, padding: 16, background: 'var(--bg)' }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Related Workflow Links</div>
                  <div className="summary-grid">
                    <div className="summary-card">
                      <div className="summary-label">Saved Hunts</div>
                      <div className="summary-value">{relatedHunts.length}</div>
                      <div className="summary-meta">{relatedHunts[0]?.name || 'No hunt references found for this rule.'}</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-label">Promotion State</div>
                      <div className="summary-value">{selectedRule.last_promotion_at ? formatRelativeTime(selectedRule.last_promotion_at) : 'Pending'}</div>
                      <div className="summary-meta">{selectedRule.last_promotion_at ? formatDateTime(selectedRule.last_promotion_at) : 'No promotion event recorded yet.'}</div>
                    </div>
                  </div>
                </div>

                <JsonDetails data={selectedRule} label="Rule metadata and raw query" />
                {testResult && <JsonDetails data={testResult} label="Rule test result JSON" />}
              </>
            )}
          </div>
        </aside>
      </div>

      <SideDrawer
        open={drawerMode === 'tune' || tuneOpen}
        title={selectedRule ? `Tune ${selectedRule.title || selectedRule.id}` : 'Tune rule'}
        subtitle="Move weighting changes into a side panel so validation and save actions are harder to trigger accidentally."
        onClose={closeDrawer}
        actions={<button className="btn btn-sm btn-primary" onClick={saveWeight}>Save Weight</button>}
      >
        <div className="form-group">
          <label className="form-label" htmlFor="rule-weight">Detection Weight</label>
          <input
            id="rule-weight"
            className="form-input"
            type="number"
            min="0.05"
            max="5"
            step="0.05"
            value={weightInput}
            onChange={(event) => setWeightInput(event.target.value)}
          />
          <div className="hint">Preview the likely blast radius using the latest test match count before committing.</div>
        </div>
        <SummaryGrid data={{
          current_profile: profile?.profile,
          last_test_match_count: selectedRule?.last_test_match_count || 0,
          live_suppressions: suppressionCount[selectedRule?.id] || 0,
          recommendation: (selectedRule?.last_test_match_count || 0) >= 5 ? 'Reduce noise before promotion' : 'Ready for canary validation',
        }} limit={4} />
      </SideDrawer>

      <SideDrawer
        open={drawerMode === 'suppress'}
        title={selectedRule ? `Suppress ${selectedRule.title || selectedRule.id}` : 'Suppress rule'}
        subtitle="Capture intent and scope explicitly so exceptions remain understandable later."
        onClose={closeDrawer}
        actions={<button className="btn btn-sm btn-primary" onClick={createSuppression}>Save Suppression</button>}
      >
        <div className="form-group">
          <label className="form-label" htmlFor="suppression-name">Name</label>
          <input id="suppression-name" className="form-input" value={suppressionForm.name} onChange={(event) => setSuppressionForm((form) => ({ ...form, name: event.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="suppression-justification">Justification</label>
          <textarea id="suppression-justification" className="form-textarea" value={suppressionForm.justification} onChange={(event) => setSuppressionForm((form) => ({ ...form, justification: event.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="suppression-text">Match Text Filter</label>
          <input id="suppression-text" className="form-input" value={suppressionForm.text} onChange={(event) => setSuppressionForm((form) => ({ ...form, text: event.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="suppression-severity">Severity</label>
          <input id="suppression-severity" className="form-input" value={suppressionForm.severity} onChange={(event) => setSuppressionForm((form) => ({ ...form, severity: event.target.value }))} />
        </div>
      </SideDrawer>
    </div>
  );
}
