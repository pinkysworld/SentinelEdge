// ── Data ─────────────────────────────────────────────────────────────────────

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
    tag: "detector.rs",
    title: "Adaptive Detector",
    body: "A rolling baseline tracks normal telemetry and turns sudden drift into an explainable anomaly score across CPU, memory, temperature, bandwidth, authentication failures, and integrity drift.",
  },
  {
    size: "compact",
    tag: "policy.rs",
    title: "Policy Engine",
    body: "Threat scores become concrete mitigation actions, softened when battery is constrained.",
  },
  {
    size: "compact",
    tag: "audit.rs",
    title: "Audit Chain",
    body: "Every detection and response step is written into a chained forensic log for replay and inspection.",
  },
  {
    size: "tall",
    tag: "runtime.rs",
    title: "Trace Analysis",
    body: "CSV telemetry traces make attack scenarios easy to replay, compare, and test before connecting live device feeds.",
  },
  {
    size: "tall",
    tag: "docs/",
    title: "Docs + Backlog",
    body: "Architecture, getting started, status, backlog, and the research-track map keep the repository grounded in what actually exists.",
  },
  {
    size: "wide",
    tag: "site/",
    title: "Pages Presence",
    body: "The GitHub Pages site presents the current milestone with a clearer visual hierarchy and a more public-facing narrative.",
  },
];

const docItems = [
  {
    title: "Architecture",
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>`,
    summary: "Four-stage pipeline: Ingest → Detect → Respond → Audit. Five Rust modules with clear responsibility boundaries.",
    sections: [
      {
        label: "Runtime pipeline",
        body: "CSV samples are parsed into typed TelemetrySample records. An AnomalyDetector maintains an EWMA-like baseline for normal behaviour. Deviations across CPU, memory, temperature, bandwidth, auth failures, and integrity drift are weighted into a single anomaly score. A PolicyEngine maps that score into a threat level and response action. Battery state can soften heavy-handed actions. Every decision is appended to a tamper-evident chained audit log.",
      },
      {
        label: "Module map",
        items: [
          { name: "src/telemetry.rs", desc: "Input parsing and sample validation" },
          { name: "src/detector.rs", desc: "Adaptive scoring logic and anomaly explanations" },
          { name: "src/policy.rs", desc: "Response mapping: nominal / elevated / severe / critical" },
          { name: "src/audit.rs", desc: "Tamper-evident run log chaining" },
          { name: "src/runtime.rs", desc: "Orchestration, summaries, and CLI-facing report rendering" },
        ],
      },
    ],
  },
  {
    title: "Getting Started",
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    summary: "Clone the repo, run the example trace, inspect the audit output. Requires only a stable Rust toolchain.",
    sections: [
      {
        label: "Prerequisites",
        body: "Stable Rust toolchain (1.75+). No external dependencies beyond cargo.",
      },
      {
        label: "Three commands to start",
        items: [
          { name: "cargo run -- analyze examples/credential_storm.csv", desc: "Run the full pipeline on the sample trace" },
          { name: "cargo test", desc: "Run the test suite" },
          { name: "cargo run -- report examples/credential_storm.csv", desc: "Print the formatted audit report" },
        ],
      },
    ],
  },
  {
    title: "Research Tracks",
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h8M3 13h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    summary: "25 blueprint tracks from adaptive detection to quantum-resistant audit logs — with honest implementation status for each.",
    link: "#tracks",
    linkLabel: "Browse all 25 tracks →",
  },
  {
    title: "Status & Backlog",
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M9 6v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    summary: "What ships today, what is scaffolded, and what comes next. The backlog is public and always up to date.",
    link: "#roadmap",
    linkLabel: "See next engineering moves →",
  },
];

const backlog = [
  {
    tag: "M02",
    title: "Persist learned baselines",
    body: "Store and reload adaptive baselines so the runtime improves across sessions instead of relearning from scratch.",
  },
  {
    tag: "M02",
    title: "Real device action adapters",
    body: "Replace abstract response labels with pluggable implementations for throttling, service isolation, and rollback hooks.",
  },
  {
    tag: "M02",
    title: "Cryptographic audit upgrades",
    body: "Swap the prototype digest chain for stronger cryptographic checkpoints and signed audit anchors.",
  },
  {
    tag: "M02",
    title: "Choose the first research subset",
    body: "Decide which advanced blueprint tracks move from idea status into the first deeper implementation wave.",
  },
];

const trackGroups = [
  {
    id: "detection",
    label: "Core detection & fusion",
    tracks: [
      {
        code: "R01",
        title: "Adaptive anomaly detection",
        status: "foundation",
        body: "Let the edge runtime learn a changing local baseline instead of relying on fixed thresholds or cloud retraining.",
        idea: "Adaptive multi-signal scoring with a rolling EWMA-like baseline across CPU, memory, temperature, bandwidth, auth failures, and integrity drift.",
        matters: "Edge devices drift over time, so adaptive on-device learning is essential for detection to stay useful.",
        state: "Adaptive multi-signal scoring exists. Missing: replay buffer, continual learning loop, differential privacy, and proof-carrying updates.",
      },
      {
        code: "R02",
        title: "Formal verification of detection rules",
        status: "planned",
        body: "Represent the detection policy as a formally specified state machine and validate runtime behaviour against that specification.",
        idea: "Statically verified detection logic with runtime conformance checking against a formal rule model.",
        matters: "Moves the system from 'heuristically works' toward 'we can state and check what correctness means.'",
        state: "No formal rule model or runtime checker exists yet.",
      },
      {
        code: "R03",
        title: "Cross-device swarm intelligence",
        status: "future",
        body: "Let multiple devices share partial threat signals and collectively detect patterns that any one node would miss.",
        idea: "Privacy-preserving aggregation of low-confidence evidence across a device fleet.",
        matters: "Many real attacks only become obvious when evidence is aggregated across a fleet.",
        state: "No cross-device communication in the prototype.",
      },
      {
        code: "R04",
        title: "Quantum-inspired propagation modeling",
        status: "future",
        body: "Use quantum-walk-inspired models to predict how suspicious behaviour may spread through a mesh or dependency graph.",
        idea: "Predictive threat-spread modeling using quantum-walk mathematics on device topology graphs.",
        matters: "Turns SentinelEdge from purely reactive detection toward predictive isolation planning.",
        state: "No propagation graph or predictive spread model exists yet.",
      },
      {
        code: "R05",
        title: "Poisoning detection hooks",
        status: "scaffolded",
        body: "Detect when the local model or policy has been tampered with and force recovery to a known-good state.",
        idea: "Spectral poisoning analysis with trusted checkpoints and verifiable recovery.",
        matters: "A detector that can be poisoned without noticing is a weak security primitive.",
        state: "integrity_drift signal and critical escalation exist. Missing: poisoning analysis, trusted checkpoints, and real recovery.",
      },
    ],
  },
  {
    id: "response",
    label: "Response & mitigation",
    tracks: [
      {
        code: "R06",
        title: "Energy-aware mitigation",
        status: "scaffolded",
        body: "Choose mitigations that respect both security urgency and the device's remaining energy budget, then prove the action matched policy.",
        idea: "Formally verifiable energy-proportional isolation with graceful degradation.",
        matters: "Edge security cannot assume desktop-class power or cooling.",
        state: "Energy-aware downgrade logic exists. Missing: real isolation adapters and proof mechanisms.",
      },
      {
        code: "R07",
        title: "Self-healing network reconfiguration",
        status: "planned",
        body: "After isolating compromised nodes, automatically repair the network topology while preserving security invariants.",
        idea: "Topology-aware self-repair with zero-knowledge proofs of restoration integrity.",
        matters: "Isolation without recovery can turn defence into self-inflicted outage.",
        state: "No topology model or repair engine exists yet.",
      },
      {
        code: "R08",
        title: "Privacy-preserving coordinated response",
        status: "future",
        body: "Let devices coordinate a shared defence action without exposing raw local telemetry.",
        idea: "Secure multi-party computation for cross-device response coordination.",
        matters: "Fleet response becomes more useful when it does not require centralised visibility.",
        state: "No secure multi-party coordination path exists yet.",
      },
      {
        code: "R09",
        title: "Adaptive response strength",
        status: "foundation",
        body: "Map detection confidence and local constraints into different response intensities rather than a single fixed action.",
        idea: "Continuous response scaling: observe → rate-limit → quarantine → rollback-and-escalate.",
        matters: "Prevents overreaction on benign spikes and underreaction on truly dangerous events.",
        state: "Threat score and battery state already shape the response chosen by the runtime.",
      },
      {
        code: "R10",
        title: "Rollback semantics",
        status: "scaffolded",
        body: "Restore device state to a known-safe checkpoint and preserve a verifiable record of what was changed.",
        idea: "Snapshot-based state recovery with cryptographic proof of restoration.",
        matters: "Recovery is far more credible when it can be replayed and audited after the incident.",
        state: "Rollback is a policy action and the audit trail is present. Missing: state snapshots and restore logic.",
      },
    ],
  },
  {
    id: "audit",
    label: "Verifiability & audit",
    tracks: [
      {
        code: "R11",
        title: "Verifiable logging",
        status: "scaffolded",
        body: "Make the event history tamper-evident and signed with algorithms that remain viable in a post-quantum setting.",
        idea: "Post-quantum cryptographic audit log with selective disclosure.",
        matters: "'Verifiable security' depends on the evidence trail remaining trustworthy.",
        state: "Chained audit trail exists. Missing: cryptographic and post-quantum signatures.",
      },
      {
        code: "R12",
        title: "Zero-knowledge device state proof",
        status: "future",
        body: "Prove that a device was in a particular historical state without disclosing the underlying sensitive data.",
        idea: "ZK-SNARK-based historical state attestation for privacy-preserving audits.",
        matters: "Allows audits and incident response without exposing full device contents.",
        state: "No historical state proof machinery yet.",
      },
      {
        code: "R13",
        title: "Regulatory-compliant verifiable export",
        status: "planned",
        body: "Export only the subset of logs or evidence required for a regulator while proving the rest was not altered.",
        idea: "Selective disclosure log export with redaction proofs.",
        matters: "Many real deployments need auditability and privacy at the same time.",
        state: "No selective disclosure export flow exists yet.",
      },
      {
        code: "R14",
        title: "Energy-harvesting archival scheduler",
        status: "future",
        body: "Defer expensive archival work until harvested energy is available, such as solar or scavenged power.",
        idea: "Energy-aware deferral of expensive storage operations based on harvest prediction.",
        matters: "Long-lived remote edge devices often operate under severe energy constraints.",
        state: "No archival scheduler yet.",
      },
      {
        code: "R15",
        title: "Cross-device threat intelligence sharing",
        status: "future",
        body: "Let nodes share threat indicators with proof of provenance and integrity.",
        idea: "Signed, provenance-verifiable threat indicator exchange protocol.",
        matters: "Shared signatures become more trustworthy when receivers can verify their source.",
        state: "No threat-intelligence exchange protocol exists yet.",
      },
    ],
  },
  {
    id: "advanced",
    label: "Advanced & forward-looking",
    tracks: [
      {
        code: "R16",
        title: "Hardware root-of-trust integration",
        status: "planned",
        body: "Bind critical keys or trust anchors to TPM, secure enclave, or similar hardware where available.",
        idea: "Hardware-attested trust anchors via TPM or secure enclave integration.",
        matters: "The runtime becomes harder to subvert when its root secrets are not just files on disk.",
        state: "No hardware-attestation path exists yet.",
      },
      {
        code: "R17",
        title: "Wasm-based extensible policies",
        status: "planned",
        body: "Let users ship custom detection or response logic as sandboxed Wasm modules.",
        idea: "Sandboxed, user-authored detection and response plugins via WebAssembly.",
        matters: "Opens the project to extension without requiring forks of the core runtime.",
        state: "No Wasm policy surface or sandbox exists yet.",
      },
      {
        code: "R18",
        title: "Energy-proportional model quantization",
        status: "future",
        body: "Adjust model precision to save energy, while proving the detector stayed within an acceptable accuracy envelope.",
        idea: "Adaptive quantization with verifiable accuracy bounds.",
        matters: "Edge deployments often need to trade precision for power without losing trust in the result.",
        state: "Prototype does not include quantized models.",
      },
      {
        code: "R19",
        title: "Causal false-positive reduction",
        status: "future",
        body: "Use lightweight causal models to distinguish actual threats from noisy correlations.",
        idea: "Causal inference layer to filter noisy anomaly signals from real threats.",
        matters: "False positives are one of the fastest ways to make operators stop trusting a detector.",
        state: "No causal inference layer exists yet.",
      },
      {
        code: "R20",
        title: "Verifiable supply-chain attestation",
        status: "planned",
        body: "Prove that the running firmware and model artifacts match a known-good build or vendor-signed release.",
        idea: "Firmware and model provenance verification at startup.",
        matters: "Strengthens trust before runtime detection even begins.",
        state: "No firmware or model attestation path exists yet.",
      },
      {
        code: "R21",
        title: "Quantum-resistant key rotation",
        status: "future",
        body: "Rotate keys periodically using post-quantum-safe primitives without burning too much device energy.",
        idea: "Energy-efficient post-quantum key lifecycle management.",
        matters: "Key hygiene is essential, but heavy cryptography can be expensive on small devices.",
        state: "Prototype has no key lifecycle subsystem.",
      },
      {
        code: "R22",
        title: "Cross-platform binary self-optimisation",
        status: "future",
        body: "Let the runtime specialise itself for different target architectures and energy profiles.",
        idea: "Architecture-aware JIT optimisation for heterogeneous edge hardware.",
        matters: "The project is edge-oriented, so hardware diversity is part of the challenge.",
        state: "No architecture-specific specialisation logic yet.",
      },
      {
        code: "R23",
        title: "Verifiable swarm defence coordination",
        status: "future",
        body: "Let multiple devices vote or coordinate on defensive action and prove the tally was honest.",
        idea: "Byzantine-fault-tolerant collective defence with verifiable tally proofs.",
        matters: "Collective defence becomes much stronger when no single node has to be blindly trusted.",
        state: "No multi-device voting or swarm defence layer yet.",
      },
      {
        code: "R24",
        title: "Energy-harvesting posture adjustment",
        status: "future",
        body: "Adapt cryptographic or defensive intensity based on predicted near-term energy availability.",
        idea: "Predictive energy-aware security posture scheduling.",
        matters: "A node with scarce harvested power may need a different posture than one with abundant power.",
        state: "No energy forecasting or posture scheduler yet.",
      },
      {
        code: "R25",
        title: "Long-term evolutionary model improvement",
        status: "future",
        body: "Let local models improve over months using bounded evolutionary search instead of one-shot training.",
        idea: "Bounded evolutionary model optimisation for long-term self-improvement.",
        matters: "The longest-horizon path toward self-improving edge detection without cloud dependence.",
        state: "No long-horizon model adaptation system yet.",
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function chevronSVG() {
  return `<svg class="btn-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function wireExpand(btn, container, openLabel, closeLabel) {
  btn.addEventListener("click", () => {
    const isOpen = container.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(isOpen));
    btn.querySelector(".btn-label").textContent = isOpen ? closeLabel : openLabel;
  });
}

// ── Renderers ─────────────────────────────────────────────────────────────────

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
    article.innerHTML = `
      <div class="card-top-row">
        <h3>${item.title}</h3>
        <span class="card-tag">${item.tag}</span>
      </div>
      <p>${item.body}</p>
    `;
    root.appendChild(article);
  });
}

function renderDocs() {
  const root = document.querySelector("#docs-grid");
  if (!root) return;

  docItems.forEach((doc, index) => {
    const article = document.createElement("article");
    article.className = "doc-card";
    article.style.animationDelay = `${index * 70}ms`;

    let sectionsHTML = "";
    if (doc.sections) {
      doc.sections.forEach((section) => {
        if (section.items) {
          const listItems = section.items
            .map((it) => `<li><code>${it.name}</code><span>${it.desc}</span></li>`)
            .join("");
          sectionsHTML += `
            <div class="doc-section">
              <p class="doc-section-label">${section.label}</p>
              <ul class="doc-section-list">${listItems}</ul>
            </div>`;
        } else {
          sectionsHTML += `
            <div class="doc-section">
              <p class="doc-section-label">${section.label}</p>
              <p class="doc-section-body">${section.body}</p>
            </div>`;
        }
      });
    }

    const hasExpand = !!doc.sections;
    const hasLink = !!doc.link;

    article.innerHTML = `
      <div class="doc-card-icon">${doc.icon}</div>
      <h3>${doc.title}</h3>
      <p class="doc-card-summary">${doc.summary}</p>
      ${hasLink ? `<a class="doc-card-link" href="${doc.link}">${doc.linkLabel}</a>` : ""}
      ${hasExpand ? `
        <button class="expand-btn" aria-expanded="false">
          <span class="btn-label">View details</span>${chevronSVG()}
        </button>
        <div class="expandable doc-detail">
          <div class="expandable-inner">${sectionsHTML}</div>
        </div>` : ""}
    `;

    root.appendChild(article);

    if (hasExpand) {
      const btn = article.querySelector(".expand-btn");
      wireExpand(btn, article, "View details", "Hide details");
    }
  });
}

