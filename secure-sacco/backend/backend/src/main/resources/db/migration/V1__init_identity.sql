-- V1__init_identity.sql
-- Identity + RBAC schema (AUTH-BE-01)
-- Enforces dictionary locks: email for login, user_status (ACTIVE, DISABLED, LOCKED).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     email VARCHAR(120) NOT NULL,
                                     official_email VARCHAR(120),
                                     phone_number VARCHAR(30),
                                     first_name VARCHAR(80) NOT NULL,
                                     middle_name VARCHAR(80),
                                     last_name VARCHAR(80) NOT NULL,

                                     password_hash VARCHAR(255) NOT NULL,
                                     user_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                                     is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

                                     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                                     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                                     created_by_user_id UUID,
                                     updated_by_user_id UUID,

                                     CONSTRAINT chk_users_status CHECK (user_status IN ('ACTIVE', 'DISABLED', 'LOCKED')),
                                     CONSTRAINT chk_users_email_not_blank CHECK (length(trim(email)) > 0),
                                     CONSTRAINT chk_users_email_lowercase CHECK (email = lower(email)),

    -- Self-referencing foreign keys for auditing
                                     CONSTRAINT fk_users_created_by
                                         FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
                                     CONSTRAINT fk_users_updated_by
                                         FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_user_status ON users(user_status);

-- Partial unique index on email to allow re-use of emails if a user is soft-deleted.
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_active
    ON users(email)
    WHERE is_deleted = false;

-- UNIQUE identifier constraint for phone login
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_phone_active
    ON users(phone_number)
    WHERE is_deleted = false AND phone_number IS NOT NULL;

-- 2. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     name VARCHAR(50) NOT NULL UNIQUE,
                                     description VARCHAR(200),
                                     is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

                                     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                                     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                                     created_by_user_id UUID,
                                     updated_by_user_id UUID,

                                     CONSTRAINT chk_roles_name_upper CHECK (name = upper(name)),

                                     CONSTRAINT fk_roles_created_by
                                         FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
                                     CONSTRAINT fk_roles_updated_by
                                         FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS permissions (
                                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                           code VARCHAR(80) NOT NULL UNIQUE,
                                           description VARCHAR(200),

                                           CONSTRAINT chk_permissions_code_upper CHECK (code = upper(code))
);

-- 4. USER_ROLES TABLE (Mapping Users <-> Roles)
CREATE TABLE IF NOT EXISTS user_roles (
                                          user_id UUID NOT NULL,
                                          role_id UUID NOT NULL,

                                          PRIMARY KEY (user_id, role_id),

                                          CONSTRAINT fk_user_roles_user
                                              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                          CONSTRAINT fk_user_roles_role
                                              FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- 5. ROLE_PERMISSIONS TABLE (Mapping Roles <-> Permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
                                                role_id UUID NOT NULL,
                                                permission_id UUID NOT NULL,

                                                PRIMARY KEY (role_id, permission_id),

                                                CONSTRAINT fk_role_permissions_role
                                                    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                                                CONSTRAINT fk_role_permissions_permission
                                                    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 6. SESSION_AUDIT TABLE
CREATE TABLE IF NOT EXISTS session_audit (
                                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                             user_id UUID NOT NULL,

                                             refresh_token_id UUID, -- optional if you later link to refresh_tokens/session table
                                             session_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, EXPIRED

                                             login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                                             last_seen_at TIMESTAMPTZ,
                                             revoked_at TIMESTAMPTZ,
                                             expires_at TIMESTAMPTZ,

                                             ip_address VARCHAR(64),
                                             user_agent VARCHAR(500),

                                             revoke_reason VARCHAR(200),
                                             revoked_by_user_id UUID,

                                             created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                                             updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                                             CONSTRAINT chk_session_audit_status
                                                 CHECK (session_status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),

                                             CONSTRAINT fk_session_audit_user
                                                 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

                                             CONSTRAINT fk_session_audit_revoked_by
                                                 FOREIGN KEY (revoked_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_session_audit_user_id ON session_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_session_audit_status ON session_audit(session_status);
CREATE INDEX IF NOT EXISTS idx_session_audit_login_at ON session_audit(login_at);

-- 7. AUTO-UPDATE TIMESTAMPS (Triggers)
CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_session_audit_updated_at ON session_audit;
CREATE TRIGGER trg_session_audit_updated_at
    BEFORE UPDATE ON session_audit
    FOR EACH ROW
EXECUTE FUNCTION set_updated_at();