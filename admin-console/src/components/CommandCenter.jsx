import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useApiGroup } from '../hooks.jsx';
import * as api from '../api.js';
import { JsonDetails, SummaryGrid, WorkspaceEmptyState } from './operator.jsx';
import { formatDateTime, formatRelativeTime } from './operatorUtils.js';
import { buildHref } from './workflowPivots.js';

const CONNECTOR_LANES = [
  { id: 'aws', label: 'AWS CloudTrail', category: 'Cloud', statusKey: 'awsCollector' },
  { id: 'azure', label: 'Azure Activity', category: 'Cloud', statusKey: 'azureCollector' },
  { id: 'gcp', label: 'GCP Audit Logs', category: 'Cloud', statusKey: 'gcpCollector' },
  { id: 'okta', label: 'Okta System Log', category: 'Identity', statusKey: 'oktaCollector' },
  { id: 'entra', label: 'Microsoft Entra', category: 'Identity', statusKey: 'entraCollector' },
  { id: 'm365', label: 'Microsoft 365', category: 'SaaS', statusKey: 'm365Collector' },
  { id: 'workspace', label: 'Google Workspace', category: 'SaaS', statusKey: 'workspaceCollector' },
  { id: 'github', label: 'GitHub Audit Log', category: 'SaaS', planned: true },
  { id: 'crowdstrike', label: 'CrowdStrike Falcon', category: 'EDR', planned: true },
  { id: 'syslog', label: 'Generic Syslog', category: 'Network', planned: true },
];

const IMPROVEMENT_LANES = [
  'Incident Command Center',
  'Connector Onboarding Wizard',
  'Detection Quality Dashboard',
  'Release and Upgrade Center',
  'Guided Remediation Approval Flow',
  'AI Analyst Evidence Boundaries',
  'Attack Storytelling',
  'RBAC Polish',
  'Rule Tuning Workflow',
  'Compliance Evidence Packs',
];

const asArray = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const normalizedStatus = (value) => String(value || '').trim().toLowerCase();

const statusBadge = (value) => {
  const status = normalizedStatus(value);
  if (['ok', 'ready', 'healthy', 'enabled', 'active', 'passing', 'connected'].includes(status)) {
    return 'badge-ok';
  }
  if (['failed', 'error', 'blocked', 'critical', 'degraded', 'unhealthy'].includes(status)) {
    return 'badge-err';
  }
  if (['pending', 'warning', 'configured', 'partial', 'draft'].includes(status)) {
    return 'badge-warn';
  }
  return 'badge-info';
};

const riskBadge = (value) => {
  const risk = normalizedStatus(value);
  if (risk === 'critical' || risk === 'high') return 'badge-err';
  if (risk === 'medium') return 'badge-warn';
  return 'badge-info';
};

const formatCount = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0';
  return numeric.toLocaleString();
};

const compactTimestamp = (value) => {
  if (!value) return 'No timestamp';
  return formatRelativeTime(value) || formatDateTime(value);
};

const connectorStatus = (connector, data) => {
  if (connector.planned) {
    return {
      status: 'planned',
      detail: 'Roadmap lane captured for guided setup, validation, and sample event preview.',
      sample: 'Not wired yet',
    };
  }

  const details = data[connector.statusKey] || {};
  const setup = details.setup || details.config || details;
  const validation = details.validation || setup.validation || {};
  const status =
    validation.status ||
    setup.status ||
    details.status ||
    (setup.enabled || details.enabled ? 'configured' : 'not configured');
  const lastSuccess =
    setup.last_success_at || validation.last_success_at || details.last_success_at || null;
  return {
    status,
    detail:
      validation.message ||
      setup.message ||
      details.detail ||
      (lastSuccess ? `Last successful collection ${compactTimestamp(lastSuccess)}.` : 'Awaiting validation.'),
    sample:
      setup.sample_event_type ||
      validation.sample_event_type ||
      details.sample_event_type ||
      setup.checkpoint_id ||
      'Sample preview pending',
  };
};

