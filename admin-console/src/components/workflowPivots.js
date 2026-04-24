const HUMANIZED_VALUE_KEYS = new Set([
  'intent',
  'focus',
  'source',
  'drawer',
  'tab',
  'queue',
  'queueFilter',
  'monitorTab',
  'fleetTab',
  'context',
]);

const COMMAND_ROUTE_CONFIG = {
  'create-incident': {
    path: '/soc',
    params: { intent: 'create-incident' },
  },
  'open-quarantine': {
    path: '/soc',
    params: { focus: 'quarantine' },
  },
  'run-hunt': {
    path: '/detection',
    params: { intent: 'run-hunt' },
  },
  'open-assistant': {
    path: '/assistant',
  },
  'review-offline-agents': {
    path: '/fleet',
    params: { status: 'offline' },
  },
};

function humanizeToken(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeTokenValue(key, value) {
  if (!HUMANIZED_VALUE_KEYS.has(key)) return String(value);
  return humanizeToken(value);
}

export function buildHref(path, { params, hash } = {}) {
  const search = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    search.set(key, normalized);
  });

  const query = search.toString();
  const normalizedHash = hash ? `#${String(hash).replace(/^#/, '')}` : '';
  return `${path}${query ? `?${query}` : ''}${normalizedHash}`;
}

export function buildCommandHref(action, { params, hash } = {}) {
  const config = COMMAND_ROUTE_CONFIG[action];
  if (!config) return '';

  return buildHref(config.path, {
    params: {
      ...(config.params || {}),
      ...(params || {}),
    },
    hash: hash ?? config.hash,
  });
}

export function buildContextualHelpHref(sectionId, currentSearch = '') {
  const params = new URLSearchParams(currentSearch);
  params.set('context', sectionId);
  const query = params.toString();
  return `/help${query ? `?${query}` : ''}`;
}

export function describeSearchScope(search = '') {
  const params = new URLSearchParams(search);
  const tokens = [];

  params.forEach((value, key) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    tokens.push(`${humanizeToken(key)}: ${humanizeTokenValue(key, normalized)}`);
  });

  return tokens;
}

export const SEARCH_COMMANDS = [
  {
    title: 'Create Incident',
    subtitle: 'Open the SOC workbench with a create flow',
    icon: 'CMD',
    action: 'create-incident',
    path: buildCommandHref('create-incident'),
    category: 'Command',
    kind: 'action',
  },
  {
    title: 'Open Quarantine',
    subtitle: 'Jump to active response and quarantine work',
    icon: 'CMD',
    action: 'open-quarantine',
    path: buildCommandHref('open-quarantine'),
    category: 'Command',
    kind: 'action',
  },
  {
    title: 'Run Hunt',
    subtitle: 'Open threat detection and start a hunt',
    icon: 'CMD',
    action: 'run-hunt',
    path: buildCommandHref('run-hunt'),
    category: 'Command',
    kind: 'action',
  },
  {
    title: 'Ask Assistant',
    subtitle: 'Open the analyst assistant with case-aware context',
    icon: 'CMD',
    action: 'open-assistant',
    path: buildCommandHref('open-assistant'),
    category: 'Command',
    kind: 'action',
  },
  {
    title: 'Review Offline Agents',
    subtitle: 'Open fleet with the offline status view',
    icon: 'CMD',
    action: 'review-offline-agents',
    path: buildCommandHref('review-offline-agents'),
    category: 'Command',
    kind: 'action',
  },
];
