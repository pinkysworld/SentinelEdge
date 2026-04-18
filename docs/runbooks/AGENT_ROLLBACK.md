# Runbook: Agent Rollback

**Audience:** on-call SOC engineer or platform operator.
**When to use:** a recently rolled-out agent version is causing alert noise,
elevated CPU, crashloops, enrichment regressions, or any blast-radius event
that exceeds the change's expected impact.
**Expected duration:** 5–15 minutes.

## 0. Confirm rollback is the right response

Before rolling back, confirm at least one of the following is true:

- New-version fleet is showing ≥ 3× the prior baseline rate of `agent.error`
  events in [Live Monitor](../../admin-console/src/components/LiveMonitor.jsx).
- A detection rule added in the current release is producing obviously
  incorrect alerts and cannot be muted via Policy > Suppressions.
- A regression has been filed for the same version by a second, independent
  operator.

If the blast radius is limited to a specific site or cohort, prefer a
[policy suppression](./response-playbooks.md) over a global rollback.

## 1. Identify the target version

```bash
# From the control plane host (or via the SDK):
wardex agent-version-summary
```

Capture:

- `current` — the version the fleet is currently advertising.
- `previous` — the last version marked `healthy` (this is the rollback target).
- `pinned` — any versions forcibly pinned via `deploy/auto-update.toml`.

## 2. Trigger the rollback

### Option A — Admin Console (recommended)

1. Open **Fleet → Agents → Update Channels**.
2. Select the current channel (e.g. `stable`).
3. Click **Rollback to previous** and confirm.
4. The console calls `POST /api/fleet/channels/{name}/rollback` and logs an
   operator audit event (`fleet.rollback.initiated`).

### Option B — CLI

```bash
wardex fleet channel rollback stable --to <previous-version>
```

### Option C — Emergency pin

If the console and API are unresponsive:

```bash
# On the control plane host, as root:
wardex --config /etc/wardex/wardex.toml fleet pin stable <previous-version>
systemctl reload wardex
```

This writes a pin entry to `deploy/auto-update.toml` that takes effect on the
next heartbeat cycle (≤ 60 s).

## 3. Verify propagation

```bash
# Watch agent versions converge over ~2–5 minutes:
watch -n 10 'wardex agent-version-summary | jq ".channels.stable"'
```

Rollback is complete when:

- `channels.stable.current == <previous-version>`
- `channels.stable.drift == 0`
- No new `agent.update.failure` events appear in the [Live Monitor](../../admin-console/src/components/LiveMonitor.jsx).

## 4. Record & communicate

1. Capture an audit-log snapshot:
   ```bash
   wardex audit-export --since 1h --filter fleet.rollback > /tmp/rollback-$(date +%s).jsonl
   ```
2. File a post-incident note covering:
   - rolled-back version, reason, number of hosts affected;
   - the follow-up fix that will precede the next rollout;
   - links to the artifact provenance (`gh attestation verify` output) so the
     investigation can reason about the exact code that shipped.
3. Announce in the operator channel and update the incident tracker.

## 5. Resume normal cadence

When the follow-up fix has been released and verified in pre-prod:

```bash
# Remove the emergency pin:
wardex fleet channel unpin stable

# Resume the normal staged rollout:
wardex fleet channel resume stable
```

Re-verify propagation as in step 3.

## Related runbooks

- [`deployment.md`](deployment.md) — initial agent roll-out.
- [`spool-recovery.md`](spool-recovery.md) — when agents cannot reach the control plane.
- [`troubleshooting.md`](troubleshooting.md) — general diagnosis.
- [`../DISASTER_RECOVERY.md`](../DISASTER_RECOVERY.md) — full-platform restore.
