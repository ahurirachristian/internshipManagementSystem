-- PC10 (D4): the two audit indexes that make the deferred admin activity
-- charts (plan §3.1) feasible without full scans.
--
--   idx_audit_logs_timestamp      -> audit_logs (timestamp)
--   idx_audit_logs_entity_user    -> audit_logs (target_entity, username)
--
-- WHY THESE TWO: they mirror the only two read shapes AuditLogRepository
-- exposes. The first covers findByTimestampBetween and the start/end arm of
-- AuditLogController.search — every time-bucketed activity chart. The second
-- is the plan's composite (entity_type, user_id), answered with this schema's
-- actual column names target_entity + username, so "what did this account do
-- to this entity" is an index walk rather than a scan. The composite leads
-- with target_entity because that is the column with the better selectivity
-- in this table's read shapes; a query filtering only on target_entity seeks
-- into the index as a prefix. A query filtering only on username cannot seek
-- on this index (H2's planner will still elect to scan it, as the PC10 EXPLAIN
-- test documents) — if a username-only access path ever becomes hot, it wants
-- its own index rather than a reshuffle of this one.
--
-- NO BEHAVIOUR CHANGE (PC10): this script creates no columns, drops nothing
-- and runs no UPDATE. Rows, queries and API responses are byte-for-byte what
-- they were; only the access path changes. Re-running any existing endpoint
-- test is therefore the "no functional change" half of the PC10 gate.
--
-- The indexes are also declared on the entity via @Index, so Hibernate's
-- ddl-auto creates them for the h2/dev/test profile automatically; this script
-- brings the mysql profile database up to date.
--
-- Run ONCE against the mysql profile database after deploying the new entity:
--   mysql -u root -p internshipManagementSystem_db < backend/migration/add_audit_indexes.sql
--
-- Safe to re-run (idempotent: MySQL has no CREATE INDEX IF NOT EXISTS, so each
-- index is created only after an information_schema.STATISTICS check).

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'audit_logs'
       AND INDEX_NAME = 'idx_audit_logs_timestamp') = 0,
    'CREATE INDEX idx_audit_logs_timestamp ON audit_logs (timestamp)',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'audit_logs'
       AND INDEX_NAME = 'idx_audit_logs_entity_user') = 0,
    'CREATE INDEX idx_audit_logs_entity_user ON audit_logs (target_entity, username)',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
