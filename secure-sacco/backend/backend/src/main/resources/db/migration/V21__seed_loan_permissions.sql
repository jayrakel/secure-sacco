INSERT INTO permissions (id, code, description) VALUES
                                                            ('c3b6e8a1-8d2b-4e8f-9a1b-3c4d5e6f7a8b', 'LOANS_APPROVE', 'Can verify and approve loan applications (Tier 1)'),
                                                            ('d4c7f9b2-9e3c-5f90-0b2c-4d5e6f7a8b9c', 'LOANS_COMMITTEE_APPROVE', 'Can perform final committee approval for loans (Tier 2)'),
                                                            ('e5d8a0c3-0f4d-6a01-1c3d-5e6f7a8b9c0d', 'LOANS_DISBURSE', 'Can disburse approved loans')
ON CONFLICT (code) DO NOTHING;