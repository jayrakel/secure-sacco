-- =============================================================================
-- V90: Per-member required amount on Payment Products (SAC-261 follow-up)
--
-- Lets admins set a fixed contribution target for a product, e.g.
-- "Meat Contribution: KES 2,000 per member". The member's allocation screen
-- then shows progress toward that goal (paid so far / remaining), same as
-- Savings Obligations. NULL means uncapped (default for SAVINGS, and for
-- CUSTOM products with no fixed target).
-- =============================================================================

ALTER TABLE payment_products
    ADD COLUMN required_amount NUMERIC(14,2);

COMMENT ON COLUMN payment_products.required_amount IS
    'Optional per-member contribution target. NULL = uncapped. When set, member''s allocation toward this product is capped at (required_amount - amount already routed).';