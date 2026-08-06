-- V96: Create custom_revision_entity table for Hibernate Envers

CREATE SEQUENCE IF NOT EXISTS custom_revision_entity_seq START WITH 1 INCREMENT BY 50;

CREATE TABLE IF NOT EXISTS custom_revision_entity (
    id INTEGER NOT NULL,
    timestamp BIGINT NOT NULL,
    username VARCHAR(255),
    CONSTRAINT pk_custom_revision_entity PRIMARY KEY (id)
);
