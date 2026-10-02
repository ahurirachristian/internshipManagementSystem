-- PC9 (D3 part 2): the applications table — a student's application to a
-- vacancy, with the lifecycle status the applicant funnel chart is built on.
--
--   applications (new table)
--
-- LINK POLICY: vacancy_id / company_id / student_id are plain BIGINTs with NO
-- foreign keys, mirroring placements and placement_status_history. company_id
-- is copied from the VACANCY row at apply time (never from the request body),
-- so the applicant's funnel query is a single-table read and a later vacancy
-- re-parenting can never silently rewrite a company's applicant history.
--
-- STATUS POLICY: `status` is a VARCHAR(32) holding Application.Status.name()
-- (SUBMITTED / REVIEWING / SHORTLISTED / ACCEPTED / REJECTED / WITHDRAWN) —
-- the same "readable even if the Java enum changes" stance as
-- placement_status_history. The enum is the enforcement mechanism (illegal
-- jumps are refused with 409); this column only stores the accepted value.
-- Keeping the column wide enough for all six values is what lets a future
-- status be added without another ALTER.
--
-- DATETIME(6) matches what Hibernate's MySQL DDL emits for LocalDateTime
-- (see backend/schema.sql). No backfill: the table is new, so there is
-- nothing to invent — this script performs zero UPDATEs by design.
--
-- The table is also created automatically for the h2/dev profile by Hibernate
-- ddl-auto (create-drop in tests, update in dev) once the entity ships; this
-- script brings the mysql profile database up to date.
--
-- Run ONCE against the mysql profile database after deploying the entity:
--   mysql -u root -p internshipManagementSystem_db < backend/migration/add_applications.sql
--
-- Safe to re-run (idempotent: CREATE TABLE IF NOT EXISTS + each index is
-- only created after an information_schema check, because MySQL has no
-- CREATE INDEX IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS applications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    vacancy_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    created_at DATETIME(6) NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ── indexes for the three scoped reads PC9 performs ───────────────────────
-- One application per student per vacancy is a service-level rule (409 on the
-- duplicate); this index is what makes the duplicate check an index lookup
-- rather than a scan, and it is the same lookup the UI uses to render the
-- student's "already applied" state.

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'applications'
       AND INDEX_NAME = 'idx_applications_vacancy_student') = 0,
    'CREATE INDEX idx_applications_vacancy_student ON applications (vacancy_id, student_id)',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

-- The company applicant list and the company funnel both read by company_id.

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'applications'
       AND INDEX_NAME = 'idx_applications_company') = 0,
    'CREATE INDEX idx_applications_company ON applications (company_id)',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

-- The student's own list and funnel both read by student_id.

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'applications'
       AND INDEX_NAME = 'idx_applications_student') = 0,
    'CREATE INDEX idx_applications_student ON applications (student_id)',
    'SELECT 1'
));
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;