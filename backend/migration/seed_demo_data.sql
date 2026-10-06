-- ============================================================================
-- seed_demo_data.sql — stakeholder demo dataset (branch working-fred snapshot)
-- ============================================================================
-- Purpose:  Give the four demo personas (Student, Company, University
--           Supervisor, Industrial Supervisor) a medium-sized, believable
--           dataset so stakeholders can see how things work: vacancies to
--           browse, applications to review, placements to track, diaries to
--           approve, evaluations to read, notifications to see.
--
-- Mode:     ADD ALONGSIDE — nothing that already exists is touched, except
--           rows this script itself previously created (see markers below),
--           which are deleted and re-inserted so the script is re-runnable.
--
-- Prerequisites (idempotent, run once BEFORE first seed run):
--   mysql -u root -p internshipManagementSystem_db < backend/migration/add_industrial_supervisor_role.sql
--   mysql -u root -p internshipManagementSystem_db < backend/migration/add_offered_placement_status.sql
--   (the first adds INDUSTRIAL_SUPERVISOR to users.role — without it the new
--    field-supervisor login cannot exist; the second adds OFFERED to
--    placements.status — without it the offer pipeline 500s.)
--
-- Run:
--   mysql -u root -p internshipManagementSystem_db < backend/migration/seed_demo_data.sql
--   (safe to re-run any number of times — see "Markers")
--
-- Rollback: restore the pre-seed dump taken immediately before the first run:
--   backups/pre-demo-seed-<timestamp>.sql
--
-- Markers (what this script owns, i.e. deletes-then-reinserts):
--   users                      username LIKE 'demo.%' OR username='industrial'
--   students                   student_number LIKE 'DEMO-%'
--   student_profiles           student_no   LIKE 'DEMO-%'
--   vacancies                  source_reference = 'DEMO-SEED'
--   company                    name IN ('National Water & Sewerage Corporation',
--                                       'Centenary Bank')
--   applications               vacancy is DEMO-SEED OR student is demo/known
--                              (students 1-3 = the three seeded login accounts;
--                               the table held 0 rows on 2026-10-06)
--   placements                 student_number LIKE 'DEMO-%'
--                              (the 3 pre-existing placements are untouched)
--   placement_status_history   placement is a demo placement
--   day_diaries                profile is demo OR student_id IN (1,2,3)
--                              (the 2 pre-existing diaries have student_id=0,
--                               so they are never matched)
--   evaluations                student is demo OR student_id = 1
--                              (the 2 pre-existing evaluations are students
--                               2 and 3, so they are never matched)
--   notifications              type = 'DEMO_SEED'
--
-- Demo logins (after seed):
--   Student            STU-2026-001 / Student@123   (real seeded account)
--   Student            demo.stu01   / Student@123   (any demo.stuNN)
--   Company            airtel       / company123
--   University sup.    university   / university123
--   Industrial sup.    industrial   / industrial123 (created by this script)
--   Admin              admin        / admin123
--   (avoid STU-2026-002: must_change_password=1 forces the change-password flow)
-- ============================================================================

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 0. Markers first — delete everything this script owns, children before parents
-- ---------------------------------------------------------------------------
DELETE FROM notifications                WHERE type = 'DEMO_SEED';
DELETE FROM evaluations                  WHERE student_id = 1
                                           OR student_id IN (SELECT id FROM students WHERE student_number LIKE 'DEMO-%');
DELETE FROM day_diaries                  WHERE student_id IN (1,2,3)
                                           OR student_profile_id IN (SELECT id FROM student_profiles WHERE student_no LIKE 'DEMO-%');
DELETE FROM applications                 WHERE student_id IN (1,2,3)
                                           OR student_id IN (SELECT id FROM students WHERE student_number LIKE 'DEMO-%')
                                           OR vacancy_id IN (SELECT id FROM vacancies WHERE source_reference = 'DEMO-SEED');
DELETE FROM placement_status_history     WHERE placement_id IN (SELECT id FROM placements WHERE student_id IN (SELECT id FROM students WHERE student_number LIKE 'DEMO-%'));
DELETE FROM placements                   WHERE student_id IN (SELECT id FROM students WHERE student_number LIKE 'DEMO-%');
DELETE FROM student_profiles             WHERE student_no LIKE 'DEMO-%';
DELETE FROM students                     WHERE student_number LIKE 'DEMO-%';
DELETE FROM industrial_supervisors       WHERE user_id IN (SELECT id FROM users WHERE username = 'industrial');
DELETE FROM users                        WHERE username LIKE 'demo.%' OR username = 'industrial';
DELETE FROM vacancies                    WHERE source_reference = 'DEMO-SEED';
DELETE FROM company                      WHERE name IN ('National Water & Sewerage Corporation', 'Centenary Bank');

-- ---------------------------------------------------------------------------
-- 1. Companies (2 extra, so vacancy/application lists span several employers)
-- ---------------------------------------------------------------------------
INSERT INTO company (name, industry, size, city, country, description, created_at, updated_at) VALUES
  ('National Water & Sewerage Corporation', 'Utilities', 'Large', 'Kampala', 'Uganda', 'National water utility offering internship slots in IT and field engineering.', '2026-09-20 08:00:00', '2026-09-20 08:00:00'),
  ('Centenary Bank', 'Banking & Finance', 'Large', 'Kampala', 'Uganda', 'Commercial bank with a data and technology internship programme.', '2026-09-25 08:00:00', '2026-09-25 08:00:00');

-- ---------------------------------------------------------------------------
-- 2. Users — the field supervisor persona + 9 demo students
-- ---------------------------------------------------------------------------
SET @student_hash = (SELECT password FROM users WHERE username = 'STU-2026-001');

INSERT INTO users (username, password, role, company_id, university_id, email, must_change_password, enabled, failed_login_attempts, super_admin) VALUES
  ('demo.stu01', @student_hash, 'STUDENT', NULL, NULL, 'demo.stu01@demo.example', 0, b'1', 0, b'0'),
  ('demo.stu02', @student_hash, 'STUDENT', NULL, NULL, 'demo.stu02@demo.example', 0, b'1', 0, b'0'),
  ('demo.stu03', @student_hash, 'STUDENT', NULL, NULL, 'demo.stu03@demo.example', 0, b'1', 0, b'0'),
  ('demo.stu04', @student_hash, 'STUDENT', NULL, NULL, 'demo.stu04@demo.example', 0, b'1', 0, b'0'),
  ('demo.stu05', @student_hash, 'STUDENT', NULL, NULL, 'demo.stu05@demo.example', 0, b'1', 0, b'0'),
  ('demo.stu06', @student_hash, 'STUDENT', NULL, NULL, 'demo.stu06@demo.example', 0, b'1', 0, b'0'),
  ('demo.stu07', @student_hash, 'STUDENT', NULL, NULL, 'demo.stu07@demo.example', 0, b'1', 0, b'0'),
  ('demo.stu08', @student_hash, 'STUDENT', NULL, NULL, 'demo.stu08@demo.example', 0, b'1', 0, b'0'),
  ('demo.stu09', @student_hash, 'STUDENT', NULL, NULL, 'demo.stu09@demo.example', 0, b'1', 0, b'0');

