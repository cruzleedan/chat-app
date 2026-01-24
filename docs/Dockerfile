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

# Copy built docs to nginx
COPY --from=0 /app/site /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]