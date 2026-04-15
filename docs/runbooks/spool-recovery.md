# Spool Recovery & Key Rotation Runbook

## Overview

The encrypted spool (ChaCha20-Poly1305) queues telemetry and alerts for reliable delivery. This runbook covers recovery procedures when spool data becomes unreadable or the encryption key needs rotation.

## Prerequisites

- Admin access to the Wardex host
- Current `WARDEX_SPOOL_KEY` value (or `WARDEX_ADMIN_TOKEN` if the key was derived)
- Backup of `var/` directory (see DISASTER_RECOVERY.md)

## Spool Architecture

| Component | Location | Purpose |
|-----------|----------|---------|
| Spool data | In-memory (up to 10,000 entries) | Buffered telemetry for resilient delivery |
| Spool key | `WARDEX_SPOOL_KEY` env var | ChaCha20-Poly1305 encryption key (SHA-256 hashed) |
| Fallback key | Derived from admin token | Used when `WARDEX_SPOOL_KEY` is not set (dev only) |

## Scenario 1: Spool Key Rotation

### When to rotate

- Suspected key compromise
- Periodic rotation policy (recommended: quarterly)
- Personnel change with key access

### Procedure

1. **Drain the spool** before rotation:
   ```bash
   # Verify spool is empty or near-empty via API
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/health | jq .spool_depth
   ```

2. **Stop accepting new telemetry** (optional, for zero-loss rotation):
   ```bash
   # Pause agent heartbeats temporarily (agents will re-queue locally)
   ```

3. **Set the new spool key**:
   ```bash
   export WARDEX_SPOOL_KEY="new-secret-value-$(openssl rand -hex 32)"
   ```

4. **Restart the service**:
   ```bash
   # systemd
   sudo systemctl restart wardex

   # Docker
   docker compose restart wardex

   # Kubernetes
   kubectl rollout restart deployment/wardex
   ```

5. **Verify spool is functional**:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/health | jq .status
   ```

### Impact

- In-flight spool entries encrypted with the old key are lost on restart
- Agents will re-send any unacknowledged telemetry
- No data loss if spool was drained before rotation

## Scenario 2: Spool Data Unreadable

### Symptoms

- Log messages: `spool decryption failed` or `invalid ciphertext`
- Telemetry delivery stalls (spool depth grows but nothing is forwarded)

### Root cause

- Admin token was rotated without `WARDEX_SPOOL_KEY` set (key derived from token changed)
- `WARDEX_SPOOL_KEY` was changed without draining the spool

### Recovery

1. **If you still have the old key** — temporarily restore it and drain:
   ```bash
   export WARDEX_SPOOL_KEY="old-key-value"
   sudo systemctl restart wardex
   # Wait for spool to drain
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/health | jq .spool_depth
   # Then switch to new key
   export WARDEX_SPOOL_KEY="new-key-value"
   sudo systemctl restart wardex
   ```

2. **If the old key is lost** — accept data loss and reset:
   ```bash
   # The spool is in-memory; a restart with the new key clears stale entries
   export WARDEX_SPOOL_KEY="new-key-value"
   sudo systemctl restart wardex
   ```

3. **Verify recovery**:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/health
   ```

## Scenario 3: Full Spool Recovery from Backup

1. **Stop the service**:
   ```bash
   sudo systemctl stop wardex
   ```

2. **Restore from backup**:
   ```bash
   # Decrypt backup
   age -d -i /path/to/key var/backup-YYYYMMDD.tar.gz.age > backup.tar.gz
   tar xzf backup.tar.gz -C /var/lib/wardex/
   ```

3. **Ensure correct spool key is set** and restart:
   ```bash
   sudo systemctl start wardex
   ```

## Prevention

- **Always set `WARDEX_SPOOL_KEY` in production** (required when `WARDEX_ENV=production`)
- Store the key in a secrets manager (Vault, AWS Secrets Manager, K8s Secret)
- Document the current key value in your team's secure credential store
- Drain the spool before any key rotation
- Monitor `wardex_spool_depth` metric and alert when it exceeds thresholds