-- The industrial-supervisor persona. Requires add_industrial_supervisor_role.sql
-- to have run (users.role enum must accept INDUSTRIAL_SUPERVISOR).
-- Password hash generated with the app's own BCryptPasswordEncoder(10).
INSERT INTO users (username, password, role, company_id, university_id, email, must_change_password, enabled, failed_login_attempts, super_admin) VALUES
  ('industrial', '$2a$10$Sm87gsSQYtHB4wV0H2B6vuzRaVusXU7G9p8bknnzd0wCK3PavUZ3e', 'INDUSTRIAL_SUPERVISOR', 1, NULL, 'field.supervisor@airtel.co.ug', 0, b'1', 0, b'0');
SET @ind_user = LAST_INSERT_ID();

INSERT INTO industrial_supervisors (company_id, department, first_name, job_title, last_name, phone_number, user_id) VALUES
  (1, 'Network & IT Operations', 'Peter', 'Field Engineering Supervisor', 'Okello', '+256-772-000111', @ind_user);
SET @ind_sup = LAST_INSERT_ID();

-- ---------------------------------------------------------------------------
-- 3. Students + profiles — 6 linked to Airtel (company 1), 3 to MTN (company 2)
--    Academic-unit ids mirror the three real seeded students (school 902 /
--    programme 2019 / department NULL) so the admin tables look consistent.
-- ---------------------------------------------------------------------------
INSERT INTO students (first_name, last_name, student_number, registration_number, degree_program, year_of_study, gender, phone_number, university_id, uni_supervisor_id, ind_supervisor_id, internship_company_id, user_id, academic_year, semester, intake, start_date, end_date, created_at, department_id, programme_id, school_id)
SELECT d.fn, d.ln, d.sn, d.rn, 'BSc Information Technology', d.yo, d.g, d.ph,
       19, 1,
       IF(d.ind = 'Y', @ind_sup, NULL),
       IF(d.ic = 'Y', 1, NULL),
       (SELECT id FROM users WHERE username = d.un),
       '2026/2027', 'Semester 1', 'Sep 2026', '2026-09-01', '2026-12-20', '2026-09-01 08:00:00',
       NULL, 2019, 902
FROM (
  SELECT 'Brian' fn, 'Mugisha' ln, 'DEMO-STU-01' sn, 'DEMO-REG-01' rn, 3 yo, 'Male' g, '+256-772-111001' ph, 'demo.stu01' un, 'Y' ind, 'Y' ic UNION ALL
  SELECT 'Diana', 'Nansubuga', 'DEMO-STU-02', 'DEMO-REG-02', 2, 'Female', '+256-772-111002', 'demo.stu02', 'Y', 'Y' UNION ALL
  SELECT 'Ronald', 'Kizito', 'DEMO-STU-03', 'DEMO-REG-03', 3, 'Male', '+256-772-111003', 'demo.stu03', 'Y', 'Y' UNION ALL
  SELECT 'Prossy', 'Achan', 'DEMO-STU-04', 'DEMO-REG-04', 2, 'Female', '+256-772-111004', 'demo.stu04', 'Y', 'Y' UNION ALL
  SELECT 'Emmanuel', 'Tumusiime', 'DEMO-STU-05', 'DEMO-REG-05', 4, 'Male', '+256-772-111005', 'demo.stu05', 'Y', 'Y' UNION ALL
  SELECT 'Ritah', 'Nakato', 'DEMO-STU-06', 'DEMO-REG-06', 2, 'Female', '+256-772-111006', 'demo.stu06', 'Y', '' UNION ALL
  SELECT 'Joel', 'Okwir', 'DEMO-STU-07', 'DEMO-REG-07', 3, 'Male', '+256-772-111007', 'demo.stu07', '', 'Y' UNION ALL
  SELECT 'Sharon', 'Atim', 'DEMO-STU-08', 'DEMO-REG-08', 2, 'Female', '+256-772-111008', 'demo.stu08', '', 'Y' UNION ALL
  SELECT 'Kevin', 'Aciro', 'DEMO-STU-09', 'DEMO-REG-09', 4, 'Female', '+256-772-111009', 'demo.stu09', '', ''
) d;

INSERT INTO student_profiles (student_name, student_no, reg_no, intake, program, course_name, mobile_no, email, year_of_study, academic_year, semester, organisation, location, academic_supervisor, academic_supervisor_contact, field_supervisor, field_supervisor_contact, start_date, end_date)
SELECT CONCAT(d.fn, ' ', d.ln), d.sn, d.rn, 'Sep 2026', 'BSCCS', 'BSc Information Technology', d.ph,
       CONCAT('demo.stu', d.nn, '@demo.example'), CAST(d.yo AS CHAR), '2026/2027', '1',
       d.org, 'Kampala', 'Ssemaganda Shuraim', '+256-772-123456', d.fs, d.fp,
       '2026-09-01', '2026-12-20'
FROM (
  SELECT '01' nn, 'Brian' fn, 'Mugisha' ln, 'DEMO-STU-01' sn, 'DEMO-REG-01' rn, 3 yo, '+256-772-111001' ph, 'Airtel Uganda' org, 'Peter Okello' fs, '+256-772-000111' fp UNION ALL
  SELECT '02', 'Diana', 'Nansubuga', 'DEMO-STU-02', 'DEMO-REG-02', 2, '+256-772-111002', 'Airtel Uganda', 'Peter Okello', '+256-772-000111' UNION ALL
  SELECT '03', 'Ronald', 'Kizito', 'DEMO-STU-03', 'DEMO-REG-03', 3, '+256-772-111003', 'Airtel Uganda', 'Peter Okello', '+256-772-000111' UNION ALL
  SELECT '04', 'Prossy', 'Achan', 'DEMO-STU-04', 'DEMO-REG-04', 2, '+256-772-111004', 'Airtel Uganda', 'Peter Okello', '+256-772-000111' UNION ALL
  SELECT '05', 'Emmanuel', 'Tumusiime', 'DEMO-STU-05', 'DEMO-REG-05', 4, '+256-772-111005', 'Airtel Uganda', 'Peter Okello', '+256-772-000111' UNION ALL
  SELECT '06', 'Ritah', 'Nakato', 'DEMO-STU-06', 'DEMO-REG-06', 2, '+256-772-111006', 'Airtel Uganda', 'Peter Okello', '+256-772-000111' UNION ALL
  SELECT '07', 'Joel', 'Okwir', 'DEMO-STU-07', 'DEMO-REG-07', 3, '+256-772-111007', 'MTN Uganda', 'Sarah Namirembe', '+256-772-222001' UNION ALL
  SELECT '08', 'Sharon', 'Atim', 'DEMO-STU-08', 'DEMO-REG-08', 2, '+256-772-111008', 'MTN Uganda', 'Sarah Namirembe', '+256-772-222001' UNION ALL
  SELECT '09', 'Kevin', 'Aciro', 'DEMO-STU-09', 'DEMO-REG-09', 4, '+256-772-111009', 'MTN Uganda', 'Sarah Namirembe', '+256-772-222001'
) d;

