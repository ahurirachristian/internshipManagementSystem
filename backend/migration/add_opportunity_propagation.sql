-- Opportunity propagation (plan §5.1–5.11): the vacancies column inventory,
-- the four relay tables, and the OPEN -> PUBLISHED backfill.
--
-- Run ONCE against the mysql profile database after deploying the entities
-- that carry these fields:
--   mysql -u root -p internshipManagementSystem_db < backend/migration/add_opportunity_propagation.sql
--
-- Safe to re-run: every statement is guarded by an information_schema check,
-- so a partial run can be repeated to finish the job.
--
-- WHY THIS FILE EXISTS AT ALL. The h2/dev profile builds its schema from the
-- annotations via ddl-auto=update and never reads this script. So nothing in
-- the test suite would notice if a column here disagreed with the entity —
-- H2 would keep passing while the mysql profile failed at runtime.
-- OpportunitySchemaTest forces every new column through a real INSERT/SELECT,
-- but that only exercises H2's idea of the schema. OpportunityMigrationDdlTest
-- exists to close that gap: it parses this file and compares it to the
-- entities field by field.
--
-- TWO CHANGES THAT ARE NOT PURELY ADDITIVE, both deliberate:
--
--   1. company_id becomes NULLABLE. R2 (a sourced external offer), R5 and R6
--      have no company and name the host in external_org_name instead. This
--      is the only loosening in the plan; every other change only adds.
--
--   2. status rows reading 'OPEN' are rewritten to 'PUBLISHED'. The apply gate
--      at ApplicationService.java:85 compares against the literal "OPEN", so
--      this rewrite is the flip side of S1.7 rewriting that comparison. Do not
--      run this before deploying the S1.7 entities, or adverts become
--      unappliable in the window between the backfill and the deploy.
--      Conversely, deploying S1.7 first is safe: "OPEN" keeps parsing as
--      PUBLISHED through the legacy alias.
--
-- NOTHING IS DROPPED. No column, table or index is removed here.

-- ── vacancies: §5.1 provenance and verification ────────────────────────────
--
-- origin and verification_status are NOT NULL with a default, because they
-- decide the audience: the resolver branches on origin, and nothing but a
-- super admin may move an advert off UNVERIFIED.

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'origin') = 0,
    'ALTER TABLE vacancies ADD COLUMN origin VARCHAR(20) NOT NULL DEFAULT ''COMPANY''',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'verification_status') = 0,
    'ALTER TABLE vacancies ADD COLUMN verification_status VARCHAR(16) NOT NULL DEFAULT ''UNVERIFIED''',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'external_org_name') = 0,
    'ALTER TABLE vacancies ADD COLUMN external_org_name VARCHAR(200) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'source_kind') = 0,
    'ALTER TABLE vacancies ADD COLUMN source_kind VARCHAR(24) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'source_reference') = 0,
    'ALTER TABLE vacancies ADD COLUMN source_reference VARCHAR(500) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'verified_by') = 0,
    'ALTER TABLE vacancies ADD COLUMN verified_by BIGINT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'verified_at') = 0,
    'ALTER TABLE vacancies ADD COLUMN verified_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'verification_note') = 0,
    'ALTER TABLE vacancies ADD COLUMN verification_note VARCHAR(500) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'published_at') = 0,
    'ALTER TABLE vacancies ADD COLUMN published_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'reviewed_at') = 0,
    'ALTER TABLE vacancies ADD COLUMN reviewed_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'review_note') = 0,
    'ALTER TABLE vacancies ADD COLUMN review_note VARCHAR(500) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'updated_at') = 0,
    'ALTER TABLE vacancies ADD COLUMN updated_at DATETIME(6) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── vacancies: §5.2 awareness and completeness ─────────────────────────────
