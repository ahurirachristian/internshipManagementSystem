-- Add OFFERED to the placements.status enum.
--
-- Drift found while preparing the stakeholder demo DB (2026-10-06): the Java
-- Placement.Status enum has carried OFFERED since PC7 (Placement.java, "P7:
-- company offer awaiting university supervisor assignment") and
-- PlacementPipelineService.createOffer / offerForReview write it — but the
-- MySQL column was created before that value existed, and Hibernate's
-- ddl-auto=update never widens enum columns. Every "Offer placement" click
-- therefore dies with MySQL 1265 against this database. Same shape, same
-- rationale, same pattern as add_industrial_supervisor_role.sql: widening an
-- enum only ADDS a permitted value, so it cannot destroy or orphan data and
-- no rollback script exists by design.
--
-- Run ONCE per environment (idempotent: only widens if the value is missing):
--   mysql -u root -p internshipManagementSystem_db < backend/migration/add_offered_placement_status.sql

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'placements'
       AND COLUMN_NAME = 'status'
       AND COLUMN_TYPE LIKE '%OFFERED%') = 0,
    'ALTER TABLE placements MODIFY COLUMN status ENUM(''PENDING'',''OFFERED'',''ASSIGNED'',''ACTIVE'',''COMPLETED'',''CANCELLED'') NOT NULL DEFAULT ''PENDING''',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
