INSERT INTO permissions (id, code, description) VALUES
                                                    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'LOANS_READ', 'Can view global loan applications'),
                                                    ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'LOANS_APPROVE', 'Can do first-level verification of loans'),
                                                    ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'LOANS_COMMITTEE_APPROVE', 'Can do final committee approval of loans'),
                                                    ('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', 'LOANS_DISBURSE', 'Can officially disburse funds to members')
ON CONFLICT (code) DO NOTHING;