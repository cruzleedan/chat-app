---
id: 0006
title: "Make frontend health probe match the IPv4 listener"
status: building
kind: fix
opened: 2026-11-18
decided: 2026-11-18
branch: fix/0006-frontend-health-probe
supersedes: ~
superseded-by: ~
---

# WORK-0006 — Make frontend health probe match the IPv4 listener

## Problem

The public chat page loads, but its wget localhost health check resolves IPv6
while nginx listens on IPv4. The known false alarm from the read-only WORK-0005
spike is still present after reboot. A direct 127.0.0.1 check succeeds.

## Decision

The owner's request to ensure production app availability authorizes this narrow
health-check repair. Use 127.0.0.1 in the Compose and image health checks; retain
the current frontend image/assets and environment during recreation. No UI,
backend, ChromaDB, alerting, authentication or dependency changes. This is a new
accepted fix; WORK-0005's historical read-only investigation remains unchanged.

## Definition of done

- [x] Health probe matches nginx's actual listener and container becomes healthy.
- [x] Public HTTPS page, scripts and read-only API endpoint checks pass.
- [x] Compose/nginx validation and rollout/rollback evidence recorded.

## Log

- 2026-11-18 building — owner requested all production apps accessible after reboot. Reproduced false localhost health failure; 127.0.0.1 exits 0. Compose environment matches the running container.

- 2026-11-18 shipped — Compose and Dockerfile health probes use 127.0.0.1. Compose/nginx configuration checks passed. Recreated only frontend using an explicit immutable-image override, no build/dependency restart. Before/after frontend image identical: sha256:31fd5162f12d9fb7aa9b4edfafd5946745a6bbbf3cf66701947130eab13d277f. Environment matched the existing deployed container; backend/data/ChromaDB untouched. Docker health is now healthy. Rollback is the same immutable image with the prior localhost health configuration; no storage changes.

- 2026-11-18 public verification — HTTPS root and its JavaScript asset, /api/chat/tone and /docs/ return 200 through Cloudflare/Caddy. An ordinary browser user agent was checked as well; the generic Python urllib user agent was edge-filtered with 403, so automated results record the named probe user agent rather than changing Cloudflare rules. No account/document mutation, model inference, alert service or authentication change. Source changes are limited to probes and this record.

- 2026-11-18 context gate — shared context-template verifier reports the pre-existing context/ideas directory as unexpected; Git confirms that directory predates this change. Scoped work-record frontmatter/ID/status/DoD and diff checks pass independently. Framework limitation recorded in friction.md; no idea files removed and no context pass claimed. Runtime/installation is verified above; lifecycle remains building pending a clean maintained context gate.
