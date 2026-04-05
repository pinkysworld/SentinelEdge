#!/usr/bin/env bash
# Wardex Demo Seed Script
# Populates Wardex with realistic demo data via the API.
# Usage: ./seed.sh [base_url] [token]

set -euo pipefail

BASE="${1:-http://localhost:8080}"
TOKEN="${2:-demo-token}"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

echo "🌱 Seeding Wardex demo data at $BASE ..."

# ── Wait for server ────────────────────────────────────────
echo "  Waiting for server..."
for i in $(seq 1 30); do
  if curl -sf "$BASE/api/health" > /dev/null 2>&1; then
    echo "  Server ready."
    break
  fi
  sleep 1
done

# ── Seed alerts ────────────────────────────────────────────
echo "  Seeding alerts..."
for f in seed-data/alerts/*.json; do
  [ -f "$f" ] || continue
  curl -sf -X POST "$BASE/api/alerts" -H "$AUTH" -H "$CT" -d @"$f" > /dev/null
done

# ── Seed agents ────────────────────────────────────────────
echo "  Seeding fleet agents..."
for f in seed-data/agents/*.json; do
  [ -f "$f" ] || continue
  curl -sf -X POST "$BASE/api/fleet/enroll" -H "$AUTH" -H "$CT" -d @"$f" > /dev/null
done

# ── Seed incidents ─────────────────────────────────────────
echo "  Seeding incidents..."
for f in seed-data/incidents/*.json; do
  [ -f "$f" ] || continue
  curl -sf -X POST "$BASE/api/incidents" -H "$AUTH" -H "$CT" -d @"$f" > /dev/null
done

# ── Seed cases ─────────────────────────────────────────────
echo "  Seeding cases..."
for f in seed-data/cases/*.json; do
  [ -f "$f" ] || continue
  curl -sf -X POST "$BASE/api/cases" -H "$AUTH" -H "$CT" -d @"$f" > /dev/null
done

# ── Seed threat intel ──────────────────────────────────────
echo "  Seeding threat intel IoCs..."
for f in seed-data/threat_intel/*.json; do
  [ -f "$f" ] || continue
  curl -sf -X POST "$BASE/api/threat-intel/ingest" -H "$AUTH" -H "$CT" -d @"$f" > /dev/null
done

echo "✅ Demo seed complete."
