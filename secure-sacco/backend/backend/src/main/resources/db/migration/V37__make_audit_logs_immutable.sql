-- Physically block any UPDATE or DELETE operations on the audit log table
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
    RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Audit logs are immutable. UPDATE and DELETE operations are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER make_audit_logs_append_only
    BEFORE UPDATE OR DELETE ON security_audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();