---
id: 0005
title: "Spike: why rag-frontend was unhealthy, and how to be told immediately"
status: shipped
kind: spike
opened: 2026-10-21
decided: 2026-10-21
branch: spike/0005-rag-frontend-health-and-monitoring
supersedes: ~
superseded-by: ~
---

# WORK-0005 — Spike: why rag-frontend was unhealthy, and how to be told immediately

| | |
|---|---|
| **Opened** | 2026-10-21 |
| **Status** | shipped |
| **Kind** | spike |
| **Supersedes** | — |
| **Superseded by** | — |

## Question

`docker ps` showed `rag-frontend` as `unhealthy` for about six weeks and
nobody acted on it. (1) Why was it unhealthy, and is the site actually
broken or is only the check wrong? (2) How do we find out within minutes
the next time a container on d3 turns unhealthy or the site goes down?

## Constraints

- Read-only investigation first: no restart, rebuild or config change of
  the live containers until the cause is known and the owner agrees.
- Use what d3 already runs (Docker, Caddy, Cloudflare Tunnel, Tailscale)
  before adding a new service. Check `d3-homelab/context/reference/homelab.md`.
- Alerts must reach the owner without anyone watching a dashboard.
- Nothing secret in this repo or in the chat (no tokens, webhooks or
  passwords written into files).

## Method

Read-only: `docker inspect` health logs, `docker exec ... wget` against the
containers, `docker ps` across the host, the Caddyfile and
`d3-homelab/context/reference/homelab.md` and `AGENTS.md` for any existing
monitoring, and two web searches (Uptime Kuma, Cloudflare Tunnel
notifications). Nothing was restarted, rebuilt or changed.

## Findings

### 1. Why `rag-frontend` was unhealthy: the check is wrong, the site is fine

- The health check is `wget -q --spider http://localhost/`. It failed every
  30 seconds with `Connection refused` (failing streak 108 at the time of
  the check, since the container started 53 minutes earlier; before the
  rebuild it had been red for about six weeks).
- Inside the container: `http://127.0.0.1/` exits 0; `http://localhost/` and
  `http://[::1]/` both fail. `/etc/hosts` lists `::1 localhost`, so BusyBox
  `wget` resolves `localhost` to the IPv6 address first and does not fall
  back, while `frontend/nginx.conf` has only `listen 80;` (IPv4). nginx
  answers on `0.0.0.0:80` only.
- The site itself was never down: `https://chat-app.cruzleedan.work/`
  returns 200 through Caddy and the browser tests passed.
- Docker only reports `unhealthy`. Nothing depends on the frontend's health
  (`depends_on` points the other way), so it changed nothing, and nothing
  alerted.
- Smallest fix: use `127.0.0.1` in the check (or also add
  `listen [::]:80;` to `nginx.conf`). Not applied: the spike is read-only.

### 2. It is not the only one, and one is a real outage

`timesheet-api-go` has been `unhealthy` for about six weeks too (failing
streak 130,179). Looking closer, it has three separate defects:

- **The check probes the wrong path.** The compose check is
  `wget --spider http://localhost:8080/health` (a `HEAD` request), but the
  app only serves `/v1/health` (`backend/api-go/cmd/api/main.go`). The log
  shows `HEAD /health` answered 404 every 30 seconds.
- **The check would be rate limited anyway.** `NewRateLimiter(1000, 100)`
  allows 100 unauthenticated requests per hour per client; a probe every 30
  seconds is 120 per hour from `127.0.0.1`. A `GET /v1/health` from inside
  the container returned 429.
