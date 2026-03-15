# Secure SACCO — Frontend

The React/TypeScript frontend for the **Secure SACCO Management System**, a full-featured cooperative society management platform.

## Tech Stack

| Tool | Purpose |
|------|---------|
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first styling |
| [React Router v7](https://reactrouter.com/) | Client-side routing |
| [Axios](https://axios-http.com/) | HTTP client |
| [Vitest](https://vitest.dev/) | Unit & component testing |

## Getting Started

### Prerequisites

- Node.js 20+
- A running instance of the [backend API](../backend/) (default: `http://localhost:8080`)

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`. API calls are proxied to `http://localhost:8080` automatically.

## Build for Production

```bash
npm run build
```

The production-ready output is placed in the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

## Running Tests

```bash
# Install test dependencies first (not yet in package.json — add them after merging)
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

npm run test
```

## Environment Variables

Create a `.env.local` file (or set these in your CI/deployment environment):

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:8080` |

> **Note:** Variables must be prefixed with `VITE_` to be exposed to the browser bundle.

See the repo-root [`.env.example`](../../.env.example) for a full list of all required variables (backend + frontend).

## Project Structure

```
src/
├── features/          # Feature-based modules
│   ├── auth/          # Login, password reset, account activation
│   ├── accounting/    # Chart of accounts, journal entries, trial balance
│   ├── audit/         # Audit log viewer (admin only)
│   ├── loans/         # Loan applications and management
│   ├── meetings/      # Meeting scheduling and minutes
│   ├── members/       # Member management
│   ├── penalties/     # Penalty tracking
│   ├── reports/       # Financial and operational reports
│   ├── savings/       # Savings accounts and transactions
│   ├── settings/      # SACCO-wide and security settings
│   └── users/         # User accounts, roles & permissions
├── shared/            # Reusable components and utilities
│   ├── components/    # Common UI components
│   └── layouts/       # Page layout wrappers (DashboardLayout, etc.)
├── App.tsx            # Root component with route definitions
└── main.tsx           # Application entry point
```

