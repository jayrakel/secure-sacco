ALTER TABLE payment_products ADD COLUMN frequency VARCHAR(20) DEFAULT 'ONE_OFF';
UPDATE payment_products SET frequency = 'ONE_OFF' WHERE frequency IS NULL;