function renderBacklog() {
  const root = document.querySelector("#backlog-list");
  backlog.forEach((item) => {
    const article = document.createElement("article");
    article.className = "timeline-item";
    article.innerHTML = `
      <div class="timeline-item-header">
        <strong>${item.title}</strong>
        <span class="card-tag">${item.tag}</span>
      </div>
      <p>${item.body}</p>
    `;
    root.appendChild(article);
  });
}

function renderTrackGroups() {
  const root = document.querySelector("#tracks-grid");
  if (!root) return;

  trackGroups.forEach((group) => {
    const groupEl = document.createElement("div");
    groupEl.className = "track-group";

    const countLabel = group.tracks.length === 1 ? "1 track" : `${group.tracks.length} tracks`;
    groupEl.innerHTML = `
      <div class="track-group-header">
        <span class="track-group-label">${group.label}</span>
        <span class="track-group-count">${countLabel}</span>
      </div>
      <div class="track-group-grid" id="group-${group.id}"></div>
    `;

    root.appendChild(groupEl);

    const grid = groupEl.querySelector(`#group-${group.id}`);
    group.tracks.forEach((track, index) => {
      const article = document.createElement("article");
      article.className = "track-card";
      article.style.animationDelay = `${index * 60}ms`;

      article.innerHTML = `
        <div class="badge ${track.status}">${track.code} · ${track.status}</div>
        <h3>${track.title}</h3>
        <p class="track-why">${track.body}</p>
        <button class="expand-btn" aria-expanded="false">
          <span class="btn-label">View details</span>${chevronSVG()}
        </button>
        <div class="expandable track-detail">
          <div class="expandable-inner">
            <dl class="track-detail-dl">
              <div>
                <dt>Research idea</dt>
                <dd>${track.idea}</dd>
              </div>
              <div>
                <dt>Why it matters</dt>
                <dd>${track.matters}</dd>
              </div>
              <div>
                <dt>Current prototype</dt>
                <dd>${track.state}</dd>
              </div>
            </dl>
          </div>
        </div>
      `;

      grid.appendChild(article);

      const btn = article.querySelector(".expand-btn");
      wireExpand(btn, article, "View details", "Hide details");
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

renderMetrics();
renderRibbon();
renderImplemented();
renderDocs();
renderBacklog();
renderTrackGroups();
