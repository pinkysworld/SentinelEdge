import { Link } from 'react-router-dom';
import { formatCount, normalizedStatus, statusBadge } from './helpers.js';

function CheckState({ label, ready }) {
  return (
    <span className={`badge ${ready ? 'badge-ok' : 'badge-warn'}`}>
      {ready ? 'Ready' : 'Needs'} {label}
    </span>
  );
}

export default function RuleTuningChecklist({ rule, suppressionCount = 0, onReplay }) {
  if (!rule) return null;
  const replayReady = Boolean(rule.last_test_at || Number(rule.last_test_match_count || 0) > 0);
  const suppressionReviewed = suppressionCount === 0 || Boolean(rule.last_suppression_review_at);
  const lifecycle = normalizedStatus(rule.lifecycle || 'draft');
  const promotionReady =
    replayReady && suppressionReviewed && ['test', 'canary'].includes(lifecycle);

  return (
    <div className="command-checklist">
      <div>
        <div className="row-primary">{rule.name || rule.title || rule.id}</div>
        <div className="row-secondary">
          {formatCount(rule.last_test_match_count || 0)} replay hits,{' '}
          {formatCount(suppressionCount)} suppressions, lifecycle {rule.lifecycle || 'draft'}.
        </div>
      </div>
      <div className="chip-row">
        <CheckState label="replay" ready={replayReady} />
        <CheckState label="suppression review" ready={suppressionReviewed} />
        <span className={`badge ${promotionReady ? 'badge-ok' : statusBadge(rule.lifecycle)}`}>
          {promotionReady ? 'Promotion ready' : 'Promotion gated'}
        </span>
      </div>
      <div className="actions">
        <button className="btn btn-sm" type="button" onClick={() => onReplay?.(rule)}>
          Run replay
        </button>
        <Link
          className="btn btn-sm"
          to={`/detection?rule=${encodeURIComponent(rule.id || '')}&panel=promotion`}
        >
          Open rule
        </Link>
      </div>
    </div>
  );
}
