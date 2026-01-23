# Ollama Dockerfile with pre-downloaded models
FROM ollama/ollama:latest

# Set environment variables
ENV OLLAMA_MODELS=/root/.ollama/models

# Copy initialization and health check scripts
COPY init-models.sh /init-models.sh
COPY health-check.sh /health-check.sh
RUN chmod +x /init-models.sh /health-check.sh

# Use custom entrypoint that downloads models on first run
ENTRYPOINT ["/init-models.sh"]