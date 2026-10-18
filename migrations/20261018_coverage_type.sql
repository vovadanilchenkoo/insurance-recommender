-- Apply ONCE to an existing database after making a backup.
-- New databases: bun run db:push creates the field directly; do not also run this.
ALTER TABLE coverage_components ADD COLUMN coverage_type TEXT NOT NULL DEFAULT 'unknown';
-- Do not guess types from free-text names in production. 'unknown' fails C8.
-- Assign verified structured types and positive limits, or re-seed a disposable
-- SYNTHETIC demonstration database. Never re-seed a database containing real data.