const metrics = [
  { value: "5", label: "prototype features shipped" },
  { value: "25", label: "blueprint tracks documented" },
  { value: "3", label: "CLI commands ready" },
];

const implemented = [
  {
    title: "Adaptive Detector",
    body:
      "A rolling baseline tracks normal telemetry and turns sudden drift into an explainable anomaly score.",
  },
  {
    title: "Policy Engine",
    body:
      "Threat scores become concrete mitigation actions, with battery-aware fallbacks to preserve uptime on constrained devices.",
  },
  {
    title: "Audit Chain",
    body:
      "Every run emits a chained forensic log so detection and response decisions can be replayed and inspected.",
  },
  {
    title: "Trace Analysis",
    body:
      "The runtime ingests repeatable CSV traces so we can test attack scenarios before wiring up live device feeds.",
  },
  {
    title: "Docs + Backlog",
    body:
      "Implemented, scaffolded, and future work are tracked explicitly so the repo stays grounded in reality.",
  },
  {
    title: "Pages Site",
    body:
      "A static public-facing summary mirrors the repo status and gives the project a clean GitHub Pages landing page.",
  },
];

const backlog = [
  {
    title: "Persist learned baselines",
    body:
      "Store and reload adaptive baselines so the runtime improves over multiple sessions instead of relearning from scratch.",
  },
  {
    title: "Real device action adapters",
    body:
      "Replace abstract actions with pluggable implementations for rate limiting, process isolation, and rollback hooks.",
  },
  {
    title: "Cryptographic audit upgrades",
    body:
      "Swap the prototype digest chain for production-grade cryptographic checkpoints and signatures.",
  },
  {
    title: "Prepare the research subset",
    body:
      "Select which advanced blueprint tracks graduate from concept status into the first paper-quality implementation wave.",
  },
];

const tracks = [
  {
    code: "R01",
    title: "Adaptive anomaly detection",
    status: "foundation",
    body: "Runnable baseline and multi-signal scoring exist; continual learning and privacy-preserving updates do not.",
  },
  {
    code: "R05",
    title: "Poisoning detection hooks",
    status: "scaffolded",
    body: "Integrity drift is modeled and can trigger critical responses, but full poisoning analysis is still ahead.",
  },
  {
    code: "R06",
    title: "Energy-aware mitigation",
    status: "scaffolded",
    body: "Battery-sensitive action scaling is implemented; verifiable isolation is still planned.",
  },
  {
    code: "R09",
    title: "Adaptive response strength",
    status: "foundation",
    body: "Threat score and battery state already shape the response chosen by the runtime.",
  },
  {
    code: "R10",
    title: "Rollback semantics",
    status: "scaffolded",
    body: "The policy can demand rollback-and-escalate, but device snapshots and restore logic are not built yet.",
  },
  {
    code: "R11",
    title: "Verifiable logging",
    status: "scaffolded",
    body: "A chained audit trail exists now; post-quantum signatures remain future work.",
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

function renderImplemented() {
  const root = document.querySelector("#implemented-grid");
  implemented.forEach((item, index) => {
    const article = document.createElement("article");
    article.className = "feature-card";
    article.style.animationDelay = `${index * 70}ms`;
    article.innerHTML = `<h3>${item.title}</h3><p>${item.body}</p>`;
    root.appendChild(article);
  });
}

function renderBacklog() {
  const root = document.querySelector("#backlog-list");
  backlog.forEach((item) => {
    const article = document.createElement("article");
    article.className = "stacked-item";
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
      <p>${track.body}</p>
    `;
    root.appendChild(article);
  });
}

renderMetrics();
renderImplemented();
renderBacklog();
renderTracks();
