-- ============================================================================
-- Model B ETL — backend/migration/modelb_etl.sql            (M5.5, 2026-08-25)
-- ============================================================================
-- Converts the production Model-A dataset into the Model-B shape defined by
-- MIGRATION_PLAN.md. Run between M5 and M6c ONLY (ruling R6), against the
-- MySQL database, AFTER backing up. Idempotent: safe to re-run; every insert
-- update is guarded and every gate re-checked.
--
-- RUNBOOK (from repo root):
--   1. BACKUP (mandatory, keep until M6c sign-off):
--        mysqldump -uroot -p --single-transaction --routines \
--          internshipManagementSystem_db > backup_modela_$(date +%F).sql
--   2. DRY RUN on a scratch copy (recommended):
--        mysql -e "CREATE DATABASE ims_etl_scratch"
--        mysqldump internshipManagementSystem_db | mysql ims_etl_scratch
--        mysql ims_etl_scratch < backend/migration/modelb_etl.sql
--   3. PROD:
--        mysql internshipManagementSystem_db < backend/migration/modelb_etl.sql
--
-- SOURCE (Model A / pre-M3 live schema):
--   users(username PK-ish, role, email, company_id->company.id,
--         university_id)
--   student_profiles(id, student_no=users.username, student_name single
--         string, reg_no, program, mobile_no, year_of_study varchar,
--         organisation = company NAME, academic_supervisor NAME-or-username,
--         field_supervisor NAME, start_date, end_date, picture ...)
--   company(id, name, ...)                       [note: singular "company"]
--   day_diaries(student_profile_id -> profiles.id)
--   placements(student_id -> PROFILES.id!, company_id -> company.id!)
--   evaluations(student_id -> PROFILES.id!, supervisor_username/email)
--   staff(university-side supervisor names), company_supervisors(names)
--
-- TARGET (Model B, current entities / schema.sql):
--   students(user_id, student_number, first/last_name split, degree_program,
--         registration_number, phone_number, intake, academic_year, semester,
--         start_date, end_date, year_of_study INT, university_id=19 default,
--         internship_company_id, uni_supervisor_id, ind_supervisor_id)
--   internship_companies(company_name, ..., country_id -> countries.id)
--   university_supervisors / industrial_supervisors (typed rows)
--   day_diaries.student_id -> students.id
--   placements.student_id -> students.id; company_id -> internship_companies;
--         plus *_supervisor_id columns
--   evaluations.supervisor_user_id -> users.id
--
-- Legacy columns/tables are LEFT IN PLACE (rollback safety) and dropped at
-- M6c after reconciliation sign-off. picture blobs are intentionally dropped
-- (user ruling, MIGRATION_PLAN.md R3 lossy-field decision).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 0 — Schema drift repair: bring the live DB up to the transitional
-- shape (missing B tables + new nullable columns). Mirrors schema.sql.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id bigint not null auto_increment,
    user_id bigint not null,
    university_id bigint not null,
    student_number varchar(255) not null,
    registration_number varchar(255) not null,
    degree_program varchar(255) not null,
    first_name varchar(255) not null,
    last_name varchar(255) not null,
    phone_number varchar(255),
    intake varchar(255),
    academic_year varchar(255),
    semester varchar(255),
    start_date date,
    end_date date,
    year_of_study integer,
    internship_company_id bigint,
    uni_supervisor_id bigint,
    ind_supervisor_id bigint,
    primary key (id),
    unique key uk_students_student_number (student_number),
    unique key uk_students_user_id (user_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS internship_companies (
    id bigint not null auto_increment,
    company_name varchar(255) not null,
    email varchar(255),
    postal_address varchar(255),
    physical_address varchar(255),
    website varchar(255),
    branch varchar(255),
    country_id integer not null,
    university_id bigint,
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS university_supervisors (
    id bigint not null auto_increment,
    user_id bigint not null,
    university_id bigint not null,
    first_name varchar(255) not null,
    last_name varchar(255) not null,
    department varchar(255),
    phone_number varchar(255),
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS industrial_supervisors (
    id bigint not null auto_increment,
    user_id bigint,
    company_id bigint,
    first_name varchar(255) not null,
    last_name varchar(255) not null,
    job_title varchar(255),
    department varchar(255),
    phone_number varchar(255),
    primary key (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- STEP 0b — Column drift repair. MySQL has no ADD COLUMN IF NOT EXISTS, so
-- this helper checks information_schema first (idempotent re-runs).
-- ----------------------------------------------------------------------------
DELIMITER $$
DROP PROCEDURE IF EXISTS etl_add_column $$
CREATE PROCEDURE etl_add_column(
    IN in_table VARCHAR(64), IN in_column VARCHAR(64), IN in_ddl TEXT)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE()
                     AND table_name = in_table
                     AND column_name = in_column) THEN
        SET @ddl = in_ddl;
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DROP PROCEDURE IF EXISTS etl_apply_column_drift $$
CREATE PROCEDURE etl_apply_column_drift()
BEGIN
    CALL etl_add_column('day_diaries', 'student_id',
        'ALTER TABLE day_diaries ADD COLUMN student_id bigint NULL AFTER id');
    CALL etl_add_column('placements', 'university_supervisor_id',
        'ALTER TABLE placements ADD COLUMN university_supervisor_id bigint NULL');
    CALL etl_add_column('placements', 'company_supervisor_id',
        'ALTER TABLE placements ADD COLUMN company_supervisor_id bigint NULL');
    CALL etl_add_column('evaluations', 'supervisor_user_id',
        'ALTER TABLE evaluations ADD COLUMN supervisor_user_id bigint NULL');
END $$

CALL etl_apply_column_drift() $$
DELIMITER ;
-- ----------------------------------------------------------------------------
-- STEP 1 — Companies: company(A) -> internship_companies(B)
-- ----------------------------------------------------------------------------
INSERT INTO internship_companies
    (company_name, email, postal_address, physical_address, website,
     branch, country_id, university_id)
SELECT c.name, c.email, c.postal_address, c.physical_address, c.website,
       NULL AS branch,
       COALESCE(ctry.id, (SELECT MIN(id) FROM countries WHERE name = 'Uganda')) AS country_id,
       19 AS university_id                     -- single-university deployment
FROM company c
LEFT JOIN countries ctry
       ON ctry.name = COALESCE(NULLIF(c.country, ''), 'Uganda')
WHERE NOT EXISTS (SELECT 1 FROM internship_companies ic
                  WHERE ic.company_name = c.name);

-- ----------------------------------------------------------------------------
-- STEP 2 — Supervisors
--   university_supervisors <- staff WITH a university anchor, linked to the
--     SUPERVISOR user account when one exists (prod: 'university').
--   industrial_supervisors <- company_supervisors (+ any staff field
--     supervisors without a university anchor), company ids remapped to
--     internship_companies.
-- ----------------------------------------------------------------------------
INSERT INTO university_supervisors
    (user_id, university_id, first_name, last_name, department, phone_number)
SELECT COALESCE(u.id, 0)                        AS user_id,
       COALESCE(s.university_id, 19)            AS university_id,
       SUBSTRING_INDEX(s.full_name, ' ', 1)     AS first_name,
       TRIM(SUBSTRING(s.full_name, LENGTH(SUBSTRING_INDEX(s.full_name, ' ', 1)) + 1)) AS last_name,
       s.role                                   AS department,
       s.contact                                AS phone_number
FROM staff s
LEFT JOIN users u ON u.role = 'SUPERVISOR'
WHERE s.university_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM university_supervisors us
                  WHERE us.first_name = SUBSTRING_INDEX(s.full_name, ' ', 1)
                    AND us.last_name  = TRIM(SUBSTRING(s.full_name,
                            LENGTH(SUBSTRING_INDEX(s.full_name, ' ', 1)) + 1)));

INSERT INTO industrial_supervisors
    (user_id, company_id, first_name, last_name, job_title, department, phone_number)
SELECT NULL                                     AS user_id,
       ic.id                                    AS company_id,
       SUBSTRING_INDEX(cs.full_name, ' ', 1)    AS first_name,
       TRIM(SUBSTRING(cs.full_name, LENGTH(SUBSTRING_INDEX(cs.full_name, ' ', 1)) + 1)) AS last_name,
       cs.role                                  AS job_title,
       NULL                                     AS department,
       cs.contact                               AS phone_number
FROM company_supervisors cs
JOIN company c              ON c.id = cs.company_id
LEFT JOIN internship_companies ic ON ic.company_name = c.name
WHERE NOT EXISTS (SELECT 1 FROM industrial_supervisors ins
                  WHERE ins.first_name = SUBSTRING_INDEX(cs.full_name, ' ', 1)
                    AND ins.last_name  = TRIM(SUBSTRING(cs.full_name,
                            LENGTH(SUBSTRING_INDEX(cs.full_name, ' ', 1)) + 1))
                    AND (ins.company_id = ic.id OR (ins.company_id IS NULL AND ic.id IS NULL)));
-- Field-supervisor staff without a university anchor become unattached
-- industrial supervisors so their names still resolve.
INSERT INTO industrial_supervisors
    (user_id, company_id, first_name, last_name, job_title, department, phone_number)
SELECT NULL, NULL,
       SUBSTRING_INDEX(s.full_name, ' ', 1),
       TRIM(SUBSTRING(s.full_name, LENGTH(SUBSTRING_INDEX(s.full_name, ' ', 1)) + 1)),
       s.role, NULL, s.contact
FROM staff s
LEFT JOIN industrial_supervisors ins
       ON ins.first_name = SUBSTRING_INDEX(s.full_name, ' ', 1)
      AND ins.last_name  = TRIM(SUBSTRING(s.full_name,
              LENGTH(SUBSTRING_INDEX(s.full_name, ' ', 1)) + 1))
WHERE s.university_id IS NULL AND ins.id IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 3 — Students: student_profiles + users -> students
--   * requires a matching user account (login identity); unmatched profiles
--     are counted by GATE G4 for manual handling.
--   * name split: first token = first_name, remainder = last_name.
--   * organisation (company NAME) resolves to internship_companies.
--   * academic_supervisor resolves by exact name, else by SUPERVISOR
--     username; field_supervisor by name against industrial rows.
-- ----------------------------------------------------------------------------
INSERT INTO students
    (user_id, university_id, student_number, registration_number,
     degree_program, first_name, last_name, phone_number,
     intake, academic_year, semester, start_date, end_date, year_of_study,
     internship_company_id, uni_supervisor_id, ind_supervisor_id)
SELECT u.id,
       COALESCE(u.university_id, 19),
       sp.student_no,
       COALESCE(NULLIF(sp.reg_no, ''), 'Pending'),
       COALESCE(NULLIF(sp.program, ''), 'Undeclared'),
       SUBSTRING_INDEX(sp.student_name, ' ', 1),
       CASE WHEN LOCATE(' ', sp.student_name) > 0
            THEN TRIM(SUBSTRING(sp.student_name, LOCATE(' ', sp.student_name) + 1))
            ELSE SUBSTRING_INDEX(sp.student_name, ' ', -1) END,
       NULLIF(sp.mobile_no, ''),
       NULLIF(sp.intake, ''),
       NULLIF(sp.academic_year, ''),
       NULLIF(sp.semester, ''),
       sp.start_date,
       sp.end_date,
       CASE WHEN sp.year_of_study REGEXP '^[0-9]+$'
            THEN CAST(sp.year_of_study AS UNSIGNED) ELSE NULL END,
       ic.id,
       NULL,
       ins.id
FROM student_profiles sp
JOIN users u                ON u.username = sp.student_no
LEFT JOIN internship_companies ic ON ic.company_name = sp.organisation
LEFT JOIN university_supervisors us
       ON CONCAT(us.first_name, ' ', us.last_name) = sp.academic_supervisor
LEFT JOIN industrial_supervisors ins
       ON CONCAT(ins.first_name, ' ', ins.last_name) = sp.field_supervisor
WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.student_number = sp.student_no);

-- Normalise the two-path supervisor resolution (name match wins, then user
-- account match) into one column.
UPDATE students s
JOIN student_profiles sp ON sp.student_no = s.student_number
SET s.uni_supervisor_id = COALESCE(
        (SELECT us.id FROM university_supervisors us
         WHERE CONCAT(us.first_name, ' ', us.last_name) = sp.academic_supervisor
         LIMIT 1),
        (SELECT us2.id FROM university_supervisors us2
         JOIN users u2 ON u2.id = us2.user_id
         WHERE u2.username = sp.academic_supervisor LIMIT 1))
WHERE s.uni_supervisor_id IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 4 — Day diaries: student_profile_id -> students.id
-- ----------------------------------------------------------------------------
UPDATE day_diaries d
JOIN student_profiles sp ON sp.id = d.student_profile_id
JOIN students s          ON s.student_number = sp.student_no
SET d.student_id = s.id
WHERE d.student_id IS NULL;

-- Tighten after backfill (entity declares NOT NULL).
ALTER TABLE day_diaries MODIFY student_id bigint NOT NULL;

-- ----------------------------------------------------------------------------
-- STEP 5 — Placements: remap profile-id keys to Model-B ids + typed
-- supervisor ids from the legacy display strings.
-- ----------------------------------------------------------------------------
-- Guard: skip rows whose student_id already IS the converted B id
-- (numeric id spaces overlap in small datasets).
UPDATE placements p
JOIN student_profiles sp ON sp.id = p.student_id
JOIN students s          ON s.student_number = sp.student_no
LEFT JOIN students already ON already.id = p.student_id
SET p.student_id = s.id
WHERE already.id IS NULL OR already.student_number <> sp.student_no;

UPDATE placements p
JOIN company c               ON c.id = p.company_id
LEFT JOIN internship_companies ic ON ic.company_name = c.name
SET p.company_id = COALESCE(ic.id, p.company_id);

UPDATE placements p
JOIN university_supervisors us
     ON CONCAT(us.first_name, ' ', us.last_name) = p.university_supervisor
SET p.university_supervisor_id = us.id
WHERE p.university_supervisor_id IS NULL;

UPDATE placements p
JOIN users u2                ON u2.username = p.university_supervisor
                             AND u2.role = 'SUPERVISOR'
JOIN university_supervisors us ON us.user_id = u2.id
SET p.university_supervisor_id = us.id
WHERE p.university_supervisor_id IS NULL;

UPDATE placements p
JOIN industrial_supervisors ins
     ON CONCAT(ins.first_name, ' ', ins.last_name) = p.company_supervisor
SET p.company_supervisor_id = ins.id
WHERE p.company_supervisor_id IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 6 — Evaluations: remap student keys + resolve supervisor user id.
-- ----------------------------------------------------------------------------
UPDATE evaluations e
JOIN student_profiles sp ON sp.id = e.student_id
JOIN students s          ON s.student_number = sp.student_no
SET e.student_id = s.id;                      -- one-shot key remap

UPDATE evaluations e
LEFT JOIN users u  ON u.username = e.supervisor_username
LEFT JOIN users u2 ON u2.email    = e.supervisor_username
SET e.supervisor_user_id = COALESCE(u.id, u2.id)
WHERE e.supervisor_user_id IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 7 — RECONCILIATION GATES (R6): every gate must pass before the
-- migration is considered complete. Any failure raises SQLSTATE 45000.
-- ----------------------------------------------------------------------------
DELIMITER $$

DROP PROCEDURE IF EXISTS etl_gate $$
CREATE PROCEDURE etl_gate(IN gate_name VARCHAR(64), IN failures INT)
BEGIN
    IF failures <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ETL gate failed', MYSQL_ERRNO = 45000;
    END IF;
END $$

DROP PROCEDURE IF EXISTS run_etl_gates $$
CREATE PROCEDURE run_etl_gates()
BEGIN
    DECLARE g_bad_students        INT;  -- orphans / dupes / bad refs
    DECLARE g_unmapped_diaries    INT;
    DECLARE g_unmapped_placements INT;
    DECLARE g_unmapped_evals      INT;
    DECLARE g_count_mismatch      INT;
    DECLARE g_lost_profiles       INT;

    -- G1: every student links to a real user; numbers unique (PK enforces).
    SELECT COUNT(*) INTO g_bad_students FROM students s
    LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL;

    -- G2: every diary points at a real Model-B student.
    SELECT COUNT(*) INTO g_unmapped_diaries FROM day_diaries d
    LEFT JOIN students s ON s.id = d.student_id
    WHERE s.id IS NULL;

    -- G3: every placement points at real student + company rows.
    SELECT COUNT(*) INTO g_unmapped_placements FROM placements p
    LEFT JOIN students s ON s.id = p.student_id
    LEFT JOIN internship_companies ic ON ic.id = p.company_id
    WHERE s.id IS NULL OR ic.id IS NULL;

    -- G4: every evaluation points at a real student.
    SELECT COUNT(*) INTO g_unmapped_evals FROM evaluations e
    LEFT JOIN students s ON s.id = e.student_id
    WHERE s.id IS NULL;

    -- G5: no student_profiles row was silently dropped (profiles without a
    --     user account are reported here for manual follow-up).
    SELECT COUNT(*) INTO g_lost_profiles FROM student_profiles sp
    WHERE NOT EXISTS (SELECT 1 FROM students s
                      WHERE s.student_number = sp.student_no);

    -- G6: converted counts line up with sources (diary/placement/evaluation
    --     totals unchanged by the ETL).
    SET g_count_mismatch =
          (SELECT COUNT(*) FROM day_diaries) - (SELECT COUNT(*) FROM student_profiles sp JOIN day_diaries d ON d.student_profile_id = sp.id)
        + (SELECT COUNT(*) FROM placements)  - (SELECT COUNT(*) FROM student_profiles sp JOIN placements p  ON p.student_id = sp.id)
        + (SELECT COUNT(*) FROM evaluations) - (SELECT COUNT(*) FROM student_profiles sp JOIN evaluations e ON e.student_id = sp.id);

    CALL etl_gate('G1 students->users orphan',      g_bad_students);
    CALL etl_gate('G2 unmapped diaries',            g_unmapped_diaries);
    CALL etl_gate('G3 unmapped placements',         g_unmapped_placements);
    CALL etl_gate('G4 unmapped evaluations',        g_unmapped_evals);
    CALL etl_gate('G5 profiles without accounts',   g_lost_profiles);
    CALL etl_gate('G6 source/target count drift',   g_count_mismatch);
END $$

DELIMITER ;

CALL run_etl_gates();
DROP PROCEDURE run_etl_gates;
DROP PROCEDURE etl_gate;

-- ----------------------------------------------------------------------------
-- POST-RUN REPORT (human-readable reconciliation summary)
-- ----------------------------------------------------------------------------
SELECT 'students'            AS target, COUNT(*) AS rows_now FROM students
UNION ALL SELECT 'internship_companies', COUNT(*) FROM internship_companies
UNION ALL SELECT 'university_supervisors', COUNT(*) FROM university_supervisors
UNION ALL SELECT 'industrial_supervisors', COUNT(*) FROM industrial_supervisors
UNION ALL SELECT 'day_diaries(mapped)',  COUNT(*) FROM day_diaries WHERE student_id IS NOT NULL
UNION ALL SELECT 'placements(typed-sup)', COUNT(*) FROM placements WHERE university_supervisor_id IS NOT NULL AND company_supervisor_id IS NOT NULL
UNION ALL SELECT 'evaluations(typed-sup)', COUNT(*) FROM evaluations WHERE supervisor_user_id IS NOT NULL;

SELECT s.student_number, CONCAT(s.first_name, ' ', s.last_name) AS name,
       s.registration_number, s.degree_program, ic.company_name AS company,
       us.last_name AS uni_sup, ins.last_name AS ind_sup
FROM students s
LEFT JOIN internship_companies ic ON ic.id = s.internship_company_id
LEFT JOIN university_supervisors us ON us.id = s.uni_supervisor_id
LEFT JOIN industrial_supervisors ins ON ins.id = s.ind_supervisor_id
ORDER BY s.id;
