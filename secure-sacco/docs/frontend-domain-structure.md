frontend/src/
├── shared/               # Global reusable code
│   ├── components/       # Business-aware shared components (Layout, Sidebar)
│   ├── ui/               # Atomic UI components (Shadcn/UI, Buttons, Inputs)
│   ├── utils/            # Formatters, Validators, Date helpers
│   └── api/              # Axios base instance & Global interceptors
└── modules/              # Domain-specific modules
    └── auth/
        ├── pages/        # LoginPage, ResetPasswordPage
        ├── components/   # LoginForm, PermissionGuard
        ├── api/          # authApi.ts (endpoints for this module)
        ├── hooks/        # useAuth.ts, usePermissions.ts
        ├── types.ts      # TypeScript Interfaces for Auth
        └── routes.tsx    # Auth-related route definitions