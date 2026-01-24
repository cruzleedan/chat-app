# Documentation Service Fix

This document explains the fix for the documentation feature not working in Docker deployments.

## Problem

The frontend was hardcoded to access documentation at `http://localhost:8080`, which doesn't work in containerized environments where services communicate via Docker networking.

## Solution

1. **Added Documentation Service**: Created a dedicated Docker service (`rag-docs`) that serves the MkDocs documentation using nginx.

2. **Made URLs Configurable**: Updated the frontend to use environment variables (`VITE_DOCS_URL`) instead of hardcoded URLs.

3. **Updated Docker Compose**: Added the documentation service with proper health checks and networking.

## Files Modified/Created

### New Files:

- `docs/Dockerfile` - Multi-stage build that compiles MkDocs and serves with nginx
- `docs/nginx.conf` - Nginx configuration for serving the documentation

### Modified Files:

- `docker-compose.yml` - Added `docs` service and updated frontend build args
- `docker-compose.override.yml` - Added docs service to Caddy network
- `frontend/Dockerfile` - Added `VITE_DOCS_URL` build argument
- `frontend/src/App.tsx` - Updated to use configurable documentation URL
- `.env.example` - Added documentation URL configuration examples

## Usage

### Docker Deployment (Default)

The documentation is now accessible at the `rag-docs` service. No additional configuration needed.

```bash
docker compose up --build
```

### Homelab with Caddy

Update your `.env` file with your domain:

```env
VITE_DOCS_URL=https://yourdomain.com/docs
```

Add to your Caddyfile:

```
yourdomain.com {
    handle /docs* {
        reverse_proxy rag-docs:80
    }
    # ... other routes
}
```

### Local Development

For local development with MkDocs serve:

```env
VITE_DOCS_URL=http://localhost:8080
```

Then run MkDocs:

```bash
cd docs
mkdocs serve -a 0.0.0.0:8080
```

## Benefits

- ✅ Documentation works in all deployment scenarios
- ✅ Configurable via environment variables
- ✅ Proper containerization with health checks
- ✅ Nginx serving for better performance
- ✅ Integrated with existing Caddy setup
