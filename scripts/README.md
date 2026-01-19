# Deployment Scripts

This directory contains scripts for deploying and managing the RAG Document Q&A application on Ubuntu Server.

## Files

| File              | Description                                                                |
| ----------------- | -------------------------------------------------------------------------- |
| `setup-ubuntu.sh` | Initial server setup script - installs Docker, Ollama, configures firewall |
| `rag-qa.service`  | Systemd service file for auto-starting the application on boot             |
| `backup.sh`       | Backup script for ChromaDB and uploaded documents                          |
| `restore.sh`      | Restore script to recover from backups                                     |

## Quick Start

### 1. Server Setup (run once)

```bash
# Copy script to server and run
sudo ./setup-ubuntu.sh
```

This will:

- Update system packages
- Install Docker and Docker Compose
- Install Ollama and pull required models (llama3.2, nomic-embed-text)
- Configure firewall (allows ports 22, 3000, 8000)
- Create application directory at `/opt/rag-qa`

### 2. Deploy Application

```bash
# Clone or copy the application to the server
cd /opt/rag-qa

# Configure environment
cp .env.production .env
nano .env  # Edit as needed

# Start the application
docker compose up -d

# View logs
docker compose logs -f
```

### 3. Enable Auto-Start (Optional)

```bash
# Copy service file
sudo cp scripts/rag-qa.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable rag-qa
sudo systemctl start rag-qa

# Check status
sudo systemctl status rag-qa
```

### 4. Setup Automated Backups (Optional)

```bash
# Make backup script executable
chmod +x scripts/backup.sh

# Test backup
./scripts/backup.sh

# Add to crontab for daily backups at 2 AM
crontab -e
# Add this line:
# 0 2 * * * /opt/rag-qa/scripts/backup.sh >> /var/log/rag-backup.log 2>&1
```

## Backup & Restore

### Manual Backup

```bash
./scripts/backup.sh
```

Backups are stored in `/opt/rag-qa/data/backups/` with timestamps.

### Restore from Backup

```bash
# List available backups
./scripts/restore.sh

# Restore specific backup
./scripts/restore.sh 20240115_020000
```

## Environment Variables

| Variable                | Default                     | Description                        |
| ----------------------- | --------------------------- | ---------------------------------- |
| `RAG_APP_DIR`           | `/opt/rag-qa`               | Application installation directory |
| `RAG_BACKUP_DIR`        | `$RAG_APP_DIR/data/backups` | Backup storage location            |
| `BACKUP_RETENTION_DAYS` | `7`                         | Days to keep old backups           |

## Useful Commands

```bash
# Check container status
docker ps

# View application logs
docker compose logs -f

# Restart application
docker compose restart

# Stop application
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Check Ollama models
ollama list

# Monitor system resources
htop
docker stats
```

## Troubleshooting

### Application won't start

1. Check Ollama is running: `systemctl status ollama`
2. Check Docker: `docker ps -a`
3. View logs: `docker compose logs`

### Can't connect to Ollama from container

- Ensure `OLLAMA_HOST=http://host.docker.internal:11434` in `.env`
- Check Ollama is listening: `curl http://localhost:11434/api/tags`

### Backup fails

- Check disk space: `df -h`
- Verify directories exist: `ls -la /opt/rag-qa/data/`
