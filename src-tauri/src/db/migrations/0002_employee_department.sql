-- Migration 0002: employee and department tables

CREATE TABLE IF NOT EXISTS departments (
    id          TEXT    PRIMARY KEY NOT NULL,
    name        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id             TEXT    PRIMARY KEY NOT NULL,
    name           TEXT    NOT NULL,
    department_id  TEXT,
    phone          TEXT    NOT NULL DEFAULT '',
    email          TEXT    NOT NULL DEFAULT '',
    salary         REAL    NOT NULL DEFAULT 0,
    joined_at      TEXT,
    created_at     TEXT    NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);
