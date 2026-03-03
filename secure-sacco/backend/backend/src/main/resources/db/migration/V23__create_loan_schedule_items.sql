CREATE TABLE loan_schedule_items (
                                     id UUID PRIMARY KEY,
                                     loan_application_id UUID NOT NULL,
                                     week_number INTEGER NOT NULL,
                                     due_date DATE NOT NULL,
                                     principal_due DECIMAL(15, 2) NOT NULL,
                                     interest_due DECIMAL(15, 2) NOT NULL,
                                     total_due DECIMAL(15, 2) NOT NULL,
                                     principal_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                                     interest_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                                     status VARCHAR(20) NOT NULL,
                                     created_at TIMESTAMP NOT NULL,
                                     updated_at TIMESTAMP,
                                     CONSTRAINT fk_loan_sched_app FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id)
);

CREATE INDEX idx_loan_sched_app_id ON loan_schedule_items(loan_application_id);
CREATE INDEX idx_loan_sched_due_date ON loan_schedule_items(due_date);
CREATE INDEX idx_loan_sched_status ON loan_schedule_items(status);