-- safety_orientation_required defaults to 0. False is the honest default for a
-- mandatory site briefing nobody mentioned; defaulting it to 1 would block
-- every existing advert at onboard.

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'responsibilities') = 0,
    'ALTER TABLE vacancies ADD COLUMN responsibilities TEXT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'deliverables_expected') = 0,
    'ALTER TABLE vacancies ADD COLUMN deliverables_expected TEXT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'benefits') = 0,
    'ALTER TABLE vacancies ADD COLUMN benefits TEXT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'required_skills') = 0,
    'ALTER TABLE vacancies ADD COLUMN required_skills TEXT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'nice_to_have') = 0,
    'ALTER TABLE vacancies ADD COLUMN nice_to_have TEXT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'tools_technologies') = 0,
    'ALTER TABLE vacancies ADD COLUMN tools_technologies VARCHAR(500) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'safety_orientation_required') = 0,
    'ALTER TABLE vacancies ADD COLUMN safety_orientation_required BOOLEAN NOT NULL DEFAULT 0',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'safety_notes') = 0,
    'ALTER TABLE vacancies ADD COLUMN safety_notes TEXT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── vacancies: §5.3 logistics ──────────────────────────────────────────────
-- is_paid is nullable with NO default: null means the advertiser never said,
-- false means unpaid. Giving it a default would erase that distinction.

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'work_mode') = 0,
    'ALTER TABLE vacancies ADD COLUMN work_mode VARCHAR(16) NOT NULL DEFAULT ''ONSITE''',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'country') = 0,
    'ALTER TABLE vacancies ADD COLUMN country VARCHAR(100) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'city') = 0,
    'ALTER TABLE vacancies ADD COLUMN city VARCHAR(100) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'address_detail') = 0,
    'ALTER TABLE vacancies ADD COLUMN address_detail VARCHAR(255) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'duration_weeks') = 0,
    'ALTER TABLE vacancies ADD COLUMN duration_weeks INT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'start_date') = 0,
    'ALTER TABLE vacancies ADD COLUMN start_date DATE NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'end_date') = 0,
    'ALTER TABLE vacancies ADD COLUMN end_date DATE NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'is_paid') = 0,
    'ALTER TABLE vacancies ADD COLUMN is_paid BOOLEAN NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'stipend_amount') = 0,
    'ALTER TABLE vacancies ADD COLUMN stipend_amount DECIMAL(12,2) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'stipend_currency') = 0,
    'ALTER TABLE vacancies ADD COLUMN stipend_currency VARCHAR(3) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'stipend_period') = 0,
    'ALTER TABLE vacancies ADD COLUMN stipend_period VARCHAR(16) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── vacancies: §5.4 targeting, capacity, contact, application ──────────────
-- The targeting columns are comma-separated id lists, matching the entity.
-- The academic hierarchy mixes Integer and Long ids (plan §2.5); a
-- row-per-target table would put that type trap in the one place that has
-- to be right. Parsed once, in the service.

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'target_school_ids') = 0,
    'ALTER TABLE vacancies ADD COLUMN target_school_ids VARCHAR(255) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'target_department_ids') = 0,
    'ALTER TABLE vacancies ADD COLUMN target_department_ids VARCHAR(255) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'target_programme_ids') = 0,
    'ALTER TABLE vacancies ADD COLUMN target_programme_ids VARCHAR(255) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'target_year_of_study') = 0,
    'ALTER TABLE vacancies ADD COLUMN target_year_of_study VARCHAR(50) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'target_degree_levels') = 0,
    'ALTER TABLE vacancies ADD COLUMN target_degree_levels VARCHAR(255) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'min_cgpa') = 0,
    'ALTER TABLE vacancies ADD COLUMN min_cgpa DECIMAL(4,2) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'slots') = 0,
    'ALTER TABLE vacancies ADD COLUMN slots INT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'eligibility_notes') = 0,
    'ALTER TABLE vacancies ADD COLUMN eligibility_notes TEXT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'contact_person_name') = 0,
    'ALTER TABLE vacancies ADD COLUMN contact_person_name VARCHAR(150) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'contact_role') = 0,
    'ALTER TABLE vacancies ADD COLUMN contact_role VARCHAR(100) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'contact_email') = 0,
    'ALTER TABLE vacancies ADD COLUMN contact_email VARCHAR(200) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'contact_phone') = 0,
    'ALTER TABLE vacancies ADD COLUMN contact_phone VARCHAR(50) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'application_instructions') = 0,
    'ALTER TABLE vacancies ADD COLUMN application_instructions TEXT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'application_email') = 0,
    'ALTER TABLE vacancies ADD COLUMN application_email VARCHAR(200) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'application_phone') = 0,
    'ALTER TABLE vacancies ADD COLUMN application_phone VARCHAR(50) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'application_url') = 0,
    'ALTER TABLE vacancies ADD COLUMN application_url VARCHAR(500) NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'required_attachments') = 0,
    'ALTER TABLE vacancies ADD COLUMN required_attachments TEXT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── vacancies: the two non-additive changes ────────────────────────────────

