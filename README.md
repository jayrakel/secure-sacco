
```markdown
# 🏦 Secure SACCO Management System 

![Version](https://img.shields.io/badge/version-1.0.0-emerald.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Architecture](https://img.shields.io/badge/architecture-Monorepo-blue)

The **Secure SACCO Management System** is a modern, double-entry financial platform built for **Better Link Ventures Sacco**. It automates member lifecycle management, loan amortization, scheduled savings obligations, real-time penalty accruals, and regulatory financial reporting. 

The system features real-time transactional synchronization with **Safaricom Daraja (M-Pesa)** and **Co-op Connect (Co-operative Bank of Kenya)** APIs.

---

## ✨ Core Modules & Capabilities

* **Financial Engine:** Automated general ledger, real-time double-entry accounting, trial balances, and automated dividend/expense calculations.
* **Loan Lifecycle:** Dynamic loan products, committee approvals, instant disbursement, amortized scheduling, and automated arrears/penalty enforcement.
* **Automated Obligations:** Tracks scheduled member deposits (e.g., Weekly/Monthly savings) and penalizes defaults.
* **Live Bank Integration:** Fully integrated with Safaricom Daraja (STK Push) and Co-op Bank Connect for instant balance reflection and webhook-driven payment confirmations.
* **Granular Security (PBAC):** Policy-Based Access Control with strict role segregation (System Admin, Cashier, Treasurer, Chairperson, Loan Officer, Secretary).
* **Meeting & Attendance Matrix:** QR-code based physical meeting check-ins and absence penalty triggers.
* **Audit & Compliance:** Immutable, cryptographic audit logging for every data mutation to satisfy financial compliance standards.

---

## 🏗️ Architecture & Tech Stack

This project utilizes a decoupled monorepo architecture.

**Backend (Core Banking API)**
* **Framework:** Java 21 / Spring Boot 3.x
* **Database:** PostgreSQL (Render Managed)
* **Migrations:** Flyway (88+ structural migrations)
* **Security:** Spring Security, JWT, Encrypted PII Fields
* **Secrets Management:** Doppler

**Frontend (Web Application)**
* **Framework:** React + TypeScript (Vite)
* **Styling:** Tailwind CSS + Lucide Icons
* **State Management:** React Context API + Custom Hooks
* **Routing:** React Router DOM

**Infrastructure & Integrations**
* **Hosting:** Render (PaaS) with Docker containers
* **CI/CD:** GitHub Actions (`deploy-prod.yml`, `deploy-staging.yml`)
* **Banking:** Safaricom Daraja API & Co-op Connect API Gateway
* **Media / Comms:** Cloudinary (Asset storage), SMTP (Email delivery)

---

## 📂 Repository Structure

```text
secure-sacco/
├── backend/                  # Spring Boot Java Application
│   ├── src/main/java/...     # Domain-Driven Design (Accounting, Loans, Payments, etc.)
│   ├── src/main/resources/   # App configs & Flyway DB migrations
│   └── pom.xml               # Maven dependencies
├── frontend/                 # React Web Application
│   ├── src/features/         # Feature-sliced React modules
│   ├── src/shared/           # Global components, layouts, and API clients
│   └── package.json          # NPM dependencies
├── infra/                    # Infrastructure files
│   └── docker-compose.yml    # Local development containers (Postgres, etc.)
├── docs/                     # System documentation, audit reports, and test scripts
└── .github/workflows/        # CI/CD Deployment pipelines

```

---

## 🚀 Local Development Setup

### 1. Prerequisites

* Java 17 or 21
* Node.js (v18+)
* Docker Desktop
* Doppler CLI (for secrets injection)

### 2. Environment Variables & Secrets

All environment variables are managed securely via **Doppler**. You must have access to the Doppler workspace to run the application locally.

```bash
# Login to Doppler
doppler login

# Setup local environments
cd backend && doppler setup
cd ../frontend && doppler setup

```

### 3. Start Local Infrastructure (Database)

Spin up the local PostgreSQL database using Docker Compose:

```bash
cd infra
docker compose up -d

```

### 4. Run the Backend API

The backend uses Maven wrapper and runs on `localhost:8080`.

```bash
cd backend
doppler run -- ./mvnw spring-boot:run

```

*(Flyway will automatically execute and seed the database with required Kenyan Banks, Chart of Accounts, and System Roles on startup).*

### 5. Run the Frontend Client

The frontend Vite server runs on `localhost:5173`.

```bash
cd frontend
npm install
doppler run -- npm run dev

```

---

## 🌐 Deployment Pipeline

Deployments are strictly controlled via GitHub Actions. We utilize a split-environment strategy:

1. **Staging Environment (`main` pushes):** Merges to the `main` branch automatically trigger `.github/workflows/deploy-staging.yml`. This builds the Docker image and pushes it to the Staging Render environment. Sandbox credentials are used for M-Pesa and Co-op Bank.
2. **Production Environment (Manual Release):** Production deployments are manual to prevent accidental financial disruptions. Go to the **Actions** tab in GitHub, select the `Deploy to Production` workflow, and trigger it via `workflow_dispatch`. This deploys strictly to the Live Render environment linked to the actual Sacco Bank Accounts.

---

## 🏦 Webhook Integrations (Critical Info)

For Safaricom and Co-op Bank to properly communicate with the application, strict URL whitelisting is required.

* **Live STK Push Callback:** `https://api.betterlinkventureslimited.co.ke/api/v1/payments/coop/stk-callback`
* **Live C2B IPN Callback:** `https://api.betterlinkventureslimited.co.ke/api/v1/payments/coop/webhook`

*Note: Safaricom STK Push payloads strictly omit the `senderName`. The backend intercepts these requests and automatically matches the payload's `PhoneNumber` against the SACCO `Member` database to retroactively enrich the transaction ledger.*

---

## 🛡️ Auditing & Compliance

This system enforces strict immutability.

* **No Hard Deletes:** Data rows (members, loans, payments) cannot be deleted, only deactivated or soft-deleted.
* **Cryptographic Event Logging:** All sensitive security events (Role escalations, PBAC modifications, Interest rate changes) are permanently written to the `SecurityAuditLog` table.
* **PII Encryption:** Sensitive user data is encrypted at rest in the PostgreSQL database using AES-256 via custom JPA attribute converters (`@Convert(converter = EncryptedStringConverter.class)`).

```

```
