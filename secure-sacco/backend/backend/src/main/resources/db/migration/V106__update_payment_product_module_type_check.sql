ALTER TABLE payment_products
    DROP CONSTRAINT IF EXISTS chk_payment_products_module_type;

ALTER TABLE payment_products
    ADD CONSTRAINT chk_payment_products_module_type
        CHECK (module_type IN ('SAVINGS', 'PENALTY', 'LOAN', 'SHARE_CAPITAL', 'DEPOSIT_SHARES', 'CUSTOM'));