-- description/requirements widen from VARCHAR(1000) to TEXT. 1000 characters is
-- the default nobody checked against the requirement, and R8 exists because a
-- student cannot decide on an internship from a paragraph that ends mid-sentence.
SET @stmt = (SELECT IF(
    (SELECT DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'description') = 'varchar',
    'ALTER TABLE vacancies MODIFY COLUMN description TEXT NOT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt = (SELECT IF(
    (SELECT DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'requirements') = 'varchar',
    'ALTER TABLE vacancies MODIFY COLUMN requirements TEXT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- company_id becomes nullable. Guarded on is_nullable so a re-run is a no-op.
SET @stmt = (SELECT IF(
    (SELECT IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vacancies'
       AND COLUMN_NAME = 'company_id') = 'NO',
    'ALTER TABLE vacancies MODIFY COLUMN company_id BIGINT NULL',
    'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ── the OPEN -> PUBLISHED backfill ──────────────────────────────────────────
-- Idempotent by construction: after the first run no row reads 'OPEN'.
-- Case-insensitive because the gate at ApplicationService.java:85 used
-- equalsIgnoreCase, so a lower-case 'open' row was admissible and must not be
-- left behind to become unappliable.

UPDATE vacancies SET status = 'PUBLISHED' WHERE UPPER(status) = 'OPEN';

-- ── opportunity_offers: super admin -> university ──────────────────────────
-- UNIQUE (vacancy_id, university_id) is the whole point of the table: it turns a
-- double-click, or two super admins acting at once, into one error instead of two
-- live offers the same university would answer twice. university_id is BIGINT to
-- match users.university_id — note University.universityId is itself an Integer
-- (plan §2.5), so the conversion happens once, in the service.
-- No foreign keys, matching the house style of scalar id columns everywhere else.

CREATE TABLE IF NOT EXISTS opportunity_offers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    vacancy_id BIGINT NOT NULL,
    university_id BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OFFERED',
    note VARCHAR(500) NULL,
    offered_by BIGINT NOT NULL,
    offered_at DATETIME(6) NOT NULL,
    responded_by BIGINT NULL,
    responded_at DATETIME(6) NULL,
    response_note VARCHAR(500) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_opportunity_offers_vacancy_university (vacancy_id, university_id),
    KEY idx_opportunity_offers_university_status (university_id, status),
    KEY idx_opportunity_offers_vacancy (vacancy_id)
) ENGINE=InnoDB;

-- ── opportunity_shares: university -> students ─────────────────────────────
-- offer_id is NULL for R5 (university sourced it) and R6 (approved supervisor
-- submission). That is a record that no super admin was involved, not a gap.
-- The targeting columns are duplicated here so a share can narrow the audience
-- on the way down without S6.3 having to reconstruct what was originally offered.

CREATE TABLE IF NOT EXISTS opportunity_shares (
    id BIGINT NOT NULL AUTO_INCREMENT,
    vacancy_id BIGINT NOT NULL,
    university_id BIGINT NOT NULL,
    offer_id BIGINT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'SHARED',
    note VARCHAR(500) NULL,
    shared_by BIGINT NOT NULL,
    shared_at DATETIME(6) NOT NULL,
    closed_at DATETIME(6) NULL,
    closed_by BIGINT NULL,
    target_programme_ids VARCHAR(255) NULL,
    target_department_ids VARCHAR(255) NULL,
    target_year_of_study VARCHAR(50) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_opportunity_shares_vacancy_university (vacancy_id, university_id),
    KEY idx_opportunity_shares_university_status (university_id, status),
    KEY idx_opportunity_shares_vacancy (vacancy_id)
) ENGINE=InnoDB;

-- ── opportunity_submissions: supervisor -> university (R6) ─────────────────
-- UNIQUE (vacancy_id) ALONE, deliberately. An advert may be offered to many
-- universities and shared with many; it may be submitted by exactly one
-- supervisor, ever. Widening this to (vacancy_id, university_id) would let two
-- universities each hold a reviewable submission, reach different decisions, and
-- then share the advert twice. R5 already covers self-sourcing via a share with
-- a NULL offer_id, so nobody is blocked by this.

CREATE TABLE IF NOT EXISTS opportunity_submissions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    vacancy_id BIGINT NOT NULL,
    university_id BIGINT NOT NULL,
    submitted_by BIGINT NOT NULL,
    submitted_at DATETIME(6) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    note VARCHAR(500) NULL,
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME(6) NULL,
    review_note VARCHAR(500) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_opportunity_submissions_vacancy (vacancy_id),
    KEY idx_opportunity_submissions_university_status (university_id, status),
    KEY idx_opportunity_submissions_submitter (submitted_by)
) ENGINE=InnoDB;

-- ── opportunity_status_history: append-only transition trail ───────────────
-- Statuses are plain strings on purpose: the trail must stay readable if the
-- enum vocabulary changes at S1.7. A status that has since been retired still
-- has to render in the S8.2 history view, and an enum cannot store a value it
-- no longer declares. from_status is NULL because the first transition has no
-- predecessor; university_id is NULL because an advert-level transition belongs
-- to no university. No foreign key to vacancies: this is an audit record and
-- outlives the row, exactly like audit_logs.

CREATE TABLE IF NOT EXISTS opportunity_status_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    vacancy_id BIGINT NOT NULL,
    university_id BIGINT NULL,
    relay_type VARCHAR(16) NULL,
    from_status VARCHAR(20) NULL,
    to_status VARCHAR(20) NOT NULL,
    changed_at DATETIME(6) NOT NULL,
    changed_by BIGINT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_opportunity_status_history_vacancy_time (vacancy_id, changed_at),
    KEY idx_opportunity_status_history_university (university_id)
) ENGINE=InnoDB;

-- ── opportunity_attachments: advert files, deliberately NOT in documents ───
-- The `documents` table cannot hold these. DocumentScopeService.findVisibleTo
-- keys on admin / caller's university_id / caller's company_id / uploader, and its
-- `audience` column plays no part in the decision — it is a display string echoed
-- back by FileController.toSummary. So an advert file in `documents` is either
-- readable by EVERY student at that university, including the ones no share
-- targeted, or super-admin-only with no student ever seeing the offer letter.
-- Neither is R8, and the predicate cannot express "these students at this
-- university". A separate table also leaves File Management and its passing
-- tests untouched.
--
-- university_id NULLABLE is what carries both audiences at once: NULL means an
-- advert-level file for the super admin and the advertising side, omitted from a
-- student's listing entirely; set means it was shared with one university's
-- students, narrowed further by the two targeting columns.
--
-- file_name is a server-generated UUID and is the only name ever resolved as a
-- path. original_file_name is what the uploader's browser sent: display only.
-- Conflating them is how a client-supplied ../../etc/passwd becomes a path, so
-- the metadata listing at S6.7 returns neither this nor storage_path to a client.

CREATE TABLE IF NOT EXISTS opportunity_attachments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    vacancy_id BIGINT NOT NULL,
    university_id BIGINT NULL,
    target_programme_ids VARCHAR(255) NULL,
    target_year_of_study VARCHAR(50) NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_by BIGINT NOT NULL,
    uploaded_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_opportunity_attachments_vacancy (vacancy_id),
    KEY idx_opportunity_attachments_university (university_id)
) ENGINE=InnoDB;
