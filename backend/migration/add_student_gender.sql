-- Analytics: add gender to the students table so the university dashboard can
-- render a gender-breakdown chart.
--
-- The column is also added for the H2/dev profile automatically by Hibernate
-- ddl-auto=update once Student carries the field. This script brings the mysql
-- profile database up to date.
--
-- Run ONCE against the mysql profile database after deploying the new entity:
--   mysql -u root -p internshipManagementSystem_db < backend/migration/add_student_gender.sql
--
-- Safe to re-run (idempotent: only adds the column if it is missing).

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'students'
       AND COLUMN_NAME = 'gender') = 0,
    'ALTER TABLE students ADD COLUMN gender VARCHAR(10) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
