const metrics = [
  { value: "5", label: "prototype features shipped" },
  { value: "25", label: "blueprint tracks documented" },
  { value: "3", label: "CLI commands ready" },
];

const ribbon = [
  {
    title: "Runnable now",
    body: "The repo compiles, tests, and analyzes repeatable telemetry traces today.",
  },
  {
    title: "Honest scope",
    body: "Implemented, scaffolded, and future work are clearly separated across docs and code.",
  },
  {
    title: "Built to grow",
    body: "The current runtime is small on purpose, so deeper research tracks can land cleanly.",
  },
];

const implemented = [
  {
    size: "wide",
    title: "Adaptive Detector",
    body:
      "A rolling baseline tracks normal telemetry and turns sudden drift into an explainable anomaly score across CPU, memory, temperature, bandwidth, authentication failures, and integrity drift.",
  },
  {
    size: "compact",
    title: "Policy Engine",
    body:
      "Threat scores become concrete mitigation actions, softened when battery is constrained.",
  },
  {
    size: "compact",
    title: "Audit Chain",
    body:
      "Every detection and response step is written into a chained forensic log for replay and inspection.",
  },
  {
    size: "tall",
    title: "Trace Analysis",
    body:
      "CSV telemetry traces make attack scenarios easy to replay, compare, and test before connecting live device feeds.",
  },
  {
    size: "tall",
    title: "Docs + Backlog",
    body:
      "Architecture, getting started, status, backlog, and the research-track map keep the repository grounded in what actually exists.",
  },
  {
    size: "wide",
    title: "Pages Presence",
    body:
      "The GitHub Pages site now presents the current milestone with a clearer visual hierarchy and a more public-facing narrative.",
  },
];

const backlog = [
  {
    title: "Persist learned baselines",
    body:
      "Store and reload adaptive baselines so the runtime improves across sessions instead of relearning from scratch.",
  },
  {
    title: "Real device action adapters",
    body:
      "Replace abstract response labels with pluggable implementations for throttling, service isolation, and rollback hooks.",
  },
  {
    title: "Cryptographic audit upgrades",
    body:
      "Swap the prototype digest chain for stronger cryptographic checkpoints and signed audit anchors.",
  },
  {
    title: "Choose the first research subset",
    body:
      "Decide which advanced blueprint tracks move from idea status into the first deeper implementation wave.",
  },
];

const tracks = [
  {
    code: "R01",
    title: "Adaptive anomaly detection",
    status: "foundation",
    body:
      "This track aims to let the edge runtime learn a changing local baseline instead of relying on static thresholds.",
    detail:
      "The current prototype already scores cross-signal drift, but it does not yet do continual learning, differential privacy, or proof-carrying model updates.",
  },
  {
    code: "R05",
    title: "Poisoning detection hooks",
    status: "scaffolded",
    body:
      "This track focuses on detecting when the detector itself has been manipulated and forcing recovery to a trusted state.",
    detail:
      "Today we only model integrity drift and escalation semantics; spectral poisoning analysis, trusted checkpoints, and real rollback are not implemented yet.",
  },
  {
    code: "R06",
    title: "Energy-aware mitigation",
    status: "scaffolded",
    body:
      "This track makes response actions proportional to both threat level and the device's remaining energy budget.",
    detail:
      "Battery-sensitive action scaling exists now, but device isolation is still abstract and there is no formal proof that the response was correct.",
  },
  {
    code: "R09",
    title: "Adaptive response strength",
    status: "foundation",
    body:
      "This track is about choosing a softer or stronger response automatically rather than hard-coding one mitigation path.",
    detail:
      "The prototype already maps anomaly score plus battery state into observe, rate-limit, quarantine, or rollback-and-escalate decisions.",
  },
  {
    code: "R10",
    title: "Rollback semantics",
    status: "scaffolded",
    body:
      "This track targets forensic recovery: after a suspected compromise, the device should return to a known-safe state and prove it.",
    detail:
      "Right now the policy can request rollback-and-escalate and the audit trail records that intent, but snapshots, restore logic, and recovery proofs are still missing.",
  },
  {
    code: "R11",
    title: "Verifiable logging",
    status: "scaffolded",
    body:
      "This track turns the system's event history into evidence that can be inspected later without trusting plain text logs.",
    detail:
      "A chained audit trail exists today, but it is still a prototype digest chain rather than signed, post-quantum-ready audit infrastructure.",
  },
];

function renderMetrics() {
  const root = document.querySelector("#milestone-metrics");
  metrics.forEach((metric) => {
    const article = document.createElement("article");
    article.className = "metric";
    article.innerHTML = `<strong>${metric.value}</strong><span>${metric.label}</span>`;
    root.appendChild(article);
  });
}

function renderRibbon() {
  const root = document.querySelector("#status-ribbon");
  ribbon.forEach((item) => {
    const article = document.createElement("article");
    article.className = "ribbon-item";
    article.innerHTML = `<strong>${item.title}</strong><p>${item.body}</p>`;
    root.appendChild(article);
  });
}

function renderImplemented() {
  const root = document.querySelector("#implemented-grid");
  implemented.forEach((item, index) => {
    const article = document.createElement("article");
    article.className = `feature-card ${item.size}`;
    article.style.animationDelay = `${index * 70}ms`;
    article.innerHTML = `<h3>${item.title}</h3><p>${item.body}</p>`;
    root.appendChild(article);
  });
}

function renderBacklog() {
  const root = document.querySelector("#backlog-list");
  backlog.forEach((item) => {
    const article = document.createElement("article");
    article.className = "timeline-item";
    article.innerHTML = `<strong>${item.title}</strong><p>${item.body}</p>`;
    root.appendChild(article);
  });
}

function renderTracks() {
  const root = document.querySelector("#tracks-grid");
  tracks.forEach((track, index) => {
    const article = document.createElement("article");
    article.className = "track-card";
    article.style.animationDelay = `${index * 80}ms`;
    article.innerHTML = `
      <div class="badge ${track.status}">${track.code} · ${track.status}</div>
      <h3>${track.title}</h3>
      <p class="track-why">${track.body}</p>
      <p class="track-now"><strong>Current prototype:</strong> ${track.detail}</p>
    `;
    root.appendChild(article);
  });
}

renderMetrics();
renderRibbon();
renderImplemented();
renderBacklog();
renderTracks();
