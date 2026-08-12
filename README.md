# Military Asset Management System (Kristallball Command)

An enterprise-grade, role-based Military Asset Management System designed to track critical assets (weapons, vehicles, ammunition) across multiple military bases. Built to satisfy strict operational accountability, data integrity, auditability, and role-based security requirements.

## Key Features

1. **End-to-End Asset Visibility**: Real-time aggregation of opening balances, net movements, squad assignments, ammunition expenditures, and closing balances.
2. **Operational Accountability**: Atomic cross-base transfers using database transactions (`BEGIN...COMMIT`) preventing double-spending or stock duplication.
3. **Granular Security (RBAC)**: Custom middlewares enforce security:
   - **Global Administrator**: Unrestricted view and write permissions.
   - **Base Commander**: Automatically filtered to only view assets, logs, assignments, and transactions involving their assigned base. Authorized to deploy/expend assets.
   - **Logistics Officer**: Authorized only to view stock and log incoming purchases or execute base-to-base transfers. Gated from squad assignments and base command.
4. **Audit Trail**: Every database state mutation (purchases, transfers, assignments, expenditures) automatically registers in a central, immutable audit trail.
5. **Zero-Configuration Fallback**: Built with a **Dual-Mode Database connection manager** that connects to standard PostgreSQL, but auto-falls back to an emulated in-memory PostgreSQL engine (`pg-mem`) if no connection is active. Seeding of bases, items, and accounts is completely automated!

---

## Tech Stack

* **Backend**: Node.js, Express, PostgreSQL / pg-mem, JWT, Bcrypt
* **Frontend**: React (Vite), Tailwind CSS, Lucide React, Recharts (visual charts), Axios

---

## Getting Started

### 1. Requirements
* Node.js v18 or higher
* npm / pnpm / yarn

### 2. Environment Variables (.env)
A preconfigured `.env` is created in `backend/`. To connect a live PostgreSQL database:
Uncomment and edit the database URL:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/military_db
```
If left blank, the application launches with the in-memory fallback instantly.

### 3. Installation & Startup

#### Step A: Boot the API Backend Service
In a terminal, navigate to the `backend` folder and start:
```bash
cd backend
npm install
npm run dev
```
The API server will listen on `http://localhost:5000` and output database initialization logs.

#### Step B: Boot the React Frontend Client
In a second terminal, navigate to the `frontend` folder and start:
```bash
cd frontend
npm install
npm run dev
```
The Vite hot-reload client will start on `http://localhost:5173`. Open it in your web browser.

---

## Demo Credentials & Quick Logins

For easy evaluation, the login screen includes a **Quick Logins** panel. Click on any role to autofill credentials and authorize:

| Username | Password | Role | Assigned Base Context |
| :--- | :--- | :--- | :--- |
| `admin` | `Admin@123` | Global Administrator | All bases (Global view) |
| `commander_a` | `Commander@123` | Base Commander | Base 1: Fort Bragg |
| `commander_b` | `Commander@123` | Base Commander | Base 2: Camp Pendleton |
| `logistics_a` | `Logistics@123` | Logistics Officer | Base 1: Fort Bragg |
| `logistics_b` | `Logistics@123` | Logistics Officer | Base 2: Camp Pendleton |

---

## Project Structure

```
military-asset-management/
├── backend/
│   ├── config/
│   │   └── db.js               # Dual-mode connection manager & database pool
│   ├── controllers/
│   │   ├── authController.js   # JWT authentication & session profile
│   │   ├── assetController.js  # Dashboard aggregations, assignments & expenditures
│   │   ├── purchaseController.js # Logs purchase records
│   │   └── transferController.js # Handles atomic cross-base transfers
│   ├── middlewares/
│   │   ├── authMiddleware.js   # JWT Token validator
│   │   ├── rbacMiddleware.js   # Permissions & base scope gating
│   │   └── loggerMiddleware.js # Auto API logger & audit helper
│   ├── models/
│   │   └── schema.sql          # DDL tables schema script
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── assetRoutes.js
│   │   ├── purchaseRoutes.js
│   │   └── transferRoutes.js
│   ├── test-integration.js     # End-to-end integration test runner
│   ├── .env                    # Environment config
│   └── server.js               # Express application bootstrap
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx      # Top profile bar with base and role labels
    │   │   ├── Sidebar.jsx     # Navigation sidebar gated by user role
    │   │   └── DashboardMetrics.jsx # Balanced dashboard cards & popup modal
    │   ├── pages/
    │   │   ├── Login.jsx       # Auth login with quick-login buttons
    │   │   ├── Dashboard.jsx   # Aggregated analytics, charts, & audit trail
    │   │   ├── Purchases.jsx   # Receive stock and purchase histories
    │   │   ├── Transfers.jsx   # Base-to-base transfer form & live stock checker
    │   │   └── Assignments.jsx # Deploy squad equipment & spent log
    │   ├── services/
    │   │   └── api.js          # Axios API client with authorization interceptors
    │   ├── context/
    │   │   └── AuthContext.jsx # Global user auth and persistent session state
    │   ├── App.jsx             # React router configuration
    │   └── main.jsx            # React root mount
    ├── tailwind.config.js      # CSS styling tokens
    └── vite.config.js          # Vite assets settings
```

---

## Verification & Tests
We have built an integration test suite. To verify that all access controls (RBAC) and transaction rollbacks function correctly:
```bash
cd backend
node test-integration.js
```
The test verifies:
* Authorization token signatures.
* Scope enforcement (Commanders locked out of other base data).
* Security filters (Logistics Officers blocked from base command endpoints).
* Rollback protection (Transfers exceeding stock levels are aborted and reversed).
* Atomic calculations (Accurate credit/debit on source/destination stock).