- **The public API is down.** `https://timesheet-api-go.cruzleedan.work/v1/health`
  returns 502. Caddy's log says `lookup timesheet-api-go ... server
  misbehaving`: the running container is attached only to
  `timesheet_logger_timesheet-network`, not to `caddy-network`, although the
  compose file lists both. So Caddy cannot reach it. How long it has been
  like this was not determined. (The Node API's public `/health` returned 404;
  its real health path was not checked.)

The last point is the one that matters for monitoring: a service the owner
believes is deployed has been unreachable and no one was told.

Two always-red containers on a host nobody watches is the real finding:
a check that is red while the app is fine teaches everyone to ignore red,
so the day a container really fails it looks the same.

### 3. What d3 has today for monitoring: nothing that alerts

- `homelab.md` and `AGENTS.md` mention no monitoring, alerting or uptime
  tool. Running containers include Portainer (a dashboard; the free edition
  has no alerts). No Uptime Kuma, ntfy, autoheal, Prometheus or similar is
  installed or pulled.
- 28 containers are running. Caddy and Portainer define no health check; two
  others are `unhealthy` (the two above); the rest are `healthy`.
- The agent mailbox is for messages between the two coding agents, not a way
  to reach the owner.
- Anything that runs only on d3 cannot report that d3, the Tailscale or
  Cloudflare Tunnel link, or the power is down.

## Options considered

| Option | Catches | Misses | Effort | Notes |
|---|---|---|---|---|
| **Fix the two checks** | Removes the permanent false alarms | Nothing new | Low | Needed first: any alerting on top of a red check just pages for nothing, and an auto-restarter would restart-loop `rag-frontend`. |
| **Uptime Kuma on d3** (one container) | HTTP(S) status of every public URL; container up/down; one UI and history; many alert channels (Telegram, email, Discord, others) | If its Docker monitor reacts to `unhealthy` is **not confirmed** by what was found; needs the Docker socket mounted (read-only is advised); dies with d3 | Medium | Version 2 exists (Oct 2025); check the docs for the Docker monitor and ntfy support before choosing. Also covers Caddy. |
| **Host script + systemd timer** (`docker ps --filter health=unhealthy`, `curl` of public URLs, send on change) | Exactly the unhealthy/exited state, no new service, no socket mount | No history or UI; custom code to maintain; dies with d3 | Low–Medium | Send only on state change to avoid noise. |
| **External probe** (a free hosted uptime checker, or Cloudflare's Tunnel Health Alert) | d3, the tunnel or Cloudflare being down, seen from outside | Not individual container health | Low | Cloudflare documents a Tunnel Health Alert (Healthy/Degraded/Down) delivered by email or webhook, listed as included with Zero Trust plans; the free plan was not confirmed. Connector health is not origin health, so also probe the URL. |
| **Autoheal-style restarter** | Self-heals a crashed service | Hides failures; loops on a wrong check | Low | Not recommended before the checks are right, and never as the only signal. |
| **Prometheus + Grafana/Alertmanager** | Metrics and rules | Heavy for about 28 containers and one owner | High | Overkill now. |

## Outcome

`no-action` for now; the follow-ups are kept as ideas (below). The spike
changes nothing by itself.

1. **Fix the false alarms** (chat-app: `127.0.0.1` in the frontend check;
   `timesheet-api-go`: park it cleanly since it is unused, or later correct
   the path, exempt the probe from the rate limit and put the container back
   on `caddy-network`). No data is touched.
2. **Add alerting on d3** (in `d3-homelab`), recommended shape:
   - an **on-host check** for container health and each public URL, emailed
     to the owner on every change from healthy to unhealthy and
     back (Uptime Kuma if its Docker monitor reacts to `unhealthy`,
     otherwise the small script);
   - **plus one external probe** so "d3 is down" also reaches the owner;
   - a rule in the deploy steps: after a deploy, `docker ps` must show
     every container `healthy`; a red one is fixed or its check is, never
     left.

**Owner decisions (2026-10-21):** alerts go to the owner's **email**; the Go
API is not in use right now, so it can stay off; and none of this is a work
item yet. Focus is the portfolio. The follow-ups are recorded as ideas:

- `context/ideas/fix-rag-frontend-health-check/idea.md` (this repo)
- `timesheet_logger/context/ideas/go-api-park-or-fix/idea.md`
- `d3-homelab/context/ideas/email-alerting/idea.md`

Still to be decided when one is picked up: Uptime Kuma or the script (after
a quick test of Kuma's Docker monitor), and a hosted external probe or
Cloudflare's tunnel alert. No token, webhook or password is to be written
into any repository.

## Log

- 2026-10-21 owner: alerts to email; the Go API is not in use; write the
  follow-ups as ideas and focus on the portfolio. Ideas written in three
  repos. A second look at `timesheet-api-go` found it unreachable through
  Caddy (502, not on `caddy-network`).
- 2026-10-21 findings written; outcome no-action for now (ideas). Nothing on d3 was changed.
- 2026-10-21 opened — requested by the owner after the WORK-0004 deploy
  showed `rag-frontend` `unhealthy` before and `starting` after.

---

> **For AI agents:** Do NOT implement a fix from this spike. A spike
> answers a question; any change comes from a separate work item the
> owner accepts.
