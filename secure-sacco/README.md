# Secure SACCO Management System

Monorepo structure:
- `backend/` Spring Boot (Java)
- `frontend/` React
- `infra/` Docker compose (Postgres, etc.)
- `docs/` Project docs (naming, structure, glossary)

## Prerequisites
- Java (recommended 17/21)
- Maven
- Docker + Docker Compose
- Node.js (for frontend later)

## Run Postgres (Dev)
From repo root:

```bash
docker compose -f infra/docker-compose.yml up -d