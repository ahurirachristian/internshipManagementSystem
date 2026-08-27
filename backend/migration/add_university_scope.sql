-- M8: backfill university_id on the transaction tables (day_diaries, evaluations, placements)
--
-- The schema now has an indexed university_id column on these tables (additive,
-- created by Hibernate ddl-auto=update once the entities carry the field).
-- This script backfills existing rows by joining each table to the Model-B
-- students table (students.university_id) so historical data is university-scoped.
--
-- Run ONCE against the mysql profile database after deploying the new entities:
--   mysql -u root -p internshipManagementSystem_db < backend/migration/add_university_scope.sql
--
-- Safe to re-run (idempotent: it only updates rows where university_id IS NULL).

UPDATE day_diaries d
   JOIN students s ON s.id = d.student_id
   SET d.university_id = s.university_id
 WHERE d.university_id IS NULL;

UPDATE evaluations e
   JOIN students s ON s.id = e.student_id
   SET e.university_id = s.university_id
 WHERE e.university_id IS NULL;

UPDATE placements p
   JOIN students s ON s.id = p.student_id
   SET p.university_id = s.university_id
 WHERE p.university_id IS NULL;

-- Recommended indexes to keep university-scoped aggregation fast.
CREATE INDEX idx_day_diaries_university ON day_diaries (university_id);
CREATE INDEX idx_evaluations_university ON evaluations (university_id);
CREATE INDEX idx_placements_university  ON placements (university_id);
