# Fix the rag-frontend health check

Status: raw. A candidate idea; Dan has not decided to build it. Parked while
the portfolio is the focus.

Updated: 2026-10-21

Source: `context/work/0005-rag-frontend-health-and-monitoring.md` (spike).

## Background

`rag-frontend` showed `unhealthy` for about six weeks although the site
worked. Its compose health check is `wget -q --spider http://localhost/`.
In the container `localhost` resolves to `::1` first, BusyBox `wget` does
not fall back to IPv4, and `frontend/nginx.conf` listens only on IPv4
(`listen 80;`), so every probe is refused. `http://127.0.0.1/` returns 0.
The site itself (`chat-app.cruzleedan.work`) returned 200 throughout.

## Idea

Change the check in `docker-compose.yml` to
`wget -q --spider http://127.0.0.1/` and recreate only the frontend
container. Leave `nginx.conf` alone (adding `listen [::]:80;` would change
the served config for a monitoring reason).

## Why it matters

A check that is always red teaches everyone to ignore red, and any future
alerting on container health (see `d3-homelab/context/ideas/email-alerting`)
would email about it every day.

## Cost and risk

One line. Recreating the frontend container takes a few seconds of
downtime for a static site. No data involved. Tag the previous image for
rollback first, as in WORK-0004.

## Before it becomes a work item

Nothing to decide except when. It should land before any alerting is
switched on.
