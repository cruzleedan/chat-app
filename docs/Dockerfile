# Documentation service using MkDocs with Material theme
FROM python:3.11-alpine

# Install dependencies
RUN pip install mkdocs-material mkdocs-mermaid2-plugin

# Set working directory
WORKDIR /app

# Copy documentation files
COPY . .

# Build the documentation
RUN mkdocs build

# Use nginx to serve the built docs
FROM nginx:alpine

# Install curl for health check (consistent with backend)
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built docs from first stage to nginx
COPY --from=0 /app/site /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check - consistent with backend pattern
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]