function MetricCard({ label, value, detail, tone = 'badge-info', to }) {
  const body = (
    <div className="summary-card command-metric-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
      {detail && <div className="summary-meta">{detail}</div>}
      <span className={`badge ${tone}`}>Open</span>
    </div>
  );
  if (!to) return body;
  return (
    <Link className="command-card-link" to={to}>
      {body}
    </Link>
  );
}

function CommandSection({ title, eyebrow, description, actions, children }) {
  return (
    <section className="card command-section">
      <div className="section-header">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function WorkItem({ title, detail, tone = 'badge-info', badge, to }) {
  const content = (
    <div className="row-card">
      <div>
        <div className="row-primary">{title}</div>
        {detail && <div className="row-secondary">{detail}</div>}
      </div>
      {badge && <span className={`badge ${tone}`}>{badge}</span>}
    </div>
  );
  if (!to) return content;
  return (
    <Link className="command-card-link" to={to}>
      {content}
    </Link>
  );
}

export default function CommandCenter() {
  const { data, loading, errors, reload } = useApiGroup({
    incidentsData: api.incidents,
    casesData: api.cases,
    queueStats: api.queueStats,
    responseStats: api.responseStats,
    remediationReviews: api.remediationChangeReviews,
    onboardingReadiness: api.onboardingReadiness,
    collectorsSummary: api.collectorsStatus,
    awsCollector: api.collectorsAws,
    azureCollector: api.collectorsAzure,
    gcpCollector: api.collectorsGcp,
    oktaCollector: api.collectorsOkta,
    entraCollector: api.collectorsEntra,
    m365Collector: api.collectorsM365,
    workspaceCollector: api.collectorsWorkspace,
    efficacySummary: api.efficacySummary,
    contentRulesData: api.contentRules,
    suppressionsData: api.suppressions,
    updatesData: api.updatesReleases,
    sbomData: api.sbom,
    configData: api.configCurrent,
    assistantStatus: api.assistantStatus,
    rbacUsersData: api.rbacUsers,
    complianceData: api.complianceStatus,
    reportTemplatesData: api.reportTemplates,
  });

  const incidents = useMemo(() => asArray(data.incidentsData, ['incidents', 'items']), [data]);
  const cases = useMemo(() => asArray(data.casesData, ['cases', 'items']), [data]);
  const reviews = useMemo(
    () => asArray(data.remediationReviews, ['reviews', 'items', 'change_reviews']),
    [data],
  );
  const rules = useMemo(() => asArray(data.contentRulesData, ['rules', 'items']), [data]);
  const suppressions = useMemo(
    () => asArray(data.suppressionsData, ['suppressions', 'items']),
    [data],
  );
  const releases = useMemo(() => asArray(data.updatesData, ['releases', 'items']), [data]);
  const users = useMemo(() => asArray(data.rbacUsersData, ['users', 'items']), [data]);
  const reportTemplates = useMemo(
    () => asArray(data.reportTemplatesData, ['templates', 'items']),
    [data],
  );

  const suppressionCount = useMemo(
    () =>
      suppressions.reduce((accumulator, suppression) => {
        const ruleId = suppression.rule_id || suppression.ruleId || suppression.rule;
        if (ruleId) accumulator[ruleId] = (accumulator[ruleId] || 0) + 1;
        return accumulator;
      }, {}),
    [suppressions],
  );

  const noisyRules = useMemo(
    () =>
      rules.filter(
        (rule) =>
          (Number(rule.last_test_match_count || rule.match_count || 0) >= 5 ||
            (suppressionCount[rule.id] || 0) > 0) &&
          rule.enabled !== false,
      ),
    [rules, suppressionCount],
  );

  const staleRules = useMemo(
    () =>
      rules.filter(
        (rule) =>
          !rule.last_test_at &&
          !rule.last_promotion_at &&
          normalizedStatus(rule.lifecycle || 'draft') !== 'active',
      ),
    [rules],
  );

  const pendingReviews = reviews.filter((review) =>
    ['pending_review', 'pending', 'requested'].includes(normalizedStatus(review.approval_status)),
  );
  const approvedReviews = reviews.filter((review) => normalizedStatus(review.approval_status) === 'approved');
  const readyRollbacks = reviews.filter((review) => Boolean(review.rollback_proof));
  const activeIncidents = incidents.filter(
    (incident) => !['closed', 'resolved', 'contained'].includes(normalizedStatus(incident.status)),
  );
  const activeCases = cases.filter(
    (caseEntry) => !['closed', 'resolved'].includes(normalizedStatus(caseEntry.status)),
  );
  const connectorRows = CONNECTOR_LANES.map((connector) => ({
    ...connector,
    ...connectorStatus(connector, data),
  }));
  const connectorIssues = connectorRows.filter(
    (connector) => connector.planned || !['ok', 'ready', 'healthy', 'connected'].includes(normalizedStatus(connector.status)),
  );
  const activeRelease = releases[0] || data.updatesData?.current || data.updatesData?.latest || null;
  const complianceStatus =
    data.complianceData?.status || data.complianceData?.overall_status || data.complianceData?.state || 'unknown';
  const assistantMode = data.assistantStatus?.mode || 'retrieval-only';
  const evidenceBoundaryWarnings = [
    'Require citations for every assistant recommendation.',
    'Label uncertainty before response or executive export.',
    'Keep prompts scoped to incident, case, investigation, or selected evidence.',
  ];
  const failedRequests = Object.keys(errors || {}).length;

  const commandMetrics = {
    incidents: activeIncidents.length,
    cases: activeCases.length,
    pendingReviews: pendingReviews.length,
    connectorIssues: connectorIssues.length,
    noisyRules: noisyRules.length,
    staleRules: staleRules.length,
    releaseCandidates: releases.length,
    compliancePacks: reportTemplates.length,
  };

  return (
    <div className="workspace command-center-workspace">
      <div className="workspace-header command-hero">
        <div>
          <div className="eyebrow">Product Command Center</div>
          <h2>Operate incidents, connectors, quality, releases, and evidence from one place</h2>
          <p>
            This workspace is the first implementation pass across the product-improvement lanes:
            it connects current APIs into one analyst and admin control surface, while exposing the
            next hardening gaps explicitly.
          </p>
          <div className="chip-row">
            {IMPROVEMENT_LANES.map((lane) => (
              <span key={lane} className="badge badge-info">
                {lane}
              </span>
            ))}
          </div>
        </div>
        <div className="actions">
          <button className="btn" type="button" onClick={reload} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Center'}
          </button>
          <Link className="btn btn-primary" to="/soc">
            Open SOC
          </Link>
        </div>
      </div>

      {failedRequests > 0 && (
        <div className="alert-banner warning">
          {failedRequests} supporting API request{failedRequests === 1 ? '' : 's'} failed. The
          command center is still showing available lanes so operators can continue triage.
        </div>
      )}

      <div className="summary-grid command-summary-grid">
        <MetricCard
          label="Open incidents"
          value={formatCount(commandMetrics.incidents)}
          detail={`${formatCount(commandMetrics.cases)} active cases`}
          tone={commandMetrics.incidents > 0 ? 'badge-warn' : 'badge-ok'}
          to="/soc"
        />
        <MetricCard
          label="Pending approvals"
          value={formatCount(commandMetrics.pendingReviews)}
          detail={`${formatCount(readyRollbacks.length)} rollback proofs ready`}
          tone={commandMetrics.pendingReviews > 0 ? 'badge-warn' : 'badge-ok'}
          to="/infrastructure"
        />
        <MetricCard
          label="Connector gaps"
          value={formatCount(commandMetrics.connectorIssues)}
          detail="Cloud, SaaS, identity, EDR, and syslog lanes"
          tone={commandMetrics.connectorIssues > 0 ? 'badge-warn' : 'badge-ok'}
          to="/settings"
        />
        <MetricCard
          label="Noisy rules"
          value={formatCount(commandMetrics.noisyRules)}
          detail={`${formatCount(commandMetrics.staleRules)} rules need validation`}
          tone={commandMetrics.noisyRules > 0 ? 'badge-warn' : 'badge-ok'}
          to="/detection"
        />
        <MetricCard
          label="Release candidates"
          value={formatCount(commandMetrics.releaseCandidates)}
          detail={activeRelease?.version || activeRelease?.tag || 'No release metadata loaded'}
          tone={activeRelease ? 'badge-info' : 'badge-warn'}
          to="/infrastructure"
        />
        <MetricCard
          label="Compliance packs"
          value={formatCount(commandMetrics.compliancePacks)}
          detail={`Compliance status: ${complianceStatus}`}
          tone={statusBadge(complianceStatus)}
          to="/reports"
        />
      </div>

      <div className="grid-2">
        <CommandSection
          eyebrow="Incident Command Center"
          title="Resolve incidents without losing context"
          description="Open cases, current incidents, response pressure, and evidence-export paths stay visible together."
          actions={<Link className="btn btn-sm" to="/soc">Open investigation workspace</Link>}
        >
          {activeIncidents.length > 0 ? (
            activeIncidents.slice(0, 4).map((incident) => (
              <WorkItem
                key={incident.id || incident.title}
                title={incident.title || incident.name || `Incident ${incident.id}`}
                detail={`${incident.status || 'open'} - ${incident.severity || incident.priority || 'unscored'} - ${compactTimestamp(incident.updated_at || incident.created_at)}`}
                badge={incident.severity || incident.priority || 'open'}
                tone={riskBadge(incident.severity || incident.priority)}
                to={buildHref('/soc', { params: { incident: incident.id || undefined } })}
              />
            ))
          ) : (
            <WorkspaceEmptyState
              compact
              title="No active incidents loaded"
              description="The command center will pin live incident, case, rollback, and report context here as soon as data is available."
            />
          )}
          <SummaryGrid
            data={{
              queue: data.queueStats || {},
              response: data.responseStats || {},
            }}
            limit={4}
          />
        </CommandSection>

        <CommandSection
          eyebrow="Connector Onboarding Wizard"
          title="Guide every collector from setup to proof"
          description="Each lane needs saved config, connection validation, sample event preview, and recent data proof."
          actions={<Link className="btn btn-sm" to="/settings">Configure connectors</Link>}
        >
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Connector</th>
                  <th>Lane</th>
                  <th>Status</th>
                  <th>Sample</th>
                </tr>
              </thead>
              <tbody>
                {connectorRows.map((connector) => (
                  <tr key={connector.id}>
                    <td>{connector.label}</td>
                    <td>{connector.category}</td>
                    <td>
                      <span className={`badge ${statusBadge(connector.status)}`}>{connector.status}</span>
                      <div className="hint">{connector.detail}</div>
                    </td>
                    <td>{connector.sample}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <JsonDetails data={data.onboardingReadiness} label="Readiness evidence" />
        </CommandSection>

        <CommandSection
          eyebrow="Detection Quality Dashboard"
          title="Track noisy, stale, and suppression-heavy detections"
          description="This is the operator-facing quality layer for precision, false positives, tuning debt, and ATT&CK coverage work."
          actions={<Link className="btn btn-sm" to="/detection">Tune rules</Link>}
        >
          <SummaryGrid
            data={{
              total_rules: rules.length,
              noisy_rules: noisyRules.length,
              suppressions: suppressions.length,
              stale_rules: staleRules.length,
            }}
            limit={4}
          />
          {noisyRules.slice(0, 4).map((rule) => (
            <WorkItem
              key={rule.id || rule.name}
              title={rule.name || rule.title || rule.id}
              detail={`${formatCount(rule.last_test_match_count || 0)} replay hits - ${formatCount(suppressionCount[rule.id] || 0)} suppressions`}
              badge={rule.lifecycle || 'review'}
              tone={statusBadge(rule.lifecycle)}
              to={buildHref('/detection', { params: { rule: rule.id || undefined, panel: 'efficacy' } })}
            />
          ))}
          <JsonDetails data={data.efficacySummary} label="Efficacy summary" />
        </CommandSection>

        <CommandSection
          eyebrow="Release and Upgrade Center"
          title="Make upgrades auditable before operators click deploy"
          description="The release lane connects version inventory, SBOM, package readiness, and rollback posture."
          actions={<Link className="btn btn-sm" to="/infrastructure">Open rollout controls</Link>}
        >
          <SummaryGrid
            data={{
              current_version: data.configData?.version || data.configData?.app_version || 'unknown',
              latest_release: activeRelease?.version || activeRelease?.tag || 'unknown',
              sbom_components: data.sbomData?.components?.length || data.sbomData?.component_count || 0,
              release_count: releases.length,
            }}
            limit={4}
          />
          {releases.slice(0, 3).map((release) => (
            <WorkItem
              key={release.version || release.tag || release.id}
              title={release.version || release.tag || release.name || 'Release candidate'}
              detail={release.notes || release.summary || compactTimestamp(release.created_at || release.published_at)}
              badge={release.status || 'candidate'}
              tone={statusBadge(release.status)}
            />
          ))}
        </CommandSection>

        <CommandSection
          eyebrow="Guided Remediation Approval Flow"
          title="Show blast radius before live execution"
          description="Approvals, required approver count, rollback proof, dry-run evidence, and typed-host gates stay together."
          actions={<Link className="btn btn-sm" to="/infrastructure">Review changes</Link>}
        >
          {reviews.length > 0 ? (
            reviews.slice(0, 5).map((review) => (
              <WorkItem
                key={review.id || review.title}
                title={review.title || review.change_type || 'Remediation review'}
                detail={`${review.asset_id || 'unscoped'} - ${review.approvals?.length || 0}/${review.required_approvers || 1} approvals - rollback ${review.rollback_proof ? 'ready' : 'pending'}`}
                badge={review.approval_status || 'pending'}
                tone={statusBadge(review.approval_status)}
                to="/infrastructure"
              />
            ))
          ) : (
            <WorkspaceEmptyState
              compact
              title="No remediation reviews loaded"
              description="Live rollback requests will appear here with blast radius, approval chain, and rollback proof state."
            />
          )}
          <SummaryGrid
            data={{
              pending: pendingReviews.length,
              approved: approvedReviews.length,
              rollback_ready: readyRollbacks.length,
            }}
            limit={3}
          />
        </CommandSection>

        <CommandSection
          eyebrow="AI Analyst Evidence Boundaries"
          title="Keep assistant answers inside cited evidence"
          description="Assistant output should declare scope, evidence, confidence, and uncertainty before it becomes action."
          actions={<Link className="btn btn-sm" to="/assistant">Open assistant</Link>}
        >
          <SummaryGrid
            data={{
              mode: assistantMode,
              model: data.assistantStatus?.model || 'retrieval-only',
              provider: data.assistantStatus?.provider || 'local',
              active_conversations: data.assistantStatus?.active_conversations || 0,
            }}
            limit={4}
          />
          {evidenceBoundaryWarnings.map((warning) => (
            <WorkItem key={warning} title={warning} badge="guardrail" tone="badge-info" />
          ))}
        </CommandSection>

        <CommandSection
          eyebrow="Attack Storytelling"
          title="Turn detections into a readable attack narrative"
          description="Incident storylines and graph pivots should explain initial access, lateral movement, containment, and export-ready impact."
          actions={<Link className="btn btn-sm" to="/attack-graph">Open attack graph</Link>}
        >
          {activeIncidents.slice(0, 4).map((incident) => (
            <WorkItem
              key={`story-${incident.id || incident.title}`}
              title={incident.title || incident.name || `Incident ${incident.id}`}
              detail="Open storyline, graph pivot, and report export context."
              badge="storyline"
              tone="badge-info"
              to={buildHref('/soc', {
                params: { incident: incident.id || undefined, incidentPanel: 'storyline' },
              })}
            />
          ))}
          {activeIncidents.length === 0 && (
            <WorkspaceEmptyState
              compact
              title="No attack stories queued"
              description="The next incident with linked evidence will expose storyline and graph pivots here."
            />
          )}
        </CommandSection>

        <CommandSection
          eyebrow="Tenant and Team RBAC Polish"
          title="Preview access risk before role changes"
          description="Role templates, scoped API keys, JIT admin elevation, and access-change audit checks are tracked from this lane."
          actions={<Link className="btn btn-sm" to="/settings">Open identity settings</Link>}
        >
          <SummaryGrid
            data={{
              users: users.length,
              admins: users.filter((user) => normalizedStatus(user.role) === 'admin').length,
              analysts: users.filter((user) => normalizedStatus(user.role) === 'analyst').length,
              access_source: data.rbacUsersData?.source || 'local',
            }}
            limit={4}
          />
          {users.slice(0, 4).map((user) => (
            <WorkItem
              key={user.username || user.user_id || user.email}
              title={user.username || user.user_id || user.email || 'User'}
              detail={user.groups?.join(', ') || user.source || 'No group scope loaded'}
              badge={user.role || 'viewer'}
              tone={statusBadge(user.role === 'admin' ? 'warning' : 'ready')}
            />
          ))}
        </CommandSection>

        <CommandSection
          eyebrow="Rule Tuning Workflow"
          title="Move from false-positive feedback to safe promotion"
          description="Noisy rule triage, suppression drafts, replay validation, and promotion checklist live in one flow."
          actions={<Link className="btn btn-sm" to="/detection">Open rule tuning</Link>}
        >
          {staleRules.slice(0, 4).map((rule) => (
            <WorkItem
              key={`stale-${rule.id || rule.name}`}
              title={rule.name || rule.title || rule.id}
              detail="Needs replay validation or promotion evidence before production confidence."
              badge={rule.lifecycle || 'draft'}
              tone="badge-warn"
              to={buildHref('/detection', { params: { rule: rule.id || undefined, panel: 'promotion' } })}
            />
          ))}
          {staleRules.length === 0 && (
            <WorkspaceEmptyState
              compact
              title="No stale rules detected"
              description="Rules needing replay, suppression, or promotion evidence will appear here."
            />
          )}
        </CommandSection>

        <CommandSection
          eyebrow="Evidence-Ready Compliance Packs"
          title="Prepare auditor-ready exports from operational truth"
          description="Compliance packs should combine incidents, release attestations, config state, and report templates."
          actions={<Link className="btn btn-sm" to="/reports">Open reports</Link>}
        >
          <SummaryGrid
            data={{
              compliance_status: complianceStatus,
              templates: reportTemplates.length,
              sbom_available: Boolean(data.sbomData?.components || data.sbomData?.component_count),
              release_metadata: releases.length > 0,
            }}
            limit={4}
          />
          {reportTemplates.slice(0, 4).map((template) => (
            <WorkItem
              key={template.id || template.name}
              title={template.name || template.title || 'Evidence template'}
              detail={template.description || template.scope || 'Ready for compliance evidence export.'}
              badge={template.framework || template.type || 'pack'}
              tone="badge-info"
              to="/reports"
            />
          ))}
        </CommandSection>
      </div>
    </div>
  );
}