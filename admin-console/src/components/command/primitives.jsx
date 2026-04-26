import { Link } from 'react-router-dom';

export function MetricCard({ label, value, detail, tone = 'badge-info', to, onClick }) {
  const body = (
    <div className="summary-card command-metric-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
      {detail && <div className="summary-meta">{detail}</div>}
      <span className={`badge ${tone}`}>Open</span>
    </div>
  );
  if (onClick) {
    return (
      <button className="command-card-link command-button-link" type="button" onClick={onClick}>
        {body}
      </button>
    );
  }
  if (!to) return body;
  return (
    <Link className="command-card-link" to={to}>
      {body}
    </Link>
  );
}

export function CommandSection({ title, eyebrow, description, actions, children }) {
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

export function WorkItem({ title, detail, tone = 'badge-info', badge, to, onClick }) {
  const content = (
    <div className="row-card">
      <div>
        <div className="row-primary">{title}</div>
        {detail && <div className="row-secondary">{detail}</div>}
      </div>
      {badge && <span className={`badge ${tone}`}>{badge}</span>}
    </div>
  );
  if (onClick) {
    return (
      <button className="command-card-link command-button-link" type="button" onClick={onClick}>
        {content}
      </button>
    );
  }
  if (!to) return content;
  return (
    <Link className="command-card-link" to={to}>
      {content}
    </Link>
  );
}
