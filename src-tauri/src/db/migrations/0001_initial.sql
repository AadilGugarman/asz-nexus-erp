-- Migration v1: initial schema
-- Creates the employees table and supporting indexes.

CREATE TABLE IF NOT EXISTS employees (
    id          TEXT    PRIMARY KEY,          -- UUID v4
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    phone       TEXT    NOT NULL DEFAULT '',
    role        TEXT    NOT NULL DEFAULT 'staff',  -- 'admin' | 'manager' | 'staff'
    is_active   INTEGER NOT NULL DEFAULT 1,   -- 0 = inactive, 1 = active
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_employees_email    ON employees (email);
CREATE INDEX IF NOT EXISTS idx_employees_role     ON employees (role);
CREATE INDEX IF NOT EXISTS idx_employees_active   ON employees (is_active);
