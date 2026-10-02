-- PC8b (D3 part 1): the placement timeline columns, the students/users
-- companion columns, and the placement_status_history audit table.
--
--   placements.created_at, offered_at, assigned_at, started_at, completed_at
--   students.created_at
--   users.last_login_at
--   placement_status_history (new table)
--
-- BACKFILL POLICY: every new column is added as NULL and existing rows stay
-- NULL. We NEVER invent a date (plan §PC8b) — a fabricated created_at would
-- silently corrupt every time-series chart built on it. Queries exclude NULLs
-- rather than coercing them to epoch; this script therefore performs zero
-- UPDATEs by design. datetime(6) matches what Hibernate's MySQL DDL emits for
-- LocalDateTime (see backend/schema.sql).
--
-- The columns are also added for the h2/dev profile automatically by
-- Hibernate ddl-auto=update once the entities carry the fields; this script
-- brings the mysql profile database up to date.
--
-- Run ONCE against the mysql profile database after deploying the new entities:
--   mysql -u root -p internshipManagementSystem_db < backend/migration/add_placement_timeline.sql
--
-- Safe to re-run (idempotent: only adds what is missing).

-- ── placements: the five timeline columns ──────────────────────────────────

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'placements'
       AND COLUMN_NAME = 'created_at') = 0,
    'ALTER TABLE placements ADD COLUMN created_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'placements'
       AND COLUMN_NAME = 'offered_at') = 0,
    'ALTER TABLE placements ADD COLUMN offered_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'placements'
       AND COLUMN_NAME = 'assigned_at') = 0,
    'ALTER TABLE placements ADD COLUMN assigned_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'placements'
       AND COLUMN_NAME = 'started_at') = 0,
    'ALTER TABLE placements ADD COLUMN started_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'placements'
       AND COLUMN_NAME = 'completed_at') = 0,
    'ALTER TABLE placements ADD COLUMN completed_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

-- ── students.created_at ────────────────────────────────────────────────────

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'students'
       AND COLUMN_NAME = 'created_at') = 0,
    'ALTER TABLE students ADD COLUMN created_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

-- ── users.last_login_at (stamped only by the real /api/login path) ─────────

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'last_login_at') = 0,
    'ALTER TABLE users ADD COLUMN last_login_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

-- ── placement_status_history: append-only transition trail ─────────────────
-- Statuses are stored as plain strings on purpose: the audit trail must stay
-- readable if Placement.Status's vocabulary ever changes. changed_at is NOT
-- NULL — every row is written with its own timestamp. No foreign key to
-- placements: the trail is an audit record and outlives the row, exactly
-- like audit_logs.

CREATE TABLE IF NOT EXISTS placement_status_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    placement_id BIGINT NOT NULL,
    from_status VARCHAR(32) NULL,
    to_status VARCHAR(32) NOT NULL,
    changed_at DATETIME(6) NOT NULL,
    changed_by VARCHAR(255) NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;
