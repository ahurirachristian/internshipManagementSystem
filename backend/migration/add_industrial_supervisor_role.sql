-- PC7 (D1): add the INDUSTRIAL_SUPERVISOR value to the users.role enum so a
-- field supervisor is its own persona, not a SUPERVISOR row wearing a company
-- id. Widening an enum only ADDS a permitted value: it cannot destroy or
-- orphan data, so no rollback script exists by design (plan §2.1).
--
-- users.role is a MySQL enum, this repo has no migration tool, and Hibernate's
-- ddl-auto=update does not reliably widen enum columns — so this is hand-run,
-- once per environment, AFTER the pre-flight below and BEFORE first boot of
-- the PC7 build against that database.
--
-- Run ONCE against the mysql profile database:
--   mysql -u root -p internshipManagementSystem_db < backend/migration/add_industrial_supervisor_role.sql
--
-- Safe to re-run (idempotent: only widens if the value is missing).
--
-- ── 7.3 Pre-flight (run manually against PRODUCTION before deploying) ────────
-- Lists the legacy field-supervisor shape: SUPERVISOR rows with a company and
-- no university. Locally this returns zero rows (verified 2026-10-01); if it
-- returns rows in production, they will keep the old SUPERVISOR role until an
-- operator grants INDUSTRIAL_SUPERVISOR, and the startup check in
-- LegacyFieldSupervisorCheck logs them on every boot.
--
--   SELECT id, username, university_id, company_id
--   FROM users
--   WHERE role = 'SUPERVISOR'
--     AND company_id IS NOT NULL
--     AND university_id IS NULL;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'role'
       AND COLUMN_TYPE LIKE '%INDUSTRIAL_SUPERVISOR%') = 0,
    'ALTER TABLE users MODIFY COLUMN role ENUM(''ADMIN'',''COMPANY'',''STUDENT'',''SUPERVISOR'',''INDUSTRIAL_SUPERVISOR'') NOT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
