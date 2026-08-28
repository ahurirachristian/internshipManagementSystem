-- =====================================================================
-- Internship Management System -- Mega Backup (Foundation Database)
-- Generated: 2026-08-20
-- Database: internshipManagementSystem_db
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_general_ci
--
-- MULTI-UNIVERSITY SCHEMA
-- Supports universities with different structural depths:
--   Nkumba:   University -> School                  (1 level)
--   Makerere: University -> College -> School/Dept   (2-3 levels)
-- via a single self-referencing academic_units tree per university.
--
-- Tables (16):
--   countries, universities, company, company_departments, company_supervisors,
--   users, academic_units, courses, staff, unit_courses,
--   student_profiles, day_diaries, placements, evaluations,
--   vacancies, audit_logs
--
-- Usage:
--   mysql -u root -p < mega_backcopy.sql
--
-- Login:
--   Students login with student_no as username.
--   Default student password: Student@123 (must_change_password = TRUE)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- -------------------------------------------------------------------
-- Section 1: Database
-- -------------------------------------------------------------------

DROP DATABASE IF EXISTS `internshipManagementSystem_db`;
CREATE DATABASE `internshipManagementSystem_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE `internshipManagementSystem_db`;

-- -------------------------------------------------------------------
-- Section 2: Drop tables (FK-safe order)
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS `day_diaries`;
DROP TABLE IF EXISTS `student_profiles`;
DROP TABLE IF EXISTS `unit_courses`;
DROP TABLE IF EXISTS `staff`;
DROP TABLE IF EXISTS `courses`;
DROP TABLE IF EXISTS `academic_units`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `vacancies`;
DROP TABLE IF EXISTS `evaluations`;
DROP TABLE IF EXISTS `placements`;
DROP TABLE IF EXISTS `company_supervisors`;
DROP TABLE IF EXISTS `company_departments`;
DROP TABLE IF EXISTS `company`;
DROP TABLE IF EXISTS `universities`;
DROP TABLE IF EXISTS `countries`;

-- -------------------------------------------------------------------
-- Section 3: Create tables (dependency order)
-- -------------------------------------------------------------------

-- 1. countries
CREATE TABLE `countries` (
  `id`   BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK5dhgnik9p8t72kaktdb8kd8dt` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. universities (multi-tenant root)