-- ---------------------------------------------------------------------------
-- 4. Vacancies — 12 new (7 Airtel, 3 MTN, 1 NWSC, 1 Centenary); 10 OPEN with
--    future deadlines, 2 CLOSED with past deadlines. Feature-branch columns
--    (origin/work_mode/verification_status/...) are set explicitly so the
--    dataset is also sane if the demo later switches to branch fred.
--    Marker: source_reference = 'DEMO-SEED'.
-- ---------------------------------------------------------------------------
INSERT INTO vacancies (
  company_id, title, description, location, city, country, requirements, status,
  created_at, deadline, start_date, end_date, duration_weeks, slots,
  is_paid, stipend_amount, stipend_currency, stipend_period,
  work_mode, origin, source_kind, verification_status, published_at, verified_at, verified_by,
  contact_person_name, contact_email, contact_phone, contact_role, application_email,
  benefits, responsibilities, required_skills, tools_technologies, min_cgpa,
  safety_orientation_required, source_reference)
VALUES
  (1, 'Software QA Intern',
   'Test and quality-assure Airtel Uganda digital products: write test cases, run regression suites and log defects with the platform team.',
   'Airtel House, Nakasero', 'Kampala', 'Uganda',
   'Currently enrolled in a Computer Science, IT or Software Engineering programme; attention to detail; familiarity with test automation is a plus.',
   'OPEN', '2026-09-10', '2026-11-15', '2026-11-25', '2027-02-17', 12, 3,
   b'1', 800000, 'UGX', 'MONTH', 'ONSITE', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-09-10 09:00:00', '2026-09-10 15:00:00', 6,
   'Grace Nabatanzi', 'hr@airtel.co.ug', '+256-31-2300000', 'HR Business Partner', 'internships@airtel.co.ug',
   'Monthly stipend; mentorship; exposure to production telecom systems.',
   'Design test cases; execute manual and automated regression tests; report and track defects.',
   'QA basics; test case writing; JIRA', 'JIRA, Postman, Selenium', 3.0, b'0', 'DEMO-SEED'),

  (1, 'Data Analytics Intern',
   'Join the Airtel commercial analytics team to build dashboards, clean usage datasets and support weekly performance reporting.',
   'Airtel House, Nakasero', 'Kampala', 'Uganda',
   'Enrolled in Computer Science, Statistics or a related programme; solid SQL and spreadsheet skills.',
   'OPEN', '2026-09-15', '2026-11-20', '2026-11-30', '2027-02-22', 12, 2,
   b'1', 900000, 'UGX', 'MONTH', 'HYBRID', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-09-15 09:00:00', '2026-09-15 15:00:00', 6,
   'Grace Nabatanzi', 'hr@airtel.co.ug', '+256-31-2300000', 'HR Business Partner', 'internships@airtel.co.ug',
   'Monthly stipend; hybrid days; Power BI training.',
   'Clean and join datasets; build Power BI dashboards; present weekly insights.',
   'SQL; data cleaning; basic statistics', 'Power BI, SQL, Excel', 3.0, b'0', 'DEMO-SEED'),

  (1, 'Cybersecurity Intern',
   'Support the Airtel security operations centre: monitor alerts, harden configurations and document incident response runbooks.',
   'Airtel House, Nakasero', 'Kampala', 'Uganda',
   'Enrolled in IT, Computer Science or Cybersecurity; basic networking knowledge; willingness to sign an NDA.',
   'OPEN', '2026-09-20', '2026-11-25', '2026-12-01', '2027-02-23', 12, 2,
   b'1', 850000, 'UGX', 'MONTH', 'ONSITE', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-09-20 09:00:00', '2026-09-20 15:00:00', 6,
   'Grace Nabatanzi', 'hr@airtel.co.ug', '+256-31-2300000', 'HR Business Partner', 'internships@airtel.co.ug',
   'Monthly stipend; SOC mentorship; certification study support.',
   'Triage SOC alerts; update runbooks; run vulnerability scans.',
   'Networking; Linux basics; SIEM awareness', 'Wireshark, Nessus, SIEM', 3.2, b'1', 'DEMO-SEED'),

  (1, 'Customer Experience Intern',
   'Help the Airtel customer care team analyse contact-centre trends and improve self-service journeys.',
   'Airtel House, Nakasero', 'Kampala', 'Uganda',
   'Enrolled in any degree programme; excellent communication; empathy for customer problems.',
   'OPEN', '2026-09-25', '2026-11-30', '2026-12-10', '2027-03-04', 12, 4,
   b'1', 600000, 'UGX', 'MONTH', 'ONSITE', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-09-25 09:00:00', '2026-09-25 15:00:00', 6,
   'Grace Nabatanzi', 'hr@airtel.co.ug', '+256-31-2300000', 'HR Business Partner', 'internships@airtel.co.ug',
   'Monthly stipend; customer-journey training.',
   'Review call transcripts; tag complaint themes; propose self-service fixes.',
   'Communication; Excel; basic survey analysis', 'Excel, Zendesk', 2.8, b'0', 'DEMO-SEED'),

  (1, 'DevOps Engineering Intern',
   'Work with the platform team on CI/CD pipelines, containerised services and cloud monitoring for Airtel digital channels.',
   'Remote (Uganda)', 'Kampala', 'Uganda',
   'Enrolled in Computer Science or IT; familiarity with Linux and Git; curiosity about automation.',
   'OPEN', '2026-10-01', '2026-12-05', '2026-12-15', '2027-03-09', 12, 2,
   b'1', 950000, 'UGX', 'MONTH', 'REMOTE', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-10-01 09:00:00', '2026-10-01 15:00:00', 6,
   'Grace Nabatanzi', 'hr@airtel.co.ug', '+256-31-2300000', 'HR Business Partner', 'internships@airtel.co.ug',
   'Monthly stipend; fully remote; cloud certification budget.',
   'Maintain CI pipelines; containerise services; set up dashboards and alerts.',
   'Linux; Git; Docker basics', 'Docker, GitHub Actions, Grafana', 3.2, b'0', 'DEMO-SEED'),

  (1, 'Digital Marketing Intern',
   'Support Airtel Uganda social and digital campaigns: schedule posts, track engagement and prepare weekly reports. (Closed — demo of a filled role.)',
   'Airtel House, Nakasero', 'Kampala', 'Uganda',
   'Enrolled in Marketing, Business or a related programme; active on social media platforms.',
   'CLOSED', '2026-08-20', '2026-09-30', '2026-10-05', '2026-12-28', 12, 2,
   b'1', 500000, 'UGX', 'MONTH', 'ONSITE', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-08-20 09:00:00', '2026-08-20 15:00:00', 6,
   'Grace Nabatanzi', 'hr@airtel.co.ug', '+256-31-2300000', 'HR Business Partner', 'internships@airtel.co.ug',
   'Monthly stipend; portfolio-building campaigns.',
   'Schedule content; track engagement; compile weekly reports.',
   'Copywriting; social media analytics', 'Meta Business Suite, Canva', 2.8, b'0', 'DEMO-SEED'),

  (1, 'HR & Talent Intern',
   'Support recruitment coordination, onboarding paperwork and engagement surveys across Airtel Uganda.',
   'Airtel House, Nakasero', 'Kampala', 'Uganda',
   'Enrolled in Human Resources, Business or Psychology; organised and discreet with people data.',
   'OPEN', '2026-10-03', '2026-12-10', '2026-12-15', '2027-03-09', 12, 1,
   b'1', 550000, 'UGX', 'MONTH', 'HYBRID', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-10-03 09:00:00', '2026-10-03 15:00:00', 6,
   'Grace Nabatanzi', 'hr@airtel.co.ug', '+256-31-2300000', 'HR Business Partner', 'internships@airtel.co.ug',
   'Monthly stipend; exposure to the full recruitment cycle.',
   'Schedule interviews; prepare onboarding packs; analyse engagement survey results.',
   'Communication; Excel; confidentiality', 'Excel, BambooHR', 3.0, b'0', 'DEMO-SEED'),

  (2, 'Mobile Money Risk Intern',
   'Join the MTN MoMo risk team to investigate transaction anomalies and improve fraud rules.',
   'MTN Towers, Nakasero', 'Kampala', 'Uganda',
   'Enrolled in IT, Finance or Statistics; analytical mindset; comfortable with SQL.',
   'OPEN', '2026-09-12', '2026-11-18', '2026-11-30', '2027-02-22', 12, 2,
   b'1', 850000, 'UGX', 'MONTH', 'ONSITE', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-09-12 09:00:00', '2026-09-12 15:00:00', 6,
   'Talent Acquisition', 'careers@mtn.co.ug', '+256-31-2100000', 'Talent Acquisition', 'internships@mtn.co.ug',
   'Monthly stipend; fraud-analytics mentoring.',
   'Investigate anomaly alerts; tune fraud rules; document case outcomes.',
   'SQL; anomaly reasoning; Excel', 'SQL, Tableau', 3.0, b'0', 'DEMO-SEED'),

  (2, 'Network Engineering Intern',
   'Assist MTN network engineers with capacity planning, drive-test analysis and 4G/5G performance reports.',
   'MTN Towers, Nakasero', 'Kampala', 'Uganda',
   'Enrolled in Telecommunications or Electrical Engineering; basic IP networking knowledge.',
   'OPEN', '2026-09-18', '2026-11-22', '2026-12-01', '2027-02-23', 12, 3,
   b'1', 800000, 'UGX', 'MONTH', 'ONSITE', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-09-18 09:00:00', '2026-09-18 15:00:00', 6,
   'Talent Acquisition', 'careers@mtn.co.ug', '+256-31-2100000', 'Talent Acquisition', 'internships@mtn.co.ug',
   'Monthly stipend; field-drive exposure.',
   'Analyse drive-test data; track KPI dashboards; assist site audits.',
   'IP networking; KPI analysis; MATLAB', 'Excel, Nemo', 3.0, b'1', 'DEMO-SEED'),

  (2, 'Software Engineering Intern',
   'Build features for MTN customer self-service apps alongside an agile squad. (Closed — filled for this cycle.)',
   'MTN Towers, Nakasero', 'Kampala', 'Uganda',
   'Enrolled in Computer Science or Software Engineering; at least one programming language to a project level.',
   'CLOSED', '2026-08-15', '2026-09-25', '2026-10-01', '2026-12-24', 12, 2,
   b'1', 900000, 'UGX', 'MONTH', 'HYBRID', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-08-15 09:00:00', '2026-08-15 15:00:00', 6,
   'Talent Acquisition', 'careers@mtn.co.ug', '+256-31-2100000', 'Talent Acquisition', 'internships@mtn.co.ug',
   'Monthly stipend; paired programming; code reviews.',
   'Ship small features; write tests; join sprint ceremonies.',
   'Java or JavaScript; Git; REST basics', 'IntelliJ, Git, Jira', 3.2, b'0', 'DEMO-SEED'),

  (3, 'IT Support Intern',
   'Provide first-line support, asset tracking and network troubleshooting at NWSC head office.',
   'NWSC Head Office, Makindi', 'Kampala', 'Uganda',
   'Enrolled in IT or Computing; good troubleshooting attitude; customer-friendly.',
   'OPEN', '2026-09-28', '2026-12-01', '2026-12-10', '2027-03-04', 12, 2,
   b'1', 500000, 'UGX', 'MONTH', 'ONSITE', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-09-28 09:00:00', '2026-09-28 15:00:00', 6,
   'Human Resource', 'hr@nwsc.co.ug', '+256-41-270000', 'HR Officer', 'internships@nwsc.co.ug',
   'Monthly stipend; hands-on infrastructure exposure.',
   'Resolve ticket queue; image laptops; maintain the asset register.',
   'Windows/Linux support; networking basics', 'Active Directory, Wireshark', 2.8, b'0', 'DEMO-SEED'),

  (4, 'Data Engineering Intern',
   'Help Centenary Bank migrate reporting pipelines to the cloud and automate data-quality checks.',
   'Centenary Bank House, Kampala Road', 'Kampala', 'Uganda',
   'Enrolled in Computer Science, Statistics or equivalent; SQL proficiency; exposure to Python.',
   'OPEN', '2026-10-02', '2026-12-15', '2027-01-05', '2027-03-30', 12, 2,
   b'1', 900000, 'UGX', 'MONTH', 'HYBRID', 'COMPANY', 'COMPANY_DIRECT', 'VERIFIED', '2026-10-02 09:00:00', '2026-10-02 15:00:00', 6,
   'Graduate Programme', 'graduates@centenarybank.co.ug', '+256-31-2100100', 'Graduate Recruitment', 'internships@centenarybank.co.ug',
   'Monthly stipend; cloud training; banking-domain exposure.',
   'Build ETL jobs; add data-quality checks; document pipelines.',
   'SQL; Python; data modelling', 'Python, Airflow, Azure', 3.2, b'0', 'DEMO-SEED');

-- ---------------------------------------------------------------------------
-- 5. Applications — 40 rows across all 12 students and 15 vacancies.
--    Status spread: 12 ACCEPTED, 9 REJECTED, 7 SUBMITTED, 6 REVIEWING,
--                   4 SHORTLISTED, 2 WITHDRAWN.
--    Stories: real students + demo.stu01..05 + stu07/08 are ACCEPTED where
--    they hold placements; stu06 is ACCEPTED but only OFFERED a placement
--    (the university-assignment step the demo can perform live); stu09 is
--    ACCEPTED with a PENDING match. Dates run 2026-08-05 .. 2026-10-05.
-- ---------------------------------------------------------------------------
INSERT INTO applications (company_id, created_at, status, student_id, vacancy_id)
SELECT v.company_id, t.ts, t.st, s.id, v.id
FROM (
  SELECT '2400101003' AS sn, 'Software Development Intern' AS vt, 'ACCEPTED' AS st, '2026-08-05 09:15:00' AS ts UNION ALL
  SELECT '2400101003', 'Data Analytics Intern', 'REVIEWING', '2026-09-21 10:00:00' UNION ALL
  SELECT '2400101003', 'Network Operations Intern', 'REJECTED', '2026-08-12 11:30:00' UNION ALL
  SELECT 'STU-2026-001', 'Network Operations Intern', 'ACCEPTED', '2026-08-06 09:20:00' UNION ALL
  SELECT 'STU-2026-001', 'Mobile Money Operations Intern', 'SHORTLISTED', '2026-09-25 14:05:00' UNION ALL
  SELECT 'STU-2026-001', 'Software QA Intern', 'SUBMITTED', '2026-10-02 08:45:00' UNION ALL
  SELECT 'STU-2026-002', 'Software Development Intern', 'ACCEPTED', '2026-08-07 09:25:00' UNION ALL
  SELECT 'STU-2026-002', 'Customer Experience Intern', 'REVIEWING', '2026-10-01 16:10:00' UNION ALL
  SELECT 'STU-2026-002', 'Digital Marketing Intern', 'REJECTED', '2026-08-25 12:00:00' UNION ALL
  SELECT 'DEMO-STU-01', 'Software Development Intern', 'ACCEPTED', '2026-08-08 09:30:00' UNION ALL
  SELECT 'DEMO-STU-01', 'Data Analytics Intern', 'SHORTLISTED', '2026-09-22 10:40:00' UNION ALL
  SELECT 'DEMO-STU-01', 'Mobile Money Operations Intern', 'REJECTED', '2026-08-30 13:20:00' UNION ALL
  SELECT 'DEMO-STU-01', 'Cybersecurity Intern', 'SUBMITTED', '2026-10-04 09:05:00' UNION ALL
  SELECT 'DEMO-STU-02', 'Network Operations Intern', 'ACCEPTED', '2026-08-09 09:35:00' UNION ALL
  SELECT 'DEMO-STU-02', 'Customer Experience Intern', 'REVIEWING', '2026-10-01 16:25:00' UNION ALL
  SELECT 'DEMO-STU-02', 'Software QA Intern', 'SHORTLISTED', '2026-09-23 11:15:00' UNION ALL
  SELECT 'DEMO-STU-02', 'Mobile Money Operations Intern', 'REJECTED', '2026-09-03 10:10:00' UNION ALL
  SELECT 'DEMO-STU-03', 'Software Development Intern', 'ACCEPTED', '2026-08-10 09:40:00' UNION ALL
  SELECT 'DEMO-STU-03', 'DevOps Engineering Intern', 'SUBMITTED', '2026-10-05 08:30:00' UNION ALL
  SELECT 'DEMO-STU-03', 'Mobile Money Operations Intern', 'WITHDRAWN', '2026-09-05 15:00:00' UNION ALL
  SELECT 'DEMO-STU-04', 'Customer Experience Intern', 'ACCEPTED', '2026-08-11 09:45:00' UNION ALL
  SELECT 'DEMO-STU-04', 'Digital Marketing Intern', 'REJECTED', '2026-08-28 14:30:00' UNION ALL
  SELECT 'DEMO-STU-04', 'HR & Talent Intern', 'REVIEWING', '2026-10-03 10:50:00' UNION ALL
  SELECT 'DEMO-STU-05', 'Data Analytics Intern', 'ACCEPTED', '2026-08-13 09:50:00' UNION ALL
  SELECT 'DEMO-STU-05', 'Software QA Intern', 'REVIEWING', '2026-09-24 12:40:00' UNION ALL
  SELECT 'DEMO-STU-05', 'IT Support Intern', 'SUBMITTED', '2026-10-04 11:25:00' UNION ALL
  SELECT 'DEMO-STU-06', 'HR & Talent Intern', 'REJECTED', '2026-09-28 13:55:00' UNION ALL
  SELECT 'DEMO-STU-06', 'Software Development Intern', 'ACCEPTED', '2026-09-29 09:10:00' UNION ALL
  SELECT 'DEMO-STU-06', 'Network Operations Intern', 'SUBMITTED', '2026-10-05 10:35:00' UNION ALL
  SELECT 'DEMO-STU-06', 'Digital Marketing Intern', 'REJECTED', '2026-09-01 14:15:00' UNION ALL
  SELECT 'DEMO-STU-07', 'Mobile Money Operations Intern', 'ACCEPTED', '2026-08-14 09:55:00' UNION ALL
  SELECT 'DEMO-STU-07', 'Network Engineering Intern', 'SHORTLISTED', '2026-09-26 11:45:00' UNION ALL
  SELECT 'DEMO-STU-07', 'Data Engineering Intern', 'SUBMITTED', '2026-10-03 09:40:00' UNION ALL
  SELECT 'DEMO-STU-08', 'Network Engineering Intern', 'ACCEPTED', '2026-08-16 10:05:00' UNION ALL
  SELECT 'DEMO-STU-08', 'Mobile Money Operations Intern', 'REJECTED', '2026-09-02 15:30:00' UNION ALL
  SELECT 'DEMO-STU-08', 'Software Engineering Intern', 'REJECTED', '2026-08-20 16:45:00' UNION ALL
  SELECT 'DEMO-STU-08', 'Software QA Intern', 'REVIEWING', '2026-10-02 13:10:00' UNION ALL
  SELECT 'DEMO-STU-09', 'Software Engineering Intern', 'WITHDRAWN', '2026-08-18 10:20:00' UNION ALL
  SELECT 'DEMO-STU-09', 'Data Engineering Intern', 'ACCEPTED', '2026-09-27 12:15:00' UNION ALL
  SELECT 'DEMO-STU-09', 'IT Support Intern', 'SUBMITTED', '2026-10-05 14:50:00'
) t
JOIN students   s ON s.student_number  = t.sn
JOIN vacancies  v ON v.title           = t.vt;

-- ---------------------------------------------------------------------------
-- 6. Placements — 9 demo rows: 5 ACTIVE (Airtel), 2 ASSIGNED, 1 OFFERED
--    (awaiting university assignment — demoable live), 1 PENDING (fresh match).
--    Plus placement_status_history so the timeline view has entries.
-- ---------------------------------------------------------------------------
INSERT INTO placements (student_id, company_id, university_supervisor, company_supervisor, status,
                        company_supervisor_id, university_supervisor_id, university_id,
                        assigned_at, completed_at, created_at, offered_at, started_at)
SELECT s.id, c.id, t.us, t.cs, t.st,
       IF(t.ind = 'Y', @ind_sup, NULL),
       IF(t.usi = 'Y', 1, NULL),
       19,
       NULLIF(t.assigned, ''), NULLIF(t.completed, ''), t.created, NULLIF(t.offered, ''), NULLIF(t.started, '')
FROM (
  SELECT 'DEMO-STU-01' AS sn, 'Airtel Uganda' AS co, 'ACTIVE' AS st, 'Y' AS ind, 'Y' AS usi,
         'David Ssemakula' AS us, 'Peter Okello' AS cs,
         '2026-08-15 09:00:00' AS created, '2026-08-15 09:00:00' AS offered, '2026-08-20 10:00:00' AS assigned, '2026-09-01 08:00:00' AS started, '' AS completed UNION ALL
  SELECT 'DEMO-STU-02', 'Airtel Uganda', 'ACTIVE', 'Y', 'Y', 'David Ssemakula', 'Peter Okello',
         '2026-08-16 09:00:00', '2026-08-16 09:00:00', '2026-08-21 10:00:00', '2026-09-01 08:00:00', '' UNION ALL
  SELECT 'DEMO-STU-03', 'Airtel Uganda', 'ASSIGNED', 'Y', 'Y', 'David Ssemakula', 'Peter Okello',
         '2026-09-15 09:00:00', '2026-09-15 09:00:00', '2026-09-20 10:00:00', '', '' UNION ALL
  SELECT 'DEMO-STU-04', 'Airtel Uganda', 'ACTIVE', 'Y', 'Y', 'David Ssemakula', 'Peter Okello',
         '2026-08-17 09:00:00', '2026-08-17 09:00:00', '2026-08-22 10:00:00', '2026-09-01 08:00:00', '' UNION ALL
  SELECT 'DEMO-STU-05', 'Airtel Uganda', 'ACTIVE', 'Y', 'Y', 'David Ssemakula', 'Peter Okello',
         '2026-08-18 09:00:00', '2026-08-18 09:00:00', '2026-08-23 10:00:00', '2026-09-01 08:00:00', '' UNION ALL
  SELECT 'DEMO-STU-06', 'Airtel Uganda', 'OFFERED', 'Y', '', 'David Ssemakula', 'Peter Okello',
         '2026-10-03 09:00:00', '2026-10-03 09:00:00', '', '', '' UNION ALL
  SELECT 'DEMO-STU-07', 'MTN Uganda', 'ACTIVE', '', 'Y', 'David Ssemakula', 'Sarah Namirembe',
         '2026-08-16 09:30:00', '2026-08-16 09:30:00', '2026-08-22 10:30:00', '2026-09-01 08:00:00', '' UNION ALL
  SELECT 'DEMO-STU-08', 'MTN Uganda', 'ASSIGNED', '', 'Y', 'David Ssemakula', 'Sarah Namirembe',
         '2026-09-16 09:30:00', '2026-09-16 09:30:00', '2026-09-21 10:30:00', '', '' UNION ALL
  SELECT 'DEMO-STU-09', 'Centenary Bank', 'PENDING', '', '', 'David Ssemakula', 'Centenary IT Team',
         '2026-10-04 09:00:00', '', '', '', ''
) t
JOIN students s ON s.student_number = t.sn
JOIN company  c ON c.name           = t.co;

-- Timeline history, derived from the demo placements themselves.
INSERT INTO placement_status_history (placement_id, from_status, to_status, changed_at, changed_by)
SELECT p.id, NULL, 'PENDING', COALESCE(p.created_at, '2026-10-06 08:00:00'), 'system'
FROM placements p
WHERE p.student_id IN (SELECT id FROM students WHERE student_number LIKE 'DEMO-%');

INSERT INTO placement_status_history (placement_id, from_status, to_status, changed_at, changed_by)
SELECT p.id, 'PENDING', 'OFFERED', p.offered_at, 'airtel'
FROM placements p
WHERE p.offered_at IS NOT NULL
  AND p.student_id IN (SELECT id FROM students WHERE student_number LIKE 'DEMO-%');

INSERT INTO placement_status_history (placement_id, from_status, to_status, changed_at, changed_by)
SELECT p.id, 'OFFERED', 'ASSIGNED', p.assigned_at, 'university'
FROM placements p
WHERE p.assigned_at IS NOT NULL
  AND p.student_id IN (SELECT id FROM students WHERE student_number LIKE 'DEMO-%');

INSERT INTO placement_status_history (placement_id, from_status, to_status, changed_at, changed_by)
SELECT p.id, 'ASSIGNED', 'ACTIVE', p.started_at, 'university'
FROM placements p
WHERE p.started_at IS NOT NULL
  AND p.student_id IN (SELECT id FROM students WHERE student_number LIKE 'DEMO-%');

-- ---------------------------------------------------------------------------
-- 7. Day diaries — 29 rows across the 8 interns who are actually on site
--    (real students 1-3 + demo ACTIVE interns). Statuses: 16 APPROVED,
--    10 PENDING, 2 NEEDS_REVISION, 1 REJECTED. Weekday entries Sep 7 – Oct 6.
-- ---------------------------------------------------------------------------
INSERT INTO day_diaries (date, daily_activities, knowledge_and_skills_gained, accomplishments, status,
                         supervisor_feedback, technology_tools, university_supervisor_comment,
                         industrial_supervisor_comment, student_profile_id, student_id, university_id)
SELECT t.dt, t.acts, t.know, t.acc, t.st, NULLIF(t.fb, ''), t.tt, NULLIF(t.uc, ''), NULLIF(t.ic, ''),
       p.id, s.id, 19
FROM (
  SELECT '2400101003' AS sn, '2026-09-08' AS dt, 'Triaged support tickets and shadowed a network maintenance window.' AS acts, 'Ticket triage workflow; basic router CLI' AS know, 'Closed 12 first-line tickets' AS acc, 'APPROVED' AS st, 'Solid first week — keep logging ticket IDs.' AS fb, 'Wireshark, JIRA' AS tt, 'Good progress.' AS uc, 'Clear logs, keep it up.' AS ic UNION ALL
  SELECT '2400101003', '2026-09-15', 'Built a PowerShell script to inventory desk assets and updated the asset register.', 'PowerShell; asset management', 'Automated weekly asset report', 'APPROVED', 'Nice automation — share it with the team.', 'PowerShell, Excel', 'Approved.', 'Well done.' UNION ALL
  SELECT '2400101003', '2026-10-01', 'Drafted the October helpdesk summary and started a knowledge-base article.', 'Report writing; KB authoring', 'Draft summary delivered to supervisor', 'PENDING', '', 'Confluence, Excel', '', '' UNION ALL
  SELECT 'STU-2026-001', '2026-09-09', 'Reviewed network monitoring dashboards and recorded KPI thresholds.', 'KPI monitoring; dashboards', 'Documented 8 KPI thresholds', 'APPROVED', 'Accurate observations, well structured.', 'Grafana', 'Good KPI notes.', 'Keep correlating thresholds with incidents.' UNION ALL
  SELECT 'STU-2026-001', '2026-09-16', 'Assisted with a site audit at a base station in Wakiso.', 'Site audit checklist; field etiquette', 'Completed audit checklist for 3 sites', 'APPROVED', 'Field notes were thorough.', 'Drive-test app, Excel', 'Audit done well.', 'Approved.' UNION ALL
  SELECT 'STU-2026-001', '2026-09-23', 'Attempted the weekly KPI report without the template and lost two columns of data.', 'Lesson: always use versioned templates', 'Rebuilt the damaged report', 'NEEDS_REVISION', 'Please redo this entry with the exact KPI table attached.', 'Excel', 'Revision requested.', '' UNION ALL
  SELECT 'STU-2026-001', '2026-10-02', 'Paired with a developer on a self-service app bug fix; wrote a failing test first.', 'Test-driven debugging', 'Reproduced the login defect', 'PENDING', '', 'IntelliJ, Git', '', '' UNION ALL
  SELECT 'STU-2026-002', '2026-09-10', 'Updated customer complaint tags in the CRM and analysed the week`s top themes.', 'CRM navigation; theme analysis', 'Tagged 80 complaints', 'APPROVED', 'Themes were clear and actionable.', 'Zendesk, Excel', 'Good analysis.', 'Approved.' UNION ALL
  SELECT 'STU-2026-002', '2026-09-17', 'Sat in on the customer-experience weekly review and took minutes.', 'Meeting facilitation', 'Published review minutes same day', 'PENDING', '', 'Teams, Word', '', '' UNION ALL
  SELECT 'STU-2026-002', '2026-10-05', 'Drafted three self-service help-centre articles based on complaint themes.', 'Technical writing', '3 draft articles ready for review', 'PENDING', '', 'Confluence', '', '' UNION ALL
  SELECT 'DEMO-STU-01', '2026-09-07', 'Wrote and executed test cases for the mobile money USSD menu.', 'Test case design; USSD flows', 'Logged 15 defects with repro steps', 'APPROVED', 'Excellent repro steps.', 'JIRA, Postman', 'Thorough testing.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-01', '2026-09-14', 'Automated a regression suite for the billing portal with Selenium.', 'Test automation; locators', 'Suite of 12 tests running nightly', 'APPROVED', 'Great first automation contribution.', 'Selenium, JIRA', 'Keep it up.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-01', '2026-09-21', 'Ran regression for the app release candidate and verified fixes.', 'Regression discipline', 'Verified 9 fixes', 'APPROVED', 'Release verification was complete.', 'JIRA', 'Good.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-01', '2026-10-06', 'Started exploring performance testing for the USSD gateway.', 'Performance testing basics', 'Set up first load-test scenario', 'PENDING', '', 'JMeter', '', '' UNION ALL
  SELECT 'DEMO-STU-02', '2026-09-08', 'Cleaned the weekly usage extract and resolved three schema mismatches.', 'SQL data cleaning', 'Usage extract ready a day early', 'APPROVED', 'Fast, accurate work.', 'SQL, Excel', 'Good SQL.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-02', '2026-09-15', 'Built the first cut of the churn dashboard for the commercial team.', 'Dashboard design', 'Draft dashboard shared', 'APPROVED', 'Clear visuals; add the data dictionary.', 'Power BI', 'Nice dashboard.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-02', '2026-09-29', 'Investigated a discrepancy between two reporting sources.', 'Root-cause analysis', 'Found the timezone bug in the ETL', 'PENDING', '', 'SQL', '', '' UNION ALL
  SELECT 'DEMO-STU-02', '2026-10-06', 'Prepared the monthly prepaid revenue pack slice for review.', 'Report packaging', 'Slice delivered for review', 'PENDING', '', 'Power BI, Excel', '', '' UNION ALL
  SELECT 'DEMO-STU-04', '2026-09-09', 'Logged calls without timestamps — entry needs restructuring.', 'Lesson: log evidence with entries', 'Re-entered the day`s log', 'NEEDS_REVISION', 'Add timestamps and the call IDs you referenced.', 'Excel', '', '' UNION ALL
  SELECT 'DEMO-STU-04', '2026-09-16', 'Answered Tier-1 calls and resolved billing queries at first contact.', 'Customer handling; billing systems', 'Resolved 20 queries at first contact', 'APPROVED', 'Confident handling of customers.', 'Zendesk', 'Great phone manner.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-04', '2026-09-30', 'Tagged the week`s escalations and proposed two FAQ additions.', 'Escalation analysis', '2 FAQs added to the help centre', 'APPROVED', 'FAQ suggestions were adopted.', 'Zendesk, Confluence', 'Good initiative.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-04', '2026-10-06', 'Shadowed the contact-centre shift supervisor during peak hours.', 'Shift planning', 'Observed peak-hour staffing model', 'PENDING', '', 'Excel', '', '' UNION ALL
  SELECT 'DEMO-STU-05', '2026-09-11', 'Documented five recurring complaint themes with root causes.', 'Root-cause documentation', 'Theme report delivered', 'APPROVED', 'Well evidenced.', 'Excel', 'Clear write-up.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-05', '2026-09-18', 'Designed and piloted a 6-question satisfaction survey.', 'Survey design', '60 responses collected', 'APPROVED', 'Question wording was neutral — good.', 'Forms, Excel', 'Nice survey.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-05', '2026-10-05', 'Segmented survey responses by region and channel.', 'Segmentation analysis', 'Draft segmentation table ready', 'PENDING', '', 'Excel', '', '' UNION ALL
  SELECT 'DEMO-STU-07', '2026-09-10', 'Reviewed fraud alert queue and wrote case summaries for five alerts.', 'Fraud triage; case writing', '5 cases documented', 'APPROVED', 'Case summaries were precise.', 'SQL, Excel', 'Good detective work.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-07', '2026-09-17', 'Wrote SQL to extract high-velocity transaction patterns.', 'SQL analytics', 'Pattern query delivered to risk team', 'APPROVED', 'Query logic was sound.', 'SQL', 'Strong SQL.', 'Approved.' UNION ALL
  SELECT 'DEMO-STU-07', '2026-09-24', 'Submitted an alert write-up with conclusions contradicting the source data.', 'Lesson: verify source data first', 'Rebuilt the analysis from raw extract', 'REJECTED', 'Conclusions did not follow from the data — redo with the raw extract.', 'SQL', '', '' UNION ALL
  SELECT 'DEMO-STU-07', '2026-10-05', 'Tested a candidate fraud rule against last month`s transactions.', 'Rule back-testing', 'Back-test results table produced', 'PENDING', '', 'SQL, Tableau', '', ''
) t
JOIN students        s ON s.student_number  = t.sn
JOIN student_profiles p ON p.student_no     = t.sn;

-- ---------------------------------------------------------------------------
-- 8. Evaluations — 6 new (2 pre-existing stay): scores 7-10 so the admin
--    score charts have spread; supervisor_user_id points at the industrial
--    account for the Airtel ones so "evaluated by me" lights up in his
--    dashboard.
-- ---------------------------------------------------------------------------
INSERT INTO evaluations (student_id, placement_id, supervisor_type, supervisor_username, supervisor_user_id,
                         punctuality, practical_work_ethics, attendance, workplace_performance,
                         logbook_quality, academic_report, presentation, overall_grade, university_id)
SELECT s.id, NULL, 'COMPANY', t.un, u.id,
       t.p, t.e, t.a, t.w, t.lq, t.ar, t.pr, t.g, 19
FROM (
  SELECT '2400101003' AS sn, 'industrial' AS un, 8 AS p, 8 AS e, 9 AS a, 8 AS w, 8 AS lq, 8 AS ar, 8 AS pr, 8 AS g UNION ALL
  SELECT 'DEMO-STU-01', 'industrial', 9, 8, 9, 9, 8, 9, 9, 9 UNION ALL
  SELECT 'DEMO-STU-02', 'industrial', 8, 7, 8, 8, 7, 8, 8, 8 UNION ALL
  SELECT 'DEMO-STU-04', 'industrial', 7, 7, 8, 7, 7, 7, 7, 7 UNION ALL
  SELECT 'DEMO-STU-05', 'industrial', 9, 9, 9, 9, 8, 9, 9, 9 UNION ALL
  SELECT 'DEMO-STU-07', 'sarah.namirembe@mtn.co.ug', 8, 8, 7, 8, 8, 8, 8, 8
) t
JOIN students s ON s.student_number = t.sn
LEFT JOIN users u ON u.username = t.un;

-- ---------------------------------------------------------------------------
-- 9. Notifications — 10, marker type='DEMO_SEED', fixed created_at so the
--    delete phase finds them. Real route links (Header navigates to `link`).
-- ---------------------------------------------------------------------------
INSERT INTO notifications (recipient_user_id, title, body, link, type, read_flag, created_at)
SELECT (SELECT id FROM users WHERE username = t.un), t.title, t.body, t.link, 'DEMO_SEED', t.rd, '2026-10-06 08:00:00'
FROM (
  SELECT 'admin' AS un, 'Placement pipeline update' AS title, '12 placements are in flight across 4 companies — 1 offer awaits university assignment.' AS body, '/admin/dashboard' AS link, b'0' AS rd UNION ALL
  SELECT 'university', 'Diaries awaiting review', '10 diaries are pending your review this week.', '/university/dashboard', b'0' UNION ALL
  SELECT 'university', 'Placement offer needs assignment', 'Ritah Nakato has been offered an Airtel placement — assign a supervisor.', '/university/dashboard', b'0' UNION ALL
  SELECT 'airtel', 'New applications received', 'Seven applications are waiting for your review.', '/company/dashboard', b'0' UNION ALL
  SELECT 'airtel', 'Intern diary submitted', 'Brian Mugisha filed today`s diary.', '/company/dashboard', b'1' UNION ALL
  SELECT 'industrial', 'New diary submitted by Brian Mugisha', 'Diary for 2026-10-06 is ready for your feedback.', '/industrial/dashboard', b'0' UNION ALL
  SELECT 'demo.stu01', 'Application accepted', 'Airtel Uganda accepted your Software Development Intern application.', '/student/dashboard', b'1' UNION ALL
  SELECT 'demo.stu02', 'Diary approved', 'Your diary for 2026-09-15 was approved by your supervisor.', '/student/dashboard', b'1' UNION ALL
  SELECT 'demo.stu06', 'Application update', 'Your application for Software Development Intern has moved to offer stage.', '/student/dashboard', b'0' UNION ALL
  SELECT 'STU-2026-001', 'Application under review', 'MTN Uganda is reviewing your Mobile Money Operations Intern application.', '/student/dashboard', b'0'
) t;

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-run sanity (informational)
-- ---------------------------------------------------------------------------
SELECT 'users' AS tbl, COUNT(*) AS n FROM users
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'vacancies', COUNT(*) FROM vacancies
UNION ALL SELECT 'applications', COUNT(*) FROM applications
UNION ALL SELECT 'placements', COUNT(*) FROM placements
UNION ALL SELECT 'day_diaries', COUNT(*) FROM day_diaries
UNION ALL SELECT 'evaluations', COUNT(*) FROM evaluations
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'company', COUNT(*) FROM company;
