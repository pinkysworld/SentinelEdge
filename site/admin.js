const DEFAULT_STATUS_URL = "data/status.json";
const DEFAULT_REPORT_URL = "data/demo-report.json";

const commandDescriptions = {
  demo: { purpose: "Run built-in demo trace and write audit output", mode: "CLI" },
  analyze: { purpose: "Analyze CSV or JSONL telemetry through the full pipeline", mode: "CLI" },
  report: { purpose: "Export structured JSON report for SIEM or browser review", mode: "CLI" },
  "init-config": { purpose: "Write default TOML configuration", mode: "CLI" },
  status: { purpose: "Render human-readable implementation snapshot", mode: "CLI" },
  "status-json": { purpose: "Export structured status JSON for the browser console", mode: "CLI + Browser" },
};

const statusEls = {
  banner: document.getElementById("console-banner"),
  summary: document.getElementById("status-summary-grid"),
  implemented: document.getElementById("status-implemented-list"),
  partial: document.getElementById("status-partial-list"),
  missing: document.getElementById("status-missing-list"),
  commands: document.getElementById("command-rows"),
};

const reportEls = {
  summary: document.getElementById("report-summary-grid"),
  rows: document.getElementById("report-rows"),
  empty: document.getElementById("sample-detail-empty"),
  detail: document.getElementById("sample-detail"),
  meta: document.getElementById("sample-detail-meta"),
  telemetry: document.getElementById("sample-telemetry-grid"),
  anomaly: document.getElementById("sample-anomaly-grid"),
  decision: document.getElementById("sample-decision-grid"),
  reasons: document.getElementById("sample-reasons"),
};

let currentReport = null;
let selectedSampleIndex = -1;

function setBanner(text, kind = "info") {
  if (!statusEls.banner) return;
  statusEls.banner.textContent = text;
  statusEls.banner.dataset.kind = kind;
}

function createSummaryCard(label, value, note = "") {
  const card = document.createElement("div");
  card.className = "stat-card admin-summary-card";
  card.innerHTML = `
    <div class="stat-header">${label}</div>
    <div class="stat-value admin-stat-value">${value}</div>
    ${note ? `<p class="admin-summary-note">${note}</p>` : ""}
  `;
  return card;
}

function clearChildren(el) {
  if (el) el.replaceChildren();
}

function appendList(el, items) {
  clearChildren(el);
  items.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    el.appendChild(li);
  });
}

function renderStatus(manifest) {
  const backlogPct = manifest.backlog_total === 0
    ? 0
    : Math.round((manifest.backlog_completed / manifest.backlog_total) * 100);
  const phasePct = manifest.total_phases === 0
    ? 0
    : Math.round((manifest.completed_phases / manifest.total_phases) * 100);

  clearChildren(statusEls.summary);
  statusEls.summary.append(
    createSummaryCard("Updated", manifest.updated_at),
    createSummaryCard("Backlog", `${manifest.backlog_completed}/${manifest.backlog_total}`, `${backlogPct}% complete`),
    createSummaryCard("Phases", `${manifest.completed_phases}/${manifest.total_phases}`, `${phasePct}% of defined phases complete`),
    createSummaryCard("Commands", `${manifest.cli_commands.length}`, "Browser console is read-only")
  );

  appendList(statusEls.implemented, manifest.implemented || []);
  appendList(statusEls.partial, manifest.partially_wired || []);
  appendList(statusEls.missing, manifest.not_implemented || []);

  clearChildren(statusEls.commands);
  (manifest.cli_commands || []).forEach(command => {
    const row = document.createElement("div");
    row.className = "module-row";
    const info = commandDescriptions[command] || { purpose: "Command available", mode: "CLI" };
    row.innerHTML = `
      <code>${command}</code>
      <span>${info.purpose}</span>
      <span class="module-tracks">${info.mode}</span>
    `;
    statusEls.commands.appendChild(row);
  });
}

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function severityClass(level) {
  const normalized = String(level || "nominal").toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "severe") return "severe";
  if (normalized === "elevated") return "elevated";
  return "nominal";
}

function renderKvGrid(el, entries) {
  clearChildren(el);
  entries.forEach(([key, value]) => {
    const item = document.createElement("div");
    item.className = "admin-kv-item";
    item.innerHTML = `<span class="admin-kv-key">${key}</span><strong>${value}</strong>`;
    el.appendChild(item);
  });
}

function renderSampleDetail(sample) {
  if (!sample) {
    reportEls.empty.hidden = false;
    reportEls.detail.hidden = true;
    return;
  }

  reportEls.empty.hidden = true;
  reportEls.detail.hidden = false;

  reportEls.meta.innerHTML = `
    <span class="track-badge ${severityClass(sample.decision.threat_level)}">${sample.decision.threat_level}</span>
    <span>Sample #${sample.index}</span>
    <span>t=${sample.timestamp_ms}</span>
  `;

  renderKvGrid(reportEls.telemetry, [
    ["CPU", `${formatNumber(sample.telemetry.cpu_load_pct, 1)}%`],
    ["Memory", `${formatNumber(sample.telemetry.memory_load_pct, 1)}%`],
    ["Temp", `${formatNumber(sample.telemetry.temperature_c, 1)} C`],
    ["Network", `${formatNumber(sample.telemetry.network_kbps, 0)} kbps`],
    ["Auth Failures", sample.telemetry.auth_failures],
    ["Battery", `${formatNumber(sample.telemetry.battery_pct, 1)}%`],
    ["Integrity Drift", formatNumber(sample.telemetry.integrity_drift, 3)],
  ]);

  renderKvGrid(reportEls.anomaly, [
    ["Score", formatNumber(sample.anomaly.score, 2)],
    ["Confidence", formatNumber(sample.anomaly.confidence, 2)],
    ["Axes", sample.anomaly.suspicious_axes],
  ]);

  renderKvGrid(reportEls.decision, [
    ["Threat", sample.decision.threat_level],
    ["Action", sample.decision.action],
    ["Isolation", `${sample.decision.isolation_pct}%`],
    ["Rationale", sample.decision.rationale],
  ]);

  clearChildren(reportEls.reasons);
  (sample.anomaly.reasons || []).forEach(reason => {
    const li = document.createElement("li");
    li.textContent = reason;
    reportEls.reasons.appendChild(li);
  });
}

function selectSample(index) {
  selectedSampleIndex = index;
  const sample = currentReport?.samples?.[index];
  renderSampleDetail(sample);

  document.querySelectorAll(".admin-report-row").forEach((row, rowIndex) => {
    row.classList.toggle("selected", rowIndex === index);
  });
}

function renderReport(report) {
  currentReport = report;

  clearChildren(reportEls.summary);
  reportEls.summary.append(
    createSummaryCard("Report Version", report.version || "n/a", report.generated_at || ""),
    createSummaryCard("Samples", report.summary.total_samples),
    createSummaryCard("Alerts", report.summary.alert_count, `${report.summary.critical_count} critical`),
    createSummaryCard("Average Score", formatNumber(report.summary.average_score, 2), `max ${formatNumber(report.summary.max_score, 2)}`)
  );

  clearChildren(reportEls.rows);
  (report.samples || []).forEach((sample, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "module-row admin-report-row";
    row.innerHTML = `
      <span>
        <strong>#${sample.index}</strong><br>
        <span class="admin-inline-meta">t=${sample.timestamp_ms}</span>
      </span>
      <span>
        <span class="track-badge ${severityClass(sample.decision.threat_level)}">${sample.decision.threat_level}</span><br>
        <span class="admin-inline-meta">score ${formatNumber(sample.anomaly.score, 2)} · ${sample.anomaly.suspicious_axes} axes</span>
      </span>
      <span>
        <strong>${sample.decision.action}</strong><br>
        <span class="admin-inline-meta">isolation ${sample.decision.isolation_pct}%</span>
      </span>
    `;
    row.addEventListener("click", () => selectSample(index));
    reportEls.rows.appendChild(row);
  });

  selectSample(report.samples?.length ? 0 : -1);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`failed to load ${url}`);
  }
  return response.json();
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("failed to read file"));
    reader.readAsText(file);
  });
}

function bindFileInput(inputId, onJsonLoaded, label) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const json = await readJsonFile(file);
      onJsonLoaded(json);
      setBanner(`${label} loaded from ${file.name}.`, "success");
    } catch (error) {
      setBanner(`Failed to parse ${label.toLowerCase()} file: ${error.message}`, "error");
    }
  });
}

function initButtons() {
  document.getElementById("load-default-status")?.addEventListener("click", async () => {
    try {
      const json = await fetchJson(DEFAULT_STATUS_URL);
      renderStatus(json);
      setBanner("Bundled status snapshot loaded.", "success");
    } catch (error) {
      setBanner(`Failed to load bundled status: ${error.message}`, "error");
    }
  });

  document.getElementById("load-default-report")?.addEventListener("click", async () => {
    try {
      const json = await fetchJson(DEFAULT_REPORT_URL);
      renderReport(json);
      setBanner("Bundled demo report loaded.", "success");
    } catch (error) {
      setBanner(`Failed to load bundled report: ${error.message}`, "error");
    }
  });
}

async function init() {
  bindFileInput("status-file", renderStatus, "Status JSON");
  bindFileInput("report-file", renderReport, "Report JSON");
  initButtons();

  try {
    const [status, report] = await Promise.all([
      fetchJson(DEFAULT_STATUS_URL),
      fetchJson(DEFAULT_REPORT_URL),
    ]);
    renderStatus(status);
    renderReport(report);
    setBanner("Bundled status snapshot and demo report loaded.", "success");
  } catch (error) {
    setBanner(`Console loaded without bundled data: ${error.message}`, "error");
  }
}

init();