// k6 API load test for Wardex HTTP server.
//
// Prerequisites:
//   brew install k6          # macOS
//   apt install k6           # Debian/Ubuntu
//
// Usage:
//   # Start wardex server first, then:
//   WARDEX_URL=http://localhost:8080 WARDEX_TOKEN=<token> k6 run tests/load/k6_api.js
//
//   # Quick smoke test (10 VUs, 30s):
//   k6 run --vus 10 --duration 30s tests/load/k6_api.js
//
//   # Sustained load (50 VUs, 5 min):
//   k6 run --vus 50 --duration 5m tests/load/k6_api.js

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Configuration ──────────────────────────────────────────
const BASE_URL = __ENV.WARDEX_URL || "http://localhost:8080";
const TOKEN = __ENV.WARDEX_TOKEN || "test";

const errorRate = new Rate("errors");
const alertLatency = new Trend("alert_list_latency", true);
const statusLatency = new Trend("status_latency", true);
const reportLatency = new Trend("report_latency", true);
const ingestLatency = new Trend("ingest_latency", true);

export const options = {
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"], // 95th < 500ms, 99th < 1s
    errors: ["rate<0.01"],                           // <1% error rate
  },
  scenarios: {
    // Ramp up to target VUs, sustain, then ramp down.
    default: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "10s", target: 20 },
        { duration: "30s", target: 20 },
        { duration: "10s", target: 0 },
      ],
    },
  },
};

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

// ── Scenarios ──────────────────────────────────────────────

export default function () {
  group("GET /api/status", () => {
    const res = http.get(`${BASE_URL}/api/status`, { headers, tags: { endpoint: "status" } });
    statusLatency.add(res.timings.duration);
    const ok = check(res, {
      "status 200": (r) => r.status === 200,
      "has version": (r) => JSON.parse(r.body).version !== undefined,
    });
    errorRate.add(!ok);
  });

  group("GET /api/report", () => {
    const res = http.get(`${BASE_URL}/api/report`, { headers, tags: { endpoint: "report" } });
    reportLatency.add(res.timings.duration);
    const ok = check(res, { "report 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  group("GET /api/alerts", () => {
    const res = http.get(`${BASE_URL}/api/alerts`, { headers, tags: { endpoint: "alerts" } });
    alertLatency.add(res.timings.duration);
    const ok = check(res, {
      "alerts 200": (r) => r.status === 200,
      "is array": (r) => Array.isArray(JSON.parse(r.body)),
    });
    errorRate.add(!ok);
  });

  group("GET /api/health", () => {
    const res = http.get(`${BASE_URL}/api/health`, { headers, tags: { endpoint: "health" } });
    const ok = check(res, { "health 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  group("POST /api/analyze (ingest)", () => {
    const payload = JSON.stringify({
      samples: [
        {
          timestamp: new Date().toISOString(),
          device_id: `load-test-${__VU}`,
          cpu_usage: 30 + Math.random() * 40,
          memory_usage: 40 + Math.random() * 30,
          network_bytes_sent: Math.floor(Math.random() * 100000),
          network_bytes_recv: Math.floor(Math.random() * 100000),
          process_name: "svchost.exe",
          process_count: Math.floor(80 + Math.random() * 40),
        },
      ],
    });
    const res = http.post(`${BASE_URL}/api/analyze`, payload, {
      headers,
      tags: { endpoint: "analyze" },
    });
    ingestLatency.add(res.timings.duration);
    const ok = check(res, { "analyze 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  group("GET /api/telemetry/current", () => {
    const res = http.get(`${BASE_URL}/api/telemetry/current`, {
      headers,
      tags: { endpoint: "telemetry" },
    });
    const ok = check(res, { "telemetry 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  // Brief pause between iterations to avoid hammering beyond intended rate.
  sleep(0.1);
}