CREATE TABLE `universities` (
  `university_id`    INT NOT NULL AUTO_INCREMENT,
  `short_form`       VARCHAR(15) NOT NULL,
  `full_name`        VARCHAR(200) NOT NULL,
  `country`          VARCHAR(100) DEFAULT 'Uganda',
  `established_year` INT DEFAULT NULL,
  PRIMARY KEY (`university_id`),
  UNIQUE KEY `UK_uni_short` (`short_form`),
  UNIQUE KEY `UK_uni_full_name` (`full_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. company
CREATE TABLE `company` (
  `id`                BIGINT NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(200) NOT NULL,
  `registration_number` VARCHAR(50) DEFAULT NULL,
  `industry`          VARCHAR(100) DEFAULT NULL,
  `size`              ENUM('Small','Medium','Large','Enterprise') DEFAULT NULL,
  `website`           VARCHAR(255) DEFAULT NULL,
  `email`             VARCHAR(255) DEFAULT NULL,
  `phone`             VARCHAR(30) DEFAULT NULL,
  `country`           VARCHAR(100) DEFAULT 'Uganda',
  `city`              VARCHAR(100) DEFAULT NULL,
  `physical_address`  VARCHAR(500) DEFAULT NULL,
  `postal_address`    VARCHAR(500) DEFAULT NULL,
  `description`       TEXT DEFAULT NULL,
  `logo_url`          VARCHAR(500) DEFAULT NULL,
  `created_at`        DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_company_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. company_departments
CREATE TABLE `company_departments` (
  `id`              BIGINT NOT NULL AUTO_INCREMENT,
  `company_id`      BIGINT NOT NULL,
  `department_name` VARCHAR(150) NOT NULL,
  `head_name`       VARCHAR(150) DEFAULT NULL,
  `head_contact`    VARCHAR(30) DEFAULT NULL,
  `head_email`      VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_dept_company_name` (`company_id`, `department_name`),
  CONSTRAINT `FK_dept_company`
    FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. company_supervisors
CREATE TABLE `company_supervisors` (
  `id`            BIGINT NOT NULL AUTO_INCREMENT,
  `company_id`    BIGINT NOT NULL,
  `department_id` BIGINT DEFAULT NULL,
  `full_name`     VARCHAR(150) NOT NULL,
  `contact`       VARCHAR(30) DEFAULT NULL,
  `email`         VARCHAR(150) DEFAULT NULL,
  `role`          VARCHAR(50) DEFAULT NULL,
  `is_primary`    BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_sup_company`
    FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_sup_department`
    FOREIGN KEY (`department_id`) REFERENCES `company_departments` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. users
CREATE TABLE `users` (
  `id`                   BIGINT NOT NULL AUTO_INCREMENT,
  `username`             VARCHAR(255) NOT NULL,
  `password`             VARCHAR(255) NOT NULL,
  `role`                 ENUM('ADMIN','COMPANY','STUDENT','SUPERVISOR') NOT NULL,
  `company_id`           BIGINT DEFAULT NULL,
  `university_id`        INT DEFAULT NULL,
  `provider`             VARCHAR(255) DEFAULT NULL,
  `provider_id`          VARCHAR(255) DEFAULT NULL,
  `email`                VARCHAR(255) DEFAULT NULL,
  `must_change_password` BOOLEAN NOT NULL DEFAULT TRUE,
  `password_reset_token` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKr43af9ap4edm43mmtq01oddj6` (`username`),
  UNIQUE KEY `UK6jdo1l976be85wv43w6x6e6x2` (`provider_id`),
  CONSTRAINT `FK_users_company`
    FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
    ON DELETE SET NULL,
  CONSTRAINT `FK_users_university`
    FOREIGN KEY (`university_id`) REFERENCES `universities` (`university_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 8. academic_units (self-referencing tree)
-- One row = one node (College, School, Faculty, Department, Institute, Directorate, Centre).
-- parent_unit_id = NULL means top-level unit for that university.
-- Supports any nesting depth: Nkumba has 1 level, Makerere has 2-3 levels.
CREATE TABLE `academic_units` (
  `unit_id`         INT NOT NULL AUTO_INCREMENT,
  `university_id`   INT NOT NULL,
  `parent_unit_id`  INT DEFAULT NULL,
  `unit_type`       ENUM('College','School','Faculty','Department','Institute','Directorate','Centre') NOT NULL,
  `unit_name`       VARCHAR(200) NOT NULL,
  `short_form`      VARCHAR(15) DEFAULT NULL,
  PRIMARY KEY (`unit_id`),
  CONSTRAINT `FK_au_university`
    FOREIGN KEY (`university_id`) REFERENCES `universities` (`university_id`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_au_parent`
    FOREIGN KEY (`parent_unit_id`) REFERENCES `academic_units` (`unit_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 9. courses (scoped per university)
-- A course can exist at multiple universities with different durations/codes.
-- level is an ENUM:Certificate, Diploma, Bachelors, Masters, PhD, PGD, Short Course
CREATE TABLE `courses` (
  `course_id`     INT NOT NULL AUTO_INCREMENT,
  `university_id` INT NOT NULL,
  `course_name`   VARCHAR(200) NOT NULL,
  `duration`      VARCHAR(20) NOT NULL,
  `level`         ENUM('Certificate','Diploma','Bachelors','Masters','PhD','PGD','Short Course') DEFAULT NULL,
  PRIMARY KEY (`course_id`),
  CONSTRAINT `FK_courses_university`
    FOREIGN KEY (`university_id`) REFERENCES `universities` (`university_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 10. staff
-- Scoped to a university, optionally attached to a specific unit.
-- university_id = NULL means external staff (e.g. field supervisor from a company).
CREATE TABLE `staff` (
  `staff_id`      INT NOT NULL AUTO_INCREMENT,
  `university_id` INT DEFAULT NULL,
  `unit_id`       INT DEFAULT NULL,
  `full_name`     VARCHAR(150) NOT NULL,
  `contact`       VARCHAR(20) DEFAULT NULL,
  `email`         VARCHAR(150) DEFAULT NULL,
  `role`          VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (`staff_id`),
  CONSTRAINT `FK_staff_university`
    FOREIGN KEY (`university_id`) REFERENCES `universities` (`university_id`)
    ON DELETE SET NULL,
  CONSTRAINT `FK_staff_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `academic_units` (`unit_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 11. unit_courses (junction)
-- A course can be attached to ANY unit level (College, School, or Department)
-- and to more than one unit within the same university.
CREATE TABLE `unit_courses` (
  `id`        INT NOT NULL AUTO_INCREMENT,
  `unit_id`   INT NOT NULL,
  `course_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_unit_course` (`unit_id`, `course_id`),
  CONSTRAINT `FK_uc_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `academic_units` (`unit_id`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_uc_course`
    FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 12. student_profiles
CREATE TABLE `student_profiles` (
  `id`                          BIGINT NOT NULL AUTO_INCREMENT,
  `student_name`                VARCHAR(255) NOT NULL,
  `student_no`                  VARCHAR(100) NOT NULL,
  `reg_no`                      VARCHAR(100) NOT NULL,
  `intake`                      VARCHAR(50) NOT NULL,
  `program`                     VARCHAR(100) NOT NULL,
  `course_name`                 VARCHAR(100) NOT NULL,
  `mobile_no`                   VARCHAR(20) DEFAULT NULL,
  `email`                       VARCHAR(255) NOT NULL,
  `year_of_study`               VARCHAR(20) NOT NULL,
  `academic_year`               VARCHAR(20) NOT NULL,
  `semester`                    VARCHAR(20) NOT NULL,
  `organisation`                VARCHAR(255) NOT NULL,
  `location`                    VARCHAR(255) NOT NULL,
  `academic_supervisor`         VARCHAR(255) NOT NULL,
  `academic_supervisor_contact` VARCHAR(20) DEFAULT NULL,
  `field_supervisor`            VARCHAR(255) NOT NULL,
  `field_supervisor_contact`    VARCHAR(20) DEFAULT NULL,
  `start_date`                  DATE DEFAULT NULL,
  `end_date`                    DATE DEFAULT NULL,
  `picture`                     LONGBLOB DEFAULT NULL,
  `unit_id`                     INT DEFAULT NULL,
  `course_id`                   INT DEFAULT NULL,
  `academic_supervisor_id`      INT DEFAULT NULL,
  `field_supervisor_id`         INT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_student_no` (`student_no`),
  UNIQUE KEY `UK_reg_no` (`reg_no`),
  UNIQUE KEY `UK_student_email` (`email`),
  CONSTRAINT `FK_sp_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `academic_units` (`unit_id`)
    ON DELETE SET NULL,
  CONSTRAINT `FK_sp_course`
    FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`)
    ON DELETE RESTRICT,
  CONSTRAINT `FK_sp_academic_sup`
    FOREIGN KEY (`academic_supervisor_id`) REFERENCES `staff` (`staff_id`)
    ON DELETE SET NULL,
  CONSTRAINT `FK_sp_field_sup`
    FOREIGN KEY (`field_supervisor_id`) REFERENCES `staff` (`staff_id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 13. day_diaries
CREATE TABLE `day_diaries` (
  `id`                          BIGINT NOT NULL AUTO_INCREMENT,
  `date`                        DATE NOT NULL,
  `daily_activities`            TINYTEXT NOT NULL,
  `knowledge_and_skills_gained` TINYTEXT NOT NULL,
  `accomplishments`             TINYTEXT NOT NULL,
  `status`                      VARCHAR(255) NOT NULL DEFAULT 'PENDING',
  `supervisor_feedback`         LONGTEXT DEFAULT NULL,
  `student_profile_id`          BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_day_diaries_student_profile` (`student_profile_id`),
  CONSTRAINT `FK_day_diaries_student_profile`
    FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 14. placements
CREATE TABLE `placements` (
  `id`                    BIGINT NOT NULL AUTO_INCREMENT,
  `student_id`            BIGINT NOT NULL,
  `company_id`            BIGINT NOT NULL,
  `university_supervisor` VARCHAR(255) NOT NULL,
  `company_supervisor`    VARCHAR(255) NOT NULL,
  `status`                ENUM('PENDING','ASSIGNED','ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 15. evaluations
CREATE TABLE `evaluations` (
  `id`                    BIGINT NOT NULL AUTO_INCREMENT,
  `student_id`            BIGINT NOT NULL,
  `placement_id`          BIGINT DEFAULT NULL,
  `supervisor_type`       VARCHAR(255) NOT NULL,
  `supervisor_username`   VARCHAR(255) NOT NULL,
  `punctuality`           INT NOT NULL,
  `practical_work_ethics` INT NOT NULL,
  `attendance`            INT NOT NULL,
  `workplace_performance` INT NOT NULL,
  `logbook_quality`       INT DEFAULT NULL,
  `academic_report`       INT DEFAULT NULL,
  `presentation`          INT DEFAULT NULL,
  `overall_grade`         INT DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 16. vacancies
CREATE TABLE `vacancies` (
  `id`           BIGINT NOT NULL AUTO_INCREMENT,
  `company_id`   BIGINT NOT NULL,
  `created_at`   DATE NOT NULL,
  `deadline`     DATE NOT NULL,
  `description`  VARCHAR(1000) NOT NULL,
  `location`     VARCHAR(200) DEFAULT NULL,
  `requirements` VARCHAR(1000) DEFAULT NULL,
  `status`       VARCHAR(255) NOT NULL,
  `title`        VARCHAR(200) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 17. audit_logs
CREATE TABLE `audit_logs` (
  `id`            BIGINT NOT NULL AUTO_INCREMENT,
  `timestamp`     DATETIME(6) NOT NULL,
  `username`      VARCHAR(255) NOT NULL,
  `role`          VARCHAR(255) NOT NULL,
  `action`        VARCHAR(255) NOT NULL,
  `target_entity` VARCHAR(255) NOT NULL,
  `details`       VARCHAR(255) DEFAULT NULL,
  `ip_address`    VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -------------------------------------------------------------------
-- Section 4: Insert data (FK-safe order)
-- -------------------------------------------------------------------

-- 1. countries (196 rows)
INSERT INTO `countries` (`id`, `name`, `code`) VALUES
(1,'Afghanistan','AF'),
(2,'Albania','AL'),
(3,'Algeria','DZ'),
(4,'Andorra','AD'),
(5,'Angola','AO'),
(6,'Antigua and Barbuda','AG'),
(7,'Argentina','AR'),
(8,'Armenia','AM'),
(9,'Australia','AU'),
(10,'Austria','AT'),
(11,'Azerbaijan','AZ'),
(12,'Bahamas','BS'),
(13,'Bahrain','BH'),
(14,'Bangladesh','BD'),
(15,'Barbados','BB'),
(16,'Belarus','BY'),
(17,'Belgium','BE'),
(18,'Belize','BZ'),
(19,'Benin','BJ'),
(20,'Bhutan','BT'),
(21,'Bolivia','BO'),
(22,'Bosnia and Herzegovina','BA'),
(23,'Botswana','BW'),
(24,'Brazil','BR'),
(25,'Brunei','BN'),
(26,'Bulgaria','BG'),
(27,'Burkina Faso','BF'),
(28,'Burundi','BI'),
(29,'Cabo Verde','CV'),
(30,'Cambodia','KH'),
(31,'Cameroon','CM'),
(32,'Canada','CA'),
(33,'Central African Republic','CF'),
(34,'Chad','TD'),
(35,'Chile','CL'),
(36,'China','CN'),
(37,'Colombia','CO'),
(38,'Comoros','KM'),
(39,'Congo','CG'),
(40,'Costa Rica','CR'),
(41,'Croatia','HR'),
(42,'Cuba','CU'),
(43,'Cyprus','CY'),
(44,'Czech Republic','CZ'),
(45,'Denmark','DK'),
(46,'Djibouti','DJ'),
(47,'Dominica','DM'),
(48,'Dominican Republic','DO'),
(49,'East Timor','TL'),
(50,'Ecuador','EC'),
(51,'Egypt','EG'),
(52,'El Salvador','SV'),
(53,'Equatorial Guinea','GQ'),
(54,'Eritrea','ER'),
(55,'Estonia','EE'),
(56,'Eswatini','SZ'),
(57,'Ethiopia','ET'),
(58,'Fiji','FJ'),
(59,'Finland','FI'),
(60,'France','FR'),
(61,'Gabon','GA'),
(62,'Gambia','GM'),
(63,'Georgia','GE'),
(64,'Germany','DE'),
(65,'Ghana','GH'),
(66,'Greece','GR'),
(67,'Grenada','GD'),
(68,'Guatemala','GT'),
(69,'Guinea','GN'),
(70,'Guinea-Bissau','GW'),
(71,'Guyana','GY'),
(72,'Haiti','HT'),
(73,'Honduras','HN'),
(74,'Hungary','HU'),
(75,'Iceland','IS'),
(76,'India','IN'),
(77,'Indonesia','ID'),
(78,'Iran','IR'),
(79,'Iraq','IQ'),
(80,'Ireland','IE'),
(81,'Israel','IL'),
(82,'Italy','IT'),
(83,'Ivory Coast','CI'),
(84,'Jamaica','JM'),
(85,'Japan','JP'),
(86,'Jordan','JO'),
(87,'Kazakhstan','KZ'),
(88,'Kenya','KE'),
(89,'Kiribati','KI'),
(90,'Kosovo','XK'),
(91,'Kuwait','KW'),
(92,'Kyrgyzstan','KG'),
(93,'Laos','LA'),
(94,'Latvia','LV'),
(95,'Lebanon','LB'),
(96,'Lesotho','LS'),
(97,'Liberia','LR'),
(98,'Libya','LY'),
(99,'Liechtenstein','LI'),
(100,'Lithuania','LT'),
(101,'Luxembourg','LU'),
(102,'Madagascar','MG'),
(103,'Malawi','MW'),
(104,'Malaysia','MY'),
(105,'Maldives','MV'),
(106,'Mali','ML'),
(107,'Malta','MT'),
(108,'Marshall Islands','MH'),
(109,'Mauritania','MR'),
(110,'Mauritius','MU'),
(111,'Mexico','MX'),
(112,'Micronesia','FM'),
(113,'Moldova','MD'),
(114,'Monaco','MC'),
(115,'Mongolia','MN'),
(116,'Montenegro','ME'),
(117,'Morocco','MA'),
(118,'Mozambique','MZ'),
(119,'Myanmar','MM'),
(120,'Namibia','NA'),
(121,'Nauru','NR'),
(122,'Nepal','NP'),
(123,'Netherlands','NL'),
(124,'New Zealand','NZ'),
(125,'Nicaragua','NI'),
(126,'Niger','NE'),
(127,'Nigeria','NG'),
(128,'North Korea','KP'),
(129,'North Macedonia','MK'),
(130,'Norway','NO'),
(131,'Oman','OM'),
(132,'Pakistan','PK'),
(133,'Palau','PW'),
(134,'Palestine','PS'),
(135,'Panama','PA'),
(136,'Papua New Guinea','PG'),
(137,'Paraguay','PY'),
(138,'Peru','PE'),
(139,'Philippines','PH'),
(140,'Poland','PL'),
(141,'Portugal','PT'),
(142,'Qatar','QA'),
(143,'Romania','RO'),
(144,'Russia','RU'),
(145,'Rwanda','RW'),
(146,'Saint Kitts and Nevis','KN'),
(147,'Saint Lucia','LC'),
(148,'Saint Vincent and the Grenadines','VC'),
(149,'Samoa','WS'),
(150,'San Marino','SM'),
(151,'Sao Tome and Principe','ST'),
(152,'Saudi Arabia','SA'),
(153,'Senegal','SN'),
(154,'Serbia','RS'),
(155,'Seychelles','SC'),
(156,'Sierra Leone','SL'),
(157,'Singapore','SG'),
(158,'Slovakia','SK'),
(159,'Slovenia','SI'),
(160,'Solomon Islands','SB'),
(161,'Somalia','SO'),
(162,'South Africa','ZA'),
(163,'South Korea','KR'),
(164,'South Sudan','SS'),
(165,'Spain','ES'),
(166,'Sri Lanka','LK'),
(167,'Sudan','SD'),
(168,'Suriname','SR'),
(169,'Sweden','SE'),
(170,'Switzerland','CH'),
(171,'Syria','SY'),
(172,'Taiwan','TW'),
(173,'Tajikistan','TJ'),
(174,'Tanzania','TZ'),
(175,'Thailand','TH'),
(176,'Togo','TG'),
(177,'Tonga','TO'),
(178,'Trinidad and Tobago','TT'),
(179,'Tunisia','TN'),
(180,'Turkey','TR'),
(181,'Turkmenistan','TM'),
(182,'Tuvalu','TV'),
(183,'Uganda','UG'),
(184,'Ukraine','UA'),
(185,'United Arab Emirates','AE'),
(186,'United Kingdom','GB'),
(187,'United States','US'),
(188,'Uruguay','UY'),
(189,'Uzbekistan','UZ'),
(190,'Vanuatu','VU'),
(191,'Vatican City','VA'),
(192,'Venezuela','VE'),
(193,'Vietnam','VN'),
(194,'Yemen','YE'),
(195,'Zambia','ZM'),
(196,'Zimbabwe','ZW');

-- 2. universities (50 Ugandan universities)
INSERT INTO `universities` (`university_id`, `short_form`, `full_name`, `country`, `established_year`) VALUES
(1,'MAK','Makerere University','Uganda',1922),
(2,'KYU','Kyambogo University','Uganda',2003),
(3,'MUST','Mbarara University of Science and Technology','Uganda',1989),
(4,'GU','Gulu University','Uganda',2002),
(5,'BUS','Busitema University','Uganda',2007),
(6,'KAB','Kabale University','Uganda',2001),
(7,'LU','Lira University','Uganda',2012),
(8,'MU','Muni University','Uganda',2014),
(9,'SUN','Soroti University','Uganda',2015),
(10,'MMU','Mountains of the Moon University','Uganda',2015),
(11,'MUBS','Makerere University Business School','Uganda',1997),
(12,'UMI','Uganda Management Institute','Uganda',1989),
(13,'KIU','Kampala International University','Uganda',2001),
(14,'UCU','Uganda Christian University','Uganda',1997),
(15,'IUIU','Islamic University in Uganda','Uganda',1994),
(16,'UMU','Uganda Martyrs University','Uganda',1993),
(17,'NDEJJE','Ndejje University','Uganda',1994),
(18,'BUGEMA','Bugema University','Uganda',1994),
(19,'NU','Nkumba University','Uganda',1994),
(20,'CUI','Cavendish University Uganda','Uganda',2008),
(21,'VU','Victoria University','Uganda',2010),
(22,'ISBAT','ISBAT University','Uganda',2005),
(23,'IUEA','International University of East Africa','Uganda',2010),
(24,'CIU','Clarke International University','Uganda',2005),
(25,'BSU','Bishop Stuart University','Uganda',2002),
(26,'MRU','Muteesa I Royal University','Uganda',2007),
(27,'SLAU','St. Lawrence University','Uganda',2005),
(28,'UTAMU','Uganda Technology and Management University','Uganda',2013),
(29,'KCU','King Ceasor University','Uganda',2015),
(30,'AFRU','Africa Renewal University','Uganda',2006),
(31,'UNIK','University of Kisubi','Uganda',2014),
(32,'MIU','Metropolitan International University','Uganda',2013),
(33,'IU','Ibanda University','Uganda',2014),
(34,'ARU','African Rural University','Uganda',2004),
(35,'AWU','Ankole Western University','Uganda',2015),
(36,'KUMI','Kumi University','Uganda',2009),
(37,'LIU','LivingStone International University','Uganda',2008),
(38,'UPU','Uganda Pentecostal University','Uganda',2010),
(39,'USHG','University of Sacred Heart Gulu','Uganda',2015),
(40,'TU','Team University','Uganda',2016),
(41,'VUST','Valley University of Science and Technology','Uganda',2016),
(42,'AUIU','Avance International University','Uganda',2017),
(43,'ASUL','All Saints University Lango','Uganda',2015),
(44,'AKU','Aga Khan University Kampala','Uganda',2016),
(45,'ABU','African Bible University','Uganda',2005),
(46,'GLRU','Great Lakes Regional University','Uganda',2016),
(47,'RIU','Rwenzori International University','Uganda',2016),
(48,'ROU','Royal Open University','Uganda',2017),
(49,'NIU','Nexus International University','Uganda',2018),
(50,'LWU','Limkokwing University Uganda','Uganda',2014);

-- 3. company (2 rows)
INSERT INTO `company` (`id`, `name`, `registration_number`, `industry`, `size`, `website`, `email`, `phone`, `country`, `city`, `physical_address`, `postal_address`, `description`, `logo_url`, `created_at`, `updated_at`) VALUES
(1,'Airtel Uganda','UBS-2010-12345','Telecommunications','Large','www.airtel.co.ug','info@airtel.co.ug','0700000000','Uganda','Kampala','Plot 1, Airtel Road, Nakawa','P.O. Box 12345, Kampala','Leading telecommunications and mobile money services provider in Uganda.',NULL,'2026-01-01 00:00:00','2026-01-01 00:00:00'),
(2,'MTN Uganda','UBS-2008-67890','Telecommunications','Enterprise','www.mtn.co.ug','support@mtn.co.ug','0770000000','Uganda','Kampala','MTN Tower, Plot 2, Kampala Road','P.O. Box 23456, Kampala','Uganda''s largest mobile network operator offering voice, data, and mobile money services.',NULL,'2026-01-01 00:00:00','2026-01-01 00:00:00');

-- 4. company_departments (5 rows)
INSERT INTO `company_departments` (`id`, `company_id`, `department_name`, `head_name`, `head_contact`, `head_email`) VALUES
(1,1,'IT Department','Patrick Okello','0756100001','pat.okello@airtel.co.ug'),
(2,1,'Network Operations','Grace Nambogo','0756100002','grace.nambogo@airtel.co.ug'),
(3,1,'Marketing','David Ssemwanga','0756100003','david.ssemwanga@airtel.co.ug'),
(4,2,'Network Operations','Samuel Mugisha','0771100001','sam.mugisha@mtn.co.ug'),
(5,2,'Mobile Money','Catherine Auma','0771100002','cath.auma@mtn.co.ug'),
(6,2,'Customer Service','Robert Kamoga','0771100003','rob.kamoga@mtn.co.ug');

-- 5. company_supervisors (2 rows)
INSERT INTO `company_supervisors` (`id`, `company_id`, `department_id`, `full_name`, `contact`, `email`, `role`, `is_primary`) VALUES
(1,1,1,'John Doe','0756200001','john.doe@airtel.co.ug','Field Supervisor',TRUE),
(2,2,4,'Jane Smith','0771200001','jane.smith@mtn.co.ug','Field Supervisor',TRUE);

-- 6. users
-- Students: default password = Student@123, must_change_password = TRUE
-- Supervisor linked to Nkumba University (university_id=19)
INSERT INTO `users` (`id`, `username`, `password`, `role`, `company_id`, `university_id`, `provider`, `provider_id`, `email`, `must_change_password`, `password_reset_token`) VALUES
(1,'2400101003','$2b$12$0UVwuLCCvEPOWqKaHH6Jxe8D4FrKbUavHbLxyNJs.6x4aWThyD7P2','STUDENT',NULL,NULL,NULL,NULL,'kasaggafred999@gmail.com',TRUE,NULL),
(2,'STU-2026-001','$2b$12$0UVwuLCCvEPOWqKaHH6Jxe8D4FrKbUavHbLxyNJs.6x4aWThyD7P2','STUDENT',NULL,NULL,NULL,NULL,'alex.johnson@example.com',TRUE,NULL),
(3,'STU-2026-002','$2b$12$0UVwuLCCvEPOWqKaHH6Jxe8D4FrKbUavHbLxyNJs.6x4aWThyD7P2','STUDENT',NULL,NULL,NULL,NULL,'sarah.owen@example.com',TRUE,NULL),
(4,'university','$2a$10$9WuA4QFu1pvtygPUTomQquDkg6Pa9QpcSiYGNkbTImM3L8Tnh0xDW','SUPERVISOR',NULL,19,NULL,NULL,'supervisor@mak.ac.ug',FALSE,NULL),
(5,'airtel','$2a$10$D9m8aUyHFw.m5pdFoa9hxOZCc9xbheU3qiP50LLsM0nRbwSytrZ32','COMPANY',1,NULL,NULL,NULL,'info@airtel.co.ug',FALSE,NULL),
(6,'admin','$2a$10$vLuCfsI0XhR76hOIP6GdeO8MRRY9/vtVnVwbBjPb6FsA//IX7ZX1W','ADMIN',NULL,NULL,NULL,NULL,'admin@ims.ac.ug',FALSE,NULL);

-- 8. academic_units (self-referencing tree)
-- Nkumba (university_id=19): 8 flat schools (parent_unit_id = NULL)
-- Makerere (university_id=1): 9 colleges + 5 schools + 4 departments

INSERT INTO `academic_units` (`unit_id`, `university_id`, `parent_unit_id`, `unit_type`, `unit_name`, `short_form`) VALUES
(1,19,NULL,'School','School of Education','SEDU'),
(2,19,NULL,'School','School of Computing and Informatics','SCI'),
(3,19,NULL,'School','School of Law','SLAW'),
(4,19,NULL,'School','School of Social Sciences','SOSS'),
(5,19,NULL,'School','School of Sciences','SCOS'),
(6,19,NULL,'School','School of Business Administration','SBA'),
(7,19,NULL,'School','School of Commercial Industrial Art and Design','SCIAD'),
(8,19,NULL,'Directorate','Directorate of Postgraduate Studies and Research','DPGSR'),
(9,1,NULL,'College','College of Computing and Information Sciences','COCIS'),
(10,1,NULL,'College','College of Health Sciences','CHS'),
(11,1,NULL,'College','College of Business and Management Sciences','CoBAMS'),
(12,1,NULL,'College','College of Education and External Studies','CEES'),
(13,1,NULL,'College','College of Engineering, Design, Art and Technology','CEDAT'),
(14,1,NULL,'College','College of Natural Sciences','CoNAS'),
(15,1,NULL,'College','College of Humanities and Social Sciences','CHUSS'),
(16,1,NULL,'College','College of Agricultural and Environmental Sciences','CAES'),
(17,1,NULL,'College','College of Veterinary Medicine, Animal Resources and Bio-security','CoVAB'),
(18,1,10,'School','School of Medicine','MUSM'),
(19,1,10,'School','School of Public Health','MUSPH'),
(20,1,10,'School','School of Biomedical Sciences','MakSBS'),
(21,1,10,'School','School of Dentistry','MUSD'),
(22,1,10,'School','School of Health Sciences','MUSHS'),
(23,1,20,'Department','Department of Anatomy',NULL),
(24,1,20,'Department','Department of Biochemistry',NULL),
(25,1,20,'Department','Department of Physiology',NULL),
(26,1,9,'Department','Department of Computer Science',NULL);

-- 9. courses (64 total: 62 Nkumba + 2 Makerere)
INSERT INTO `courses` (`course_id`, `university_id`, `course_name`, `duration`, `level`) VALUES
(1,19,'Master Of Education Management And Planning','2 Years','Masters'),
(2,19,'Ordinary Certificate in Early Childhood Care & Development Education','1 Year','Certificate'),
(3,19,'Diploma In Education In Early Childhood Care And Development','2 Years','Diploma'),
(4,19,'Diploma In Education (Secondary) - Science','2 Years','Diploma'),
(5,19,'Diploma In Education (Secondary) - Arts','2 Years','Diploma'),
(6,19,'Bachelor Of Education (Primary)','3 Years','Bachelors'),
(7,19,'Bachelor Of Science With Education (Secondary)','3 Years','Bachelors'),
(8,19,'Bachelor Of Arts With Education (Secondary)','3 Years','Bachelors'),
(9,19,'Postgraduate Diploma In Education','1 Year','PGD'),
(10,19,'Post Graduate Diploma In Educational Management And Planning','1 Year','PGD'),
(11,19,'PhD in Education Management','3 Years','PhD'),
(12,19,'Masters Of Science In Information Systems','2 Years','Masters'),
(13,19,'Certificate in Computerised Accounting','2 Weeks','Certificate'),
(14,19,'Data Management and Analysis','2 Weeks','Short Course'),
(15,19,'Certificate in Computer Networking','2 Weeks','Certificate'),
(16,19,'National Certificate in Information Communication Technology','2 Years','Certificate'),
(17,19,'Diploma in Information Systems and Technology','2 Years','Diploma'),
(18,19,'Bachelors of Science in Cybersecurity and Digital Forensics','3 Years','Bachelors'),
(19,19,'Bachelors in Information Systems and Technology','3 Years','Bachelors'),
(20,19,'Masters in Information Systems and Technology','2 Years','Masters'),
(21,19,'Certificate In Python Programming','1 Year','Certificate'),
(22,19,'Certificate in Graphics and Image Editing','2 Months','Certificate'),
(23,19,'Diploma In Records And Information Management','2 Years','Diploma'),
(24,19,'Diploma In Computer Science','2 Years','Diploma'),
(25,19,'Bachelors Of Records And Information Management','3 Years','Bachelors'),
(26,19,'Bachelor Of Office Management And Secretarial Studies','3 Years','Bachelors'),
(27,19,'Bachelor Of Science In Computer Science (BSC)','3 Years','Bachelors'),
(28,19,'Microsoft Office & Online Collaboration','2 Weeks','Short Course'),
(29,19,'Bachelor of Criminal Justice (BCJ)','3 Years','Bachelors'),
(30,19,'Diploma in Criminal Justice','2 Years','Diploma'),
(31,19,'Bachelor of Laws','4 Years','Bachelors'),
(32,19,'Bachelor Of Arts In Community Based Development','3 Years','Bachelors'),
(33,19,'Bachelor Of Arts In Social Work And Social Administration','3 Years','Bachelors'),
(34,19,'Bachelor Of Science in Journalism & Public Relations','3 Years','Bachelors'),
(35,19,'PhD in Counselling Psychology','3 Years','PhD'),
(36,19,'PhD in Public Administration and Management','3 Years','PhD'),
(37,19,'Bachelor Of Science In Environment Management','3 Years','Bachelors'),
(38,19,'PhD in Natural Resources Management','3 Years','PhD'),
(39,19,'Bachelor of Science in Public Health','3 Years','Bachelors'),
(40,19,'Diploma In Hotel Management And Institutional Catering','2 Years','Diploma'),
(41,19,'Diploma In Tourism Operations Management','2 Years','Diploma'),
(42,19,'Bachelor Of Science In Hotel Management And Institutional Catering','3 Years','Bachelors'),
(43,19,'Bachelor Of Science In Tourism Operations Management','3 Years','Bachelors'),
(44,19,'Diploma In Agribusiness','2 Years','Diploma'),
(45,19,'Bachelor Of Science In Wildlife And Forestry Management','3 Years','Bachelors'),
(46,19,'PhD in Public Health','3 Years','PhD'),
(47,19,'Bachelor of Business Administration','3 Years','Bachelors'),
(48,19,'Bachelor Of Procurement And Logistics Management','3 Years','Bachelors'),
(49,19,'Bachelor Of Clearing And Forwarding Management','3 Years','Bachelors'),
(50,19,'Bachelor Of Human Resource Management','3 Years','Bachelors'),
(51,19,'Master Of Procurement And Logistics Management','2 Years','Masters'),
(52,19,'Master Of Science In Human Resource Management','2 Years','Masters'),
(53,19,'Master Of Business Administration','2 Years','Masters'),
(54,19,'PhD in Business Administration','3 Years','PhD'),
(55,19,'Bachelor of Fashion and Textiles Design','3 Years','Bachelors'),
(56,19,'Bachelor Of Commercial Art','3 Years','Bachelors'),
(57,19,'Diploma In Graphic Digital Design','2 Years','Diploma'),
(58,19,'Diploma In Vocational Arts/Crafts And Design Studies','2 Years','Diploma'),
(59,19,'PhD in Art and Design','3 Years','PhD'),
(60,19,'Ph.D In Computing','3 Years','PhD'),
(61,19,'PhD in Development Studies','3 Years','PhD'),
(62,19,'Masters in Taxation Management','2 Years','Masters'),
(63,1,'Bachelor of Science in Computer Science','3 Years','Bachelors'),
(64,1,'Bachelor of Medicine and Bachelor of Surgery','5 Years','Bachelors');

-- 10. unit_courses (junction: links courses to academic units)
INSERT INTO `unit_courses` (`id`, `unit_id`, `course_id`) VALUES
(1,1,1),
(2,1,2),
(3,1,3),
(4,1,4),
(5,1,5),
(6,1,6),
(7,1,7),
(8,1,8),
(9,1,9),
(10,1,10),
(11,1,11),
(12,2,12),
(13,2,13),
(14,2,14),
(15,2,15),
(16,2,16),
(17,2,17),
(18,2,18),
(19,2,19),
(20,2,20),
(21,2,21),
(22,2,22),
(23,2,23),
(24,2,24),
(25,2,25),
(26,2,26),
(27,2,27),
(28,2,28),
(29,3,29),
(30,3,30),
(31,3,31),
(32,4,32),
(33,4,33),
(34,4,34),
(35,4,35),
(36,4,36),
(37,5,37),
(38,5,38),
(39,5,39),
(40,5,40),
(41,5,41),
(42,5,42),
(43,5,43),
(44,5,44),
(45,5,45),
(46,5,46),
(47,6,47),
(48,6,48),
(49,6,49),
(50,6,50),
(51,6,51),
(52,6,52),
(53,6,53),
(54,6,54),
(55,6,23),
(56,6,25),
(57,6,26),
(58,7,55),
(59,7,56),
(60,7,57),
(61,7,58),
(62,7,59),
(63,7,22),
(64,8,53),
(65,8,60),
(66,8,46),
(67,8,59),
(68,8,36),
(69,8,61),
(70,8,11),
(71,8,35),
(72,8,38),
(73,8,54),
(74,8,51),
(75,8,52),
(76,8,12),
(77,8,62),
(78,26,63),
(79,18,64);

-- 11. staff
INSERT INTO `staff` (`staff_id`, `university_id`, `unit_id`, `full_name`, `contact`, `email`, `role`) VALUES
(1,19,2,'Ssemaganda Shuraim','075887005','shuraim@nkumba.ac.ug','Academic Supervisor'),
(2,NULL,NULL,'Nangai Zackaria','0784723705','zackaria@company.com','Field Supervisor');

-- 12. student_profiles
-- FK: unit_id -> academic_units (was school_id -> schools)
INSERT INTO `student_profiles` (`id`,`student_name`,`student_no`,`reg_no`,`intake`,`program`,`course_name`,`mobile_no`,`email`,`year_of_study`,`academic_year`,`semester`,`organisation`,`location`,`academic_supervisor`,`academic_supervisor_contact`,`field_supervisor`,`field_supervisor_contact`,`start_date`,`end_date`,`picture`,`unit_id`,`course_id`,`academic_supervisor_id`,`field_supervisor_id`) VALUES
(1,'Kasagga Fred','2400101003','2024/AUG/BCS/B23628S/DAY','AUG/2024','BSCCS','Internship','0757402058','kasaggafred999@gmail.com','2026','Two','Two','MicroVest','National ICT Innovation Hub, Nakawa','Ssemaganda Shuraim','075887005','Nangai Zackaria','0784723705','2026-07-13','2026-09-13',NULL,2,19,1,2),
(2,'Alex Johnson','STU-2026-001','REG-1001','AUG/2024','BSCCS','Internship','+1 555 123 4567','alex.johnson@example.com','2026','Three','Two','Airtel Uganda','Kampala','university','0700000000','John Doe','0700000000','2026-07-13','2026-09-13',NULL,2,27,1,2),
(3,'Sarah Owen','STU-2026-002','REG-1002','AUG/2024','BSE','Internship','+256 700 111 222','sarah.owen@example.com','2026','Four','Two','Airtel Uganda','Kampala','university','0700000000','John Doe','0700000000','2026-07-13','2026-09-13',NULL,6,47,1,2);

-- 13. day_diaries
INSERT INTO `day_diaries` (`id`,`date`,`daily_activities`,`knowledge_and_skills_gained`,`accomplishments`,`status`,`supervisor_feedback`,`student_profile_id`) VALUES
(1,'2026-08-19','Test Demo','Learning testing frameworks','Demo completed','PENDING',NULL,1),
(2,'2026-08-20','Test 2','Continued testing','More progress','PENDING',NULL,1);

-- -------------------------------------------------------------------
-- Section 5: Reset AUTO_INCREMENT
-- -------------------------------------------------------------------

ALTER TABLE `countries`         AUTO_INCREMENT = 197;
ALTER TABLE `universities`     AUTO_INCREMENT = 51;
ALTER TABLE `company`          AUTO_INCREMENT = 3;
ALTER TABLE `company_departments` AUTO_INCREMENT = 7;
ALTER TABLE `company_supervisors` AUTO_INCREMENT = 3;
ALTER TABLE `users`            AUTO_INCREMENT = 7;
ALTER TABLE `academic_units`   AUTO_INCREMENT = 27;
ALTER TABLE `courses`          AUTO_INCREMENT = 65;
ALTER TABLE `staff`            AUTO_INCREMENT = 3;
ALTER TABLE `unit_courses`     AUTO_INCREMENT = 80;
ALTER TABLE `student_profiles` AUTO_INCREMENT = 4;
ALTER TABLE `day_diaries`      AUTO_INCREMENT = 3;
ALTER TABLE `placements`       AUTO_INCREMENT = 1;
ALTER TABLE `evaluations`      AUTO_INCREMENT = 1;
ALTER TABLE `vacancies`        AUTO_INCREMENT = 1;
ALTER TABLE `audit_logs`       AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- End of mega_backcopy.sql
-- Tables: 16 | Countries: 196 | Universities: 50 (all Ugandan)
-- Academic Units: 26 (Nkumba:8 flat + Makerere:18 nested)
-- Courses: 64 (62 Nkumba + 2 Makerere) | Unit-Course links: 79
-- Companies: 2 | Departments: 6 | Supervisors: 2
-- Staff: 2 | Users: 6 | Students: 3 | Day Diaries: 2
-- =====================================================================
