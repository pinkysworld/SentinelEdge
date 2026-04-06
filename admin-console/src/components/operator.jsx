import React from 'react';

export function formatLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase());
}

export function formatValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') return `${Object.keys(value).length} fields`;
  return String(value);
}

function previewObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return Object.entries(value)
    .filter(([, inner]) => inner == null || typeof inner !== 'object')
    .slice(0, 3);
}

export function SummaryGrid({ data, exclude = [], limit = 12, emptyMessage = 'No data available' }) {
  if (!data || typeof data !== 'object') return <div className="empty">{emptyMessage}</div>;
  if (Array.isArray(data)) {
    if (data.length === 0) return <div className="empty">{emptyMessage}</div>;
    return (
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">Items</div>
          <div className="summary-value">{data.length}</div>
        </div>
        {data.slice(0, Math.max(0, limit - 1)).map((value, index) => {
          const preview = previewObject(value);
          return (
            <div key={index} className="summary-card">
              <div className="summary-label">Item {index + 1}</div>
              <div className="summary-value">{formatValue(value)}</div>
              {preview && preview.length > 0 && (
                <div className="summary-meta">
                  {preview.map(([innerKey, innerValue]) => (
                    <div key={innerKey}>
                      {formatLabel(innerKey)}: {formatValue(innerValue)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  const entries = Object.entries(data).filter(([key]) => !exclude.includes(key));
  if (entries.length === 0) return <div className="empty">{emptyMessage}</div>;
  return (
    <div className="summary-grid">
      {entries.slice(0, limit).map(([key, value]) => {
        const preview = previewObject(value);
        return (
          <div key={key} className="summary-card">
            <div className="summary-label">{formatLabel(key)}</div>
            <div className="summary-value">{formatValue(value)}</div>
            {preview && preview.length > 0 && (
              <div className="summary-meta">
                {preview.map(([innerKey, innerValue]) => (
                  <div key={innerKey}>
                    {formatLabel(innerKey)}: {formatValue(innerValue)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function JsonDetails({ data, label = 'Technical details' }) {
  if (data == null) return null;
  return (
    <details style={{ marginTop: 12 }}>
      <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>{label}</summary>
      <div className="json-block" style={{ marginTop: 8 }}>
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </div>
    </details>
  );
}

export function downloadData(data, filename, mime = 'application/json') {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(rows, filename) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell == null ? '' : String(cell);
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');
  downloadData(csv, filename, 'text/csv;charset=utf-8');
}

export function SideDrawer({ open, title, subtitle, onClose, actions, children }) {
  if (!open) return null;
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer-panel" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="drawer-title">{title}</div>
            {subtitle && <div className="drawer-subtitle">{subtitle}</div>}
          </div>
          <div className="drawer-actions">
            {actions}
            <button className="btn btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
