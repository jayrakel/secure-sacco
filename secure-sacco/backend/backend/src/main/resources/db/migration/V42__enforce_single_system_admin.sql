-- ============================================================
-- V42__enforce_single_system_admin.sql
--
-- Installs a BEFORE INSERT trigger on user_roles that prevents
-- the SYSTEM_ADMIN role from ever being assigned to more than
-- one user, even via direct SQL.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_single_system_admin()
    RETURNS TRIGGER AS $$
DECLARE
    v_admin_role_id UUID;
    v_existing_count INT;
BEGIN
    SELECT id INTO v_admin_role_id FROM roles WHERE name = 'SYSTEM_ADMIN' LIMIT 1;
    IF v_admin_role_id IS NULL THEN RETURN NEW; END IF;

    IF NEW.role_id = v_admin_role_id THEN
        SELECT COUNT(*) INTO v_existing_count
        FROM user_roles
        WHERE role_id = v_admin_role_id
          AND user_id <> NEW.user_id;

        IF v_existing_count > 0 THEN
            RAISE EXCEPTION
                'SYSTEM_ADMIN role can only be assigned to one user. '
                    'Revoke it from the current holder before re-assigning.'
                USING ERRCODE = 'unique_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_system_admin ON user_roles;

CREATE TRIGGER trg_single_system_admin
    BEFORE INSERT ON user_roles
    FOR EACH ROW
EXECUTE FUNCTION enforce_single_system_admin();

COMMENT ON FUNCTION enforce_single_system_admin() IS
    'Paired with DataInitializer role-based check. Prevents SYSTEM_ADMIN from being assigned to more than one user.';