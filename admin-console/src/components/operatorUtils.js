const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
});

export function formatLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (character) => character.toUpperCase());
}

export function formatValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') return `${Object.keys(value).length} fields`;
  return String(value);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return DATE_TIME_FORMATTER.format(date);
}

export function formatRelativeTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const deltaMs = date.getTime() - Date.now();
  const absSeconds = Math.round(Math.abs(deltaMs) / 1000);
  if (absSeconds < 60) return RELATIVE_TIME_FORMATTER.format(Math.round(deltaMs / 1000), 'second');
  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) return RELATIVE_TIME_FORMATTER.format(Math.round(deltaMs / 60000), 'minute');
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return RELATIVE_TIME_FORMATTER.format(Math.round(deltaMs / 3600000), 'hour');
  return RELATIVE_TIME_FORMATTER.format(Math.round(deltaMs / 86400000), 'day');
}

export function formatNumber(value, options) {
  if (value == null || value === '') return '—';
  if (typeof value !== 'number') return String(value);
  return new Intl.NumberFormat(undefined, options).format(value);
}

export function downloadData(data, filename, mime = 'application/json') {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(rows, filename) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell == null ? '' : String(cell);
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\n');
  downloadData(csv, filename, 'text/csv;charset=utf-8');
}