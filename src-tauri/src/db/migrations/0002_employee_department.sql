-- Migration v2: add department column to employees

ALTER TABLE employees ADD COLUMN department TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees (department);
