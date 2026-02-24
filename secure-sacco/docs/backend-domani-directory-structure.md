backend/
└── src/main/java/com/<org>/sacco/
    ├── shared/                 # Cross-cutting concerns (Global)
    │   ├── errors/             # GlobalExceptionHandler, Custom Exceptions
    │   ├── security/           # Base Security Config, Password Validators
    │   ├── web/                # Base DTOs, Pagination logic, API Response wrappers
    │   └── util/               # Date helpers, String utils, Constants
    └── modules/                # Business Domain Modules
        ├── auth/               # Identity, RBAC, & Session Management
        │   ├── api/            # Controllers, Request/Response DTOs
        │   ├── domain/         # JPA Entities, Enums, Domain Events
        │   ├── service/        # Business logic & Interface definitions
        │   ├── repo/           # Spring Data JPA Repositories
        │   └── config/         # Module-specific beans (e.g., Redis Session config)
        ├── members/            # KYC, Member profiles, Groupings
        ├── accounts/           # Savings & Share capital accounts
        ├── transactions/       # Ledgers, Deposits, Withdrawals
        └── loans/              # Loan products, Appraisal, Amortization
backend/
└── src/main/resources/
    ├── db/migration/               # Sequential SQL migration files
    │   ├── V1__foundation.sql      # Core tables (audit logs, settings)
    │   ├── V2__identity_rbac.sql   # Your Users, Roles, Permissions schema
    │   └── V3__members_init.sql    # Member domain tables
    └── application.yml             # Profiles for dev, test, and prod