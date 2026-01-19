#!/bin/bash
# =============================================================================
# RAG Document Q&A - Backup Script
# =============================================================================
# Creates timestamped backups of ChromaDB and uploaded documents
# Recommended: Add to crontab for automated backups
# Example cron (daily at 2 AM): 0 2 * * * /opt/rag-qa/scripts/backup.sh
# =============================================================================

set -e

# Configuration
APP_DIR="${RAG_APP_DIR:-/opt/rag-qa}"
BACKUP_DIR="${RAG_BACKUP_DIR:-$APP_DIR/data/backups}"
DATA_DIR="$APP_DIR/data"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="rag_backup_$TIMESTAMP"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}RAG Document Q&A - Backup${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "Timestamp: $TIMESTAMP"
echo -e "App Directory: $APP_DIR"
echo -e "Backup Directory: $BACKUP_DIR"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# =============================================================================
# Backup ChromaDB Data
# =============================================================================
echo -e "${YELLOW}[1/3] Backing up ChromaDB...${NC}"

if [ -d "$DATA_DIR/chroma" ]; then
    tar -czf "$BACKUP_DIR/${BACKUP_NAME}_chroma.tar.gz" -C "$DATA_DIR" chroma
    echo -e "${GREEN}ChromaDB backup created: ${BACKUP_NAME}_chroma.tar.gz${NC}"
else
    echo -e "${RED}ChromaDB directory not found, skipping...${NC}"
fi

# =============================================================================
# Backup Uploaded Documents
# =============================================================================
echo -e "\n${YELLOW}[2/3] Backing up uploaded documents...${NC}"

if [ -d "$DATA_DIR/uploads" ]; then
    tar -czf "$BACKUP_DIR/${BACKUP_NAME}_uploads.tar.gz" -C "$DATA_DIR" uploads
    echo -e "${GREEN}Uploads backup created: ${BACKUP_NAME}_uploads.tar.gz${NC}"
else
    echo -e "${RED}Uploads directory not found, skipping...${NC}"
fi

# =============================================================================
# Cleanup Old Backups
# =============================================================================
echo -e "\n${YELLOW}[3/3] Cleaning up backups older than $RETENTION_DAYS days...${NC}"

DELETED_COUNT=$(find "$BACKUP_DIR" -name "rag_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ "$DELETED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}Deleted $DELETED_COUNT old backup file(s)${NC}"
else
    echo -e "No old backups to delete"
fi

# =============================================================================
# Summary
# =============================================================================
echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}Backup Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Backup location: $BACKUP_DIR"
echo -e "Files created:"
ls -lh "$BACKUP_DIR"/${BACKUP_NAME}*.tar.gz 2>/dev/null || echo "No files created"
echo ""

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo -e "Total backup storage used: $TOTAL_SIZE"
echo ""

# Count current backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/rag_backup_*.tar.gz 2>/dev/null | wc -l)
echo -e "Total backup sets: $((BACKUP_COUNT / 2))"

echo -e "\n${GREEN}Done! 🎉${NC}"
