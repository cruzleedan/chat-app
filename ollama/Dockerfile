# Ollama Dockerfile with pre-downloaded models
FROM ollama/ollama:latest

# Set environment variables
ENV OLLAMA_MODELS=/root/.ollama/models

# Copy initialization script
COPY init-models.sh /init-models.sh
RUN chmod +x /init-models.sh

# Use custom entrypoint that downloads models on first run
ENTRYPOINT ["/init-models.sh"]