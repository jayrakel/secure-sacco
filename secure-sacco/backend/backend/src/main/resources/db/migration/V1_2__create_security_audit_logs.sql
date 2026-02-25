CREATE TABLE security_audit_logs (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     actor VARCHAR(255) NOT NULL,
                                     action VARCHAR(100) NOT NULL,
                                     target VARCHAR(255),
                                     ip_address VARCHAR(45),
                                     details TEXT,
                                     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_audit_logs_actor ON security_audit_logs(actor);
CREATE INDEX idx_security_audit_logs_action ON security_audit_logs(action);