-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: internshipManagementSystem_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `app_migration_flags`
--

DROP TABLE IF EXISTS `app_migration_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_migration_flags` (
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `applied_at` datetime(6) NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_migration_flags`
--

LOCK TABLES `app_migration_flags` WRITE;
/*!40000 ALTER TABLE `app_migration_flags` DISABLE KEYS */;
INSERT INTO `app_migration_flags` VALUES ('legacy-accounts-enabled-heal-v1','2026-09-30 05:35:49.648417');
/*!40000 ALTER TABLE `app_migration_flags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `applications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `status` enum('ACCEPTED','REJECTED','REVIEWING','SHORTLISTED','SUBMITTED','WITHDRAWN') COLLATE utf8mb4_general_ci NOT NULL,
  `student_id` bigint NOT NULL,
  `vacancy_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applications`
--

LOCK TABLES `applications` WRITE;
/*!40000 ALTER TABLE `applications` DISABLE KEYS */;
/*!40000 ALTER TABLE `applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `timestamp` datetime(6) NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `action` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `target_entity` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `details` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ip_address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_timestamp` (`timestamp`),
  KEY `idx_audit_logs_entity_user` (`target_entity`,`username`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,'2026-08-19 06:00:00.000000','admin','ADMIN','LOGIN','User','Admin logged in','127.0.0.1'),(2,'2026-08-19 06:05:00.000000','admin','ADMIN','CREATE','Company','Created company: Airtel Uganda','127.0.0.1'),(3,'2026-08-19 06:10:00.000000','admin','ADMIN','CREATE','Company','Created company: MTN Uganda','127.0.0.1'),(4,'2026-08-19 07:00:00.000000','2400101003','STUDENT','LOGIN','User','Student logged in','127.0.0.1'),(5,'2026-08-20 05:30:00.000000','2400101003','STUDENT','CREATE','DayDiary','Created diary entry for 2026-08-19','127.0.0.1'),(6,'2026-08-24 01:47:29.574053','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(7,'2026-08-24 01:48:27.625570','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(8,'2026-08-24 03:08:55.459138','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(9,'2026-08-24 03:11:23.307576','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(10,'2026-08-24 03:42:33.437253','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(11,'2026-08-25 10:05:23.591061','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(12,'2026-08-25 10:05:24.104649','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(13,'2026-08-25 10:05:24.976429','2400101003','STUDENT','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(14,'2026-08-25 10:07:49.329132','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(15,'2026-08-25 10:08:27.115657','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(16,'2026-08-25 12:52:56.458520','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(17,'2026-08-27 14:09:59.160869','kyu','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(18,'2026-09-29 23:30:06.762453','2400101003','STUDENT','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(19,'2026-09-30 02:38:23.924130','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(20,'2026-09-30 02:43:45.036313','2400101003','STUDENT','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(21,'2026-09-30 02:44:01.291645','2400101003','STUDENT','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(22,'2026-09-30 02:44:24.072293','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(23,'2026-09-30 02:44:52.199818','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(24,'2026-09-30 02:55:22.140296','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(25,'2026-09-30 04:31:08.190591','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(26,'2026-09-30 04:31:23.605491','kasaggafred999@gmail.com','UNKNOWN','LOGIN_FAILED','User','Failed sign-in attempt','0:0:0:0:0:0:0:1'),(27,'2026-09-30 04:31:29.767925','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(28,'2026-09-30 04:58:48.948713','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(29,'2026-09-30 04:58:49.385033','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(30,'2026-09-30 04:58:49.723952','kyu','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(31,'2026-09-30 04:58:50.109358','airtel','COMPANY','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(32,'2026-09-30 04:58:50.934434','2400101003','STUDENT','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(33,'2026-09-30 04:58:51.819437','STU-2026-001','STUDENT','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(34,'2026-09-30 05:14:16.264080','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(35,'2026-09-30 05:14:16.813918','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(36,'2026-09-30 05:14:17.205697','kyu','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(37,'2026-09-30 05:14:17.880358','airtel','COMPANY','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(38,'2026-09-30 05:14:19.216973','2400101003','STUDENT','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(39,'2026-09-30 05:36:25.211298','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(40,'2026-09-30 06:09:17.800199','kyu','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(41,'2026-09-30 06:09:40.125290','2400101003','STUDENT','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(42,'2026-09-30 06:10:25.174564','2400101003','STUDENT','PASSWORD_CHANGE','User','Password changed by the account owner',NULL),(43,'2026-09-30 07:48:49.600938','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(44,'2026-10-01 00:47:41.462897','kyu','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(45,'2026-10-01 01:03:16.144296','system','ADMIN','CREATE','Notification','Notification \'ROLE_REQUEST\' sent to 1 recipient(s)',NULL),(46,'2026-10-01 01:03:16.184815','kyu','SUPERVISOR','ROLE_REQUEST','RoleRequest','Requested role ADMIN',NULL),(47,'2026-10-01 01:03:43.849987','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(48,'2026-10-01 01:43:50.332049','airtel','COMPANY','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(49,'2026-10-01 02:25:37.764376','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(50,'2026-10-01 02:44:08.094381','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(51,'2026-10-01 03:46:20.997383','2400101003','UNKNOWN','LOGIN_FAILED','User','Failed sign-in attempt','0:0:0:0:0:0:0:1'),(52,'2026-10-01 03:46:58.818290','airtel','COMPANY','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(53,'2026-10-01 03:47:52.693068','2400101003','UNKNOWN','LOGIN_FAILED','User','Failed sign-in attempt','0:0:0:0:0:0:0:1'),(54,'2026-10-01 03:48:08.658272','STU-2026-001','STUDENT','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(55,'2026-10-01 03:54:39.190954','STU-2026-001','STUDENT','PASSWORD_CHANGE','User','Password changed by the account owner',NULL),(56,'2026-10-01 08:17:07.830975','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(57,'2026-10-01 20:00:47.632067','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(58,'2026-10-02 00:17:03.581889','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(59,'2026-10-02 09:39:08.144556','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(60,'2026-10-02 10:31:38.415982','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(61,'2026-10-02 10:34:16.759227','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(62,'2026-10-02 12:27:57.416601','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(63,'2026-10-02 13:55:42.615103','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(64,'2026-10-03 01:09:33.136271','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(65,'2026-10-03 01:16:03.018629','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(66,'2026-10-05 09:55:58.250403','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(67,'2026-10-05 10:31:37.104111','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(68,'2026-10-06 05:57:28.169880','admin','ADMIN','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1'),(69,'2026-10-06 05:59:38.220740','university','SUPERVISOR','LOGIN','User','User logged in successfully','0:0:0:0:0:0:0:1');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company`
--

DROP TABLE IF EXISTS `company`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `registration_number` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `industry` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `size` enum('Enterprise','Large','Medium','Small') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_general_ci DEFAULT 'Uganda',
  `city` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `physical_address` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `postal_address` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `logo_url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_company_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company`
--

LOCK TABLES `company` WRITE;
/*!40000 ALTER TABLE `company` DISABLE KEYS */;
INSERT INTO `company` VALUES (1,'Airtel Uganda','UBS-2010-12345','Telecommunications','Large','www.airtel.co.ug','info@airtel.co.ug','0700000000','Uganda','Kampala','Plot 1, Airtel Road, Nakawa','P.O. Box 12345, Kampala','Leading telecommunications and mobile money services provider in Uganda.',NULL,'2026-01-01 00:00:00','2026-01-01 00:00:00'),(2,'MTN Uganda','UBS-2008-67890','Telecommunications','Enterprise','www.mtn.co.ug','support@mtn.co.ug','0770000000','Uganda','Kampala','MTN Tower, Plot 2, Kampala Road','P.O. Box 23456, Kampala','Uganda\'s largest mobile network operator offering voice, data, and mobile money services.',NULL,'2026-01-01 00:00:00','2026-01-01 00:00:00');
/*!40000 ALTER TABLE `company` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_departments`
--

DROP TABLE IF EXISTS `company_departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_departments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `department_name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `head_name` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `head_contact` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `head_email` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_dept_company_name` (`company_id`,`department_name`),
  UNIQUE KEY `UKirpkrv2m4rysm7regl4dvovbr` (`company_id`,`department_name`),
  CONSTRAINT `FK_dept_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_departments`
--

LOCK TABLES `company_departments` WRITE;
/*!40000 ALTER TABLE `company_departments` DISABLE KEYS */;
INSERT INTO `company_departments` VALUES (1,1,'IT Department','Patrick Okello','0756100001','pat.okello@airtel.co.ug'),(2,1,'Network Operations','Grace Nambogo','0756100002','grace.nambogo@airtel.co.ug'),(3,1,'Marketing','David Ssemwanga','0756100003','david.ssemwanga@airtel.co.ug'),(4,2,'Network Operations','Samuel Mugisha','0771100001','sam.mugisha@mtn.co.ug'),(5,2,'Mobile Money','Catherine Auma','0771100002','cath.auma@mtn.co.ug'),(6,2,'Customer Service','Robert Kamoga','0771100003','rob.kamoga@mtn.co.ug');
/*!40000 ALTER TABLE `company_departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_supervisors`
--

DROP TABLE IF EXISTS `company_supervisors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_supervisors` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `department_id` bigint DEFAULT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `contact` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `FK_sup_company` (`company_id`),
  KEY `FK_sup_department` (`department_id`),
  CONSTRAINT `FK_sup_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_sup_department` FOREIGN KEY (`department_id`) REFERENCES `company_departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_supervisors`
--

LOCK TABLES `company_supervisors` WRITE;
/*!40000 ALTER TABLE `company_supervisors` DISABLE KEYS */;
INSERT INTO `company_supervisors` VALUES (1,1,1,'John Doe','0756200001','john.doe@airtel.co.ug','Field Supervisor',1),(2,2,4,'Jane Smith','0771200001','jane.smith@mtn.co.ug','Field Supervisor',1);
/*!40000 ALTER TABLE `company_supervisors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `countries`
--

DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `countries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK5dhgnik9p8t72kaktdb8kd8dt` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=197 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `countries`
--

LOCK TABLES `countries` WRITE;
/*!40000 ALTER TABLE `countries` DISABLE KEYS */;
INSERT INTO `countries` VALUES (1,'Afghanistan','AF'),(2,'Albania','AL'),(3,'Algeria','DZ'),(4,'Andorra','AD'),(5,'Angola','AO'),(6,'Antigua and Barbuda','AG'),(7,'Argentina','AR'),(8,'Armenia','AM'),(9,'Australia','AU'),(10,'Austria','AT'),(11,'Azerbaijan','AZ'),(12,'Bahamas','BS'),(13,'Bahrain','BH'),(14,'Bangladesh','BD'),(15,'Barbados','BB'),(16,'Belarus','BY'),(17,'Belgium','BE'),(18,'Belize','BZ'),(19,'Benin','BJ'),(20,'Bhutan','BT'),(21,'Bolivia','BO'),(22,'Bosnia and Herzegovina','BA'),(23,'Botswana','BW'),(24,'Brazil','BR'),(25,'Brunei','BN'),(26,'Bulgaria','BG'),(27,'Burkina Faso','BF'),(28,'Burundi','BI'),(29,'Cabo Verde','CV'),(30,'Cambodia','KH'),(31,'Cameroon','CM'),(32,'Canada','CA'),(33,'Central African Republic','CF'),(34,'Chad','TD'),(35,'Chile','CL'),(36,'China','CN'),(37,'Colombia','CO'),(38,'Comoros','KM'),(39,'Congo','CG'),(40,'Costa Rica','CR'),(41,'Croatia','HR'),(42,'Cuba','CU'),(43,'Cyprus','CY'),(44,'Czech Republic','CZ'),(45,'Denmark','DK'),(46,'Djibouti','DJ'),(47,'Dominica','DM'),(48,'Dominican Republic','DO'),(49,'East Timor','TL'),(50,'Ecuador','EC'),(51,'Egypt','EG'),(52,'El Salvador','SV'),(53,'Equatorial Guinea','GQ'),(54,'Eritrea','ER'),(55,'Estonia','EE'),(56,'Eswatini','SZ'),(57,'Ethiopia','ET'),(58,'Fiji','FJ'),(59,'Finland','FI'),(60,'France','FR'),(61,'Gabon','GA'),(62,'Gambia','GM'),(63,'Georgia','GE'),(64,'Germany','DE'),(65,'Ghana','GH'),(66,'Greece','GR'),(67,'Grenada','GD'),(68,'Guatemala','GT'),(69,'Guinea','GN'),(70,'Guinea-Bissau','GW'),(71,'Guyana','GY'),(72,'Haiti','HT'),(73,'Honduras','HN'),(74,'Hungary','HU'),(75,'Iceland','IS'),(76,'India','IN'),(77,'Indonesia','ID'),(78,'Iran','IR'),(79,'Iraq','IQ'),(80,'Ireland','IE'),(81,'Israel','IL'),(82,'Italy','IT'),(83,'Ivory Coast','CI'),(84,'Jamaica','JM'),(85,'Japan','JP'),(86,'Jordan','JO'),(87,'Kazakhstan','KZ'),(88,'Kenya','KE'),(89,'Kiribati','KI'),(90,'Kosovo','XK'),(91,'Kuwait','KW'),(92,'Kyrgyzstan','KG'),(93,'Laos','LA'),(94,'Latvia','LV'),(95,'Lebanon','LB'),(96,'Lesotho','LS'),(97,'Liberia','LR'),(98,'Libya','LY'),(99,'Liechtenstein','LI'),(100,'Lithuania','LT'),(101,'Luxembourg','LU'),(102,'Madagascar','MG'),(103,'Malawi','MW'),(104,'Malaysia','MY'),(105,'Maldives','MV'),(106,'Mali','ML'),(107,'Malta','MT'),(108,'Marshall Islands','MH'),(109,'Mauritania','MR'),(110,'Mauritius','MU'),(111,'Mexico','MX'),(112,'Micronesia','FM'),(113,'Moldova','MD'),(114,'Monaco','MC'),(115,'Mongolia','MN'),(116,'Montenegro','ME'),(117,'Morocco','MA'),(118,'Mozambique','MZ'),(119,'Myanmar','MM'),(120,'Namibia','NA'),(121,'Nauru','NR'),(122,'Nepal','NP'),(123,'Netherlands','NL'),(124,'New Zealand','NZ'),(125,'Nicaragua','NI'),(126,'Niger','NE'),(127,'Nigeria','NG'),(128,'North Korea','KP'),(129,'North Macedonia','MK'),(130,'Norway','NO'),(131,'Oman','OM'),(132,'Pakistan','PK'),(133,'Palau','PW'),(134,'Palestine','PS'),(135,'Panama','PA'),(136,'Papua New Guinea','PG'),(137,'Paraguay','PY'),(138,'Peru','PE'),(139,'Philippines','PH'),(140,'Poland','PL'),(141,'Portugal','PT'),(142,'Qatar','QA'),(143,'Romania','RO'),(144,'Russia','RU'),(145,'Rwanda','RW'),(146,'Saint Kitts and Nevis','KN'),(147,'Saint Lucia','LC'),(148,'Saint Vincent and the Grenadines','VC'),(149,'Samoa','WS'),(150,'San Marino','SM'),(151,'Sao Tome and Principe','ST'),(152,'Saudi Arabia','SA'),(153,'Senegal','SN'),(154,'Serbia','RS'),(155,'Seychelles','SC'),(156,'Sierra Leone','SL'),(157,'Singapore','SG'),(158,'Slovakia','SK'),(159,'Slovenia','SI'),(160,'Solomon Islands','SB'),(161,'Somalia','SO'),(162,'South Africa','ZA'),(163,'South Korea','KR'),(164,'South Sudan','SS'),(165,'Spain','ES'),(166,'Sri Lanka','LK'),(167,'Sudan','SD'),(168,'Suriname','SR'),(169,'Sweden','SE'),(170,'Switzerland','CH'),(171,'Syria','SY'),(172,'Taiwan','TW'),(173,'Tajikistan','TJ'),(174,'Tanzania','TZ'),(175,'Thailand','TH'),(176,'Togo','TG'),(177,'Tonga','TO'),(178,'Trinidad and Tobago','TT'),(179,'Tunisia','TN'),(180,'Turkey','TR'),(181,'Turkmenistan','TM'),(182,'Tuvalu','TV'),(183,'Uganda','UG'),(184,'Ukraine','UA'),(185,'United Arab Emirates','AE'),(186,'United Kingdom','GB'),(187,'United States','US'),(188,'Uruguay','UY'),(189,'Uzbekistan','UZ'),(190,'Vanuatu','VU'),(191,'Vatican City','VA'),(192,'Venezuela','VE'),(193,'Vietnam','VN'),(194,'Yemen','YE'),(195,'Zambia','ZM'),(196,'Zimbabwe','ZW');
/*!40000 ALTER TABLE `countries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `course_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `course_name` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `programme_id` bigint NOT NULL,
  `university_id` bigint NOT NULL,
  `year_of_study` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'IST1201','Introduction to Information Systems',2019,19,1),(2,'IST1202','Computer Fundamentals',2019,19,1),(3,'IST1203','Discrete Mathematics',2019,19,1),(4,'IST2201','Database Systems',2019,19,2),(5,'IST2202','Object Oriented Programming',2019,19,2),(6,'IST2203','Data Structures and Algorithms',2019,19,2),(7,'IST3201','Software Engineering',2019,19,3),(8,'IST3202','Network Administration',2019,19,3),(9,'IST3203','Web Application Development',2019,19,3),(10,'IST4201','Information Systems Project',2019,19,4),(11,'IST4202','IS Strategy and Governance',2019,19,4);
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `day_diaries`
--

DROP TABLE IF EXISTS `day_diaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `day_diaries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `daily_activities` tinytext COLLATE utf8mb4_general_ci NOT NULL,
  `knowledge_and_skills_gained` tinytext COLLATE utf8mb4_general_ci NOT NULL,
  `accomplishments` tinytext COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'PENDING',
  `supervisor_feedback` longtext COLLATE utf8mb4_general_ci,
  `student_profile_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `account_number` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `action` longtext COLLATE utf8mb4_general_ci,
  `industrial_supervisor_comment` tinytext COLLATE utf8mb4_general_ci,
  `technology_tools` tinytext COLLATE utf8mb4_general_ci,
  `university_id` bigint DEFAULT NULL,
  `university_supervisor_comment` tinytext COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `FK_day_diaries_student_profile` (`student_profile_id`),
  CONSTRAINT `FK_day_diaries_student_profile` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `day_diaries`
--

LOCK TABLES `day_diaries` WRITE;
/*!40000 ALTER TABLE `day_diaries` DISABLE KEYS */;
INSERT INTO `day_diaries` VALUES (1,'2026-08-19','Test Demo','Learning testing frameworks','Demo completed','PENDING',NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL),(2,'2026-08-20','Test 2','Continued testing','More progress','PENDING',NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `day_diaries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `department_id` int NOT NULL,
  `school_id` int NOT NULL,
  `university_id` int NOT NULL,
  `department_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,1,2,'Department of Civil and Environmental Engineering'),(2,1,2,'Department of Mechanical and Production Engineering'),(3,1,2,'Department of Electrical and Electronics Engineering'),(4,1,2,'Department of Bio-Medical and Mechatronics Engineering'),(5,1,2,'Department of Mining, Chemical and Petroleum Engineering'),(6,2,2,'Department of Biological Science'),(7,2,2,'Department of Physics'),(8,2,2,'Department of Chemistry'),(9,2,2,'Department of Mathematics and Statistics'),(10,2,2,'Department of Food Science Technology'),(11,2,2,'Department of Sports Science'),(12,3,2,'Department of Agriculture Production'),(13,3,2,'Department of Soil Science and Irrigation Management'),(14,3,2,'Department of Agricultural Education and Agriculture Economics'),(15,3,2,'University Farm'),(16,4,2,'Department of Hearing Impairment and Sign Language Interpretation Studies'),(17,4,2,'Department of Visual Impairment Studies'),(18,4,2,'Department of Community and Disability Studies'),(19,4,2,'Department of Adult, Community and Life-Long Learning'),(20,4,2,'Department of Intellectual and Development Difficulties'),(21,5,2,'Department of Languages and Communication Studies'),(22,5,2,'Department of Religious Studies and Philosophy'),(23,5,2,'Department of Literature and Film Studies'),(24,5,2,'Department of Performing Arts'),(25,5,2,'Department of History, Archeology and Heritage'),(26,5,2,'Department of Geography'),(27,6,2,'Department of Economics'),(28,6,2,'Department of Development Studies'),(29,6,2,'Department of Political Science and Public Administration'),(30,6,2,'Department of Social Work and Social Administration'),(31,6,2,'Department of Sociology, Anthropology and Population Studies'),(32,6,2,'Department of Psychology'),(33,7,2,'Department of Foundations and Educational Psychology'),(34,7,2,'Department of Technical Teacher and Instructor Education'),(35,7,2,'Department of Teacher Education and Extension'),(36,7,2,'Department of Education Planning and Management'),(37,7,2,'Department of Early Childhood and Pre-Primary Education'),(38,7,2,'Department of Curriculum, Pedagogy and Educational Media'),(39,8,2,'Department of Fine Art'),(40,8,2,'Department of Industrial and Commercial Art'),(41,8,2,'Department of Visual Communication'),(42,9,2,'Department of Finance, Accounting and Micro-finance'),(43,9,2,'Department of Management and Administrative Sciences'),(44,9,2,'Department of Business Administration and Entrepreneurship'),(45,9,2,'Department of Procurement and Supply Chain Management'),(46,10,2,'Department of Quantity Surveying and Property Valuation'),(47,10,2,'Department of Architecture'),(48,10,2,'Department of Geo-informatics'),(49,11,2,'Department of Computer Science'),(50,11,2,'Department of Networks, Data Science and Artificial Intelligence'),(51,11,2,'Department of Library and Information Science'),(52,12,2,'Department of Family Life and Consumer Studies'),(53,12,2,'Department of Hotel and Institutional Catering'),(54,12,2,'Department of Cosmetology and Fashion'),(55,12,2,'Department of Nutritional Science and Dietetics'),(56,13,2,'Centre for Distance Education'),(57,13,2,'Centre for E-Learning'),(58,13,2,'Learning Centres'),(59,15,1,'Department of Medicine'),(60,15,1,'Department of Surgery'),(61,15,1,'Department of Obstetrics and Gynaecology'),(62,15,1,'Department of Paediatrics and Child Health'),(63,16,1,'Department of Epidemiology and Biostatistics'),(64,16,1,'Department of Community Health and Behavioral Sciences'),(65,16,1,'Department of Disease Control and Environmental Health'),(66,17,1,'Department of Human Anatomy'),(67,17,1,'Department of Physiology'),(68,18,1,'Department of Nursing'),(69,18,1,'Department of Pharmacy'),(70,19,1,'Department of Agricultural Production'),(71,20,1,'Department of Forestry, Bio-Resources and Tourism'),(72,20,1,'Department of Environmental Management'),(73,21,1,'Department of Food Technology and Human Nutrition'),(74,22,1,'Department of Civil and Environmental Engineering'),(75,22,1,'Department of Electrical and Computer Engineering'),(76,22,1,'Department of Mechanical Engineering'),(77,23,1,'Department of Architecture and Physical Planning'),(78,23,1,'Department of Construction Economics and Management'),(79,24,1,'Department of Fine Art'),(80,24,1,'Department of Visual Communication Design'),(81,25,1,'Department of Performing Arts and Film'),(82,25,1,'Department of Philosophy'),(83,26,1,'Department of Languages'),(84,26,1,'Department of Journalism and Communication'),(85,27,1,'Department of Sociology and Anthropology'),(86,27,1,'Department of Political Science and Public Administration'),(87,27,1,'Department of Social Work and Social Administration'),(88,28,1,'Department of Mental Health and Community Psychology'),(89,30,1,'Department of Economic Theory and Analysis'),(90,31,1,'Department of Accounting and Finance'),(91,31,1,'Department of Marketing and Management'),(92,32,1,'Department of Planning and Applied Statistics'),(93,33,1,'Department of Computer Science'),(94,33,1,'Department of Information Technology'),(95,33,1,'Department of Information Systems'),(96,34,1,'Department of Library and Information Science'),(97,34,1,'Department of Records and Archives Management'),(98,35,1,'Department of Humanities and Language Education'),(99,35,1,'Department of Science, Technical and Vocational Education'),(100,36,1,'Department of Adult and Community Education'),(101,38,1,'Department of Physics'),(102,38,1,'Department of Chemistry'),(103,38,1,'Department of Mathematics'),(104,39,1,'Department of Zoology, Entomology and Fisheries Sciences'),(105,39,1,'Department of Plant Sciences, Microbiology and Biotechnology'),(106,40,1,'Department of Veterinary Clinical Studies'),(107,41,1,'Department of Biosecurity, Ecosystems and Veterinary Public Health'),(108,42,1,'Department of Law and Jurisprudence'),(109,43,1,'Department of Gender and Development Studies');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `content_type` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `file_data` longblob NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `file_size` bigint NOT NULL,
  `original_file_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `upload_date` datetime(6) NOT NULL,
  `uploaded_by` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `audience` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company_id` bigint DEFAULT NULL,
  `description` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `download_count` bigint NOT NULL,
  `share_token` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `university_id` bigint DEFAULT NULL,
  `version` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKeuq559htdvehh1ohp56lfgr41` (`share_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evaluations`
--

DROP TABLE IF EXISTS `evaluations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `placement_id` bigint DEFAULT NULL,
  `supervisor_type` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `supervisor_username` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `punctuality` int NOT NULL,
  `practical_work_ethics` int NOT NULL,
  `attendance` int NOT NULL,
  `workplace_performance` int NOT NULL,
  `logbook_quality` int DEFAULT NULL,
  `academic_report` int DEFAULT NULL,
  `presentation` int DEFAULT NULL,
  `overall_grade` int DEFAULT NULL,
  `supervisor_user_id` bigint DEFAULT NULL,
  `university_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evaluations`
--

LOCK TABLES `evaluations` WRITE;
/*!40000 ALTER TABLE `evaluations` DISABLE KEYS */;
INSERT INTO `evaluations` VALUES (1,2,NULL,'COMPANY','john.doe@airtel.co.ug',8,7,9,7,NULL,NULL,NULL,NULL,NULL,NULL),(2,3,NULL,'COMPANY','john.doe@airtel.co.ug',9,8,9,8,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `evaluations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `industrial_supervisors`
--

DROP TABLE IF EXISTS `industrial_supervisors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `industrial_supervisors` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `department` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `job_title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `phone_number` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `industrial_supervisors`
--

LOCK TABLES `industrial_supervisors` WRITE;
/*!40000 ALTER TABLE `industrial_supervisors` DISABLE KEYS */;
INSERT INTO `industrial_supervisors` VALUES (1,1,'Technology','Grace','Network Operations Manager','Nabatanzi','+256700000002',5);
/*!40000 ALTER TABLE `industrial_supervisors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `internship_companies`
--

DROP TABLE IF EXISTS `internship_companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `internship_companies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `branch` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `country_id` int NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `physical_address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `postal_address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `university_id` bigint DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_person` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `internship_companies`
--

LOCK TABLES `internship_companies` WRITE;
/*!40000 ALTER TABLE `internship_companies` DISABLE KEYS */;
INSERT INTO `internship_companies` VALUES (1,'Kampala Head Office','Airtel Uganda',183,'2026-08-25 09:58:23.311888','hr@airtel.co.ug','Airtel House, Plot 4 Wampewo Avenue, Kampala','P.O. Box 7152, Kampala',19,'https://www.airtel.co.ug','Jane Doe','+256 752 175 175');
/*!40000 ALTER TABLE `internship_companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `body` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `link` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `read_flag` bit(1) NOT NULL,
  `recipient_user_id` bigint NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_recipient_read` (`recipient_user_id`,`read_flag`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,'kyu requested the ADMIN role.','2026-10-01 01:03:15.958211','/admin/role-requests',_binary '\0',6,'New role request','ROLE_REQUEST');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opportunity_attachments`
--

DROP TABLE IF EXISTS `opportunity_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opportunity_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `content_type` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `file_size` bigint NOT NULL,
  `original_file_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `storage_path` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `target_programme_ids` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `target_year_of_study` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `university_id` bigint DEFAULT NULL,
  `uploaded_at` datetime(6) NOT NULL,
  `uploaded_by` bigint NOT NULL,
  `vacancy_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_opportunity_attachments_vacancy` (`vacancy_id`),
  KEY `idx_opportunity_attachments_university` (`university_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opportunity_attachments`
--

LOCK TABLES `opportunity_attachments` WRITE;
/*!40000 ALTER TABLE `opportunity_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `opportunity_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opportunity_offers`
--

DROP TABLE IF EXISTS `opportunity_offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opportunity_offers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `offered_at` datetime(6) NOT NULL,
  `offered_by` bigint NOT NULL,
  `responded_at` datetime(6) DEFAULT NULL,
  `responded_by` bigint DEFAULT NULL,
  `response_note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('ACCEPTED','CLOSED','DECLINED','OFFERED','SHARED') COLLATE utf8mb4_general_ci NOT NULL,
  `university_id` bigint NOT NULL,
  `vacancy_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_opportunity_offers_vacancy_university` (`vacancy_id`,`university_id`),
  KEY `idx_opportunity_offers_university_status` (`university_id`,`status`),
  KEY `idx_opportunity_offers_vacancy` (`vacancy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opportunity_offers`
--

LOCK TABLES `opportunity_offers` WRITE;
/*!40000 ALTER TABLE `opportunity_offers` DISABLE KEYS */;
/*!40000 ALTER TABLE `opportunity_offers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opportunity_shares`
--

DROP TABLE IF EXISTS `opportunity_shares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opportunity_shares` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `closed_at` datetime(6) DEFAULT NULL,
  `closed_by` bigint DEFAULT NULL,
  `note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `offer_id` bigint DEFAULT NULL,
  `shared_at` datetime(6) NOT NULL,
  `shared_by` bigint NOT NULL,
  `status` enum('CLOSED','SHARED') COLLATE utf8mb4_general_ci NOT NULL,
  `target_department_ids` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `target_programme_ids` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `target_year_of_study` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `university_id` bigint NOT NULL,
  `vacancy_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_opportunity_shares_vacancy_university` (`vacancy_id`,`university_id`),
  KEY `idx_opportunity_shares_university_status` (`university_id`,`status`),
  KEY `idx_opportunity_shares_vacancy` (`vacancy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opportunity_shares`
--

LOCK TABLES `opportunity_shares` WRITE;
/*!40000 ALTER TABLE `opportunity_shares` DISABLE KEYS */;
/*!40000 ALTER TABLE `opportunity_shares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opportunity_status_history`
--

DROP TABLE IF EXISTS `opportunity_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opportunity_status_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `changed_at` datetime(6) NOT NULL,
  `changed_by` bigint NOT NULL,
  `from_status` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `relay_type` varchar(16) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `to_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `university_id` bigint DEFAULT NULL,
  `vacancy_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_opportunity_status_history_vacancy_time` (`vacancy_id`,`changed_at`),
  KEY `idx_opportunity_status_history_university` (`university_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opportunity_status_history`
--

LOCK TABLES `opportunity_status_history` WRITE;
/*!40000 ALTER TABLE `opportunity_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `opportunity_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opportunity_submissions`
--

DROP TABLE IF EXISTS `opportunity_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opportunity_submissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `review_note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `reviewed_by` bigint DEFAULT NULL,
  `status` enum('APPROVED','PENDING','REJECTED') COLLATE utf8mb4_general_ci NOT NULL,
  `submitted_at` datetime(6) NOT NULL,
  `submitted_by` bigint NOT NULL,
  `university_id` bigint NOT NULL,
  `vacancy_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_opportunity_submissions_vacancy` (`vacancy_id`),
  KEY `idx_opportunity_submissions_university_status` (`university_id`,`status`),
  KEY `idx_opportunity_submissions_submitter` (`submitted_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opportunity_submissions`
--

LOCK TABLES `opportunity_submissions` WRITE;
/*!40000 ALTER TABLE `opportunity_submissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `opportunity_submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `placement_status_history`
--

DROP TABLE IF EXISTS `placement_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `placement_status_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `changed_at` datetime(6) NOT NULL,
  `changed_by` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `from_status` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `placement_id` bigint NOT NULL,
  `to_status` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `placement_status_history`
--

LOCK TABLES `placement_status_history` WRITE;
/*!40000 ALTER TABLE `placement_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `placement_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `placements`
--

DROP TABLE IF EXISTS `placements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `placements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `university_supervisor` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `company_supervisor` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('PENDING','ASSIGNED','ACTIVE','COMPLETED','CANCELLED') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'PENDING',
  `company_supervisor_id` bigint DEFAULT NULL,
  `university_supervisor_id` bigint DEFAULT NULL,
  `university_id` bigint DEFAULT NULL,
  `assigned_at` datetime(6) DEFAULT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `offered_at` datetime(6) DEFAULT NULL,
  `started_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `placements`
--

LOCK TABLES `placements` WRITE;
/*!40000 ALTER TABLE `placements` DISABLE KEYS */;
INSERT INTO `placements` VALUES (1,1,1,'university','Nangai Zackaria','ACTIVE',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(2,2,1,'university','John Doe','ACTIVE',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3,3,1,'university','John Doe','ACTIVE',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `placements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `programmes`
--

DROP TABLE IF EXISTS `programmes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `programmes` (
  `department_id` int DEFAULT NULL,
  `duration_years` int NOT NULL,
  `programme_id` int NOT NULL,
  `school_id` int NOT NULL,
  `university_id` int NOT NULL,
  `programme_code` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `programme_level` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `programme_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`programme_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `programmes`
--

LOCK TABLES `programmes` WRITE;
/*!40000 ALTER TABLE `programmes` DISABLE KEYS */;
INSERT INTO `programmes` VALUES (1,4,1,1,2,'CIV_KYU','Bachelor','Bachelor of Science in Civil Engineering'),(1,4,2,1,2,'ENV_KYU','Bachelor','Bachelor of Science in Environmental Engineering'),(1,2,3,1,2,'DCIV_KYU','Diploma','Diploma in Civil Engineering'),(2,4,4,1,2,'MEC_KYU','Bachelor','Bachelor of Science in Mechanical Engineering'),(2,4,5,1,2,'AUT_KYU','Bachelor','Bachelor of Science in Automotive Engineering'),(2,2,6,1,2,'DMEC_KYU','Diploma','Diploma in Mechanical Engineering'),(3,4,7,1,2,'ELE_KYU','Bachelor','Bachelor of Science in Electrical Engineering'),(3,4,8,1,2,'TEL_KYU','Bachelor','Bachelor of Science in Telecommunications Engineering'),(3,2,9,1,2,'DELE_KYU','Diploma','Diploma in Electrical Engineering'),(4,4,10,1,2,'BIO_KYU','Bachelor','Bachelor of Science in Biomedical Engineering'),(4,4,11,1,2,'MCH_KYU','Bachelor','Bachelor of Science in Mechatronics Engineering'),(5,4,12,1,2,'PET_KYU','Bachelor','Bachelor of Science in Petroleum Engineering'),(5,4,13,1,2,'CHE_KYU','Bachelor','Bachelor of Science in Chemical Engineering'),(6,3,14,2,2,'BIO_SCI','Bachelor','Bachelor of Science in Biological Sciences'),(6,3,15,2,2,'BOT_ZOO','Bachelor','Bachelor of Science in Botany and Zoology'),(7,3,16,2,2,'PHY_KYU','Bachelor','Bachelor of Science in Physics'),(8,3,17,2,2,'IND_CHEM','Bachelor','Bachelor of Science in Industrial Chemistry'),(8,3,18,2,2,'CHEM_KYU','Bachelor','Bachelor of Science in Chemistry'),(9,3,19,2,2,'STAT_KYU','Bachelor','Bachelor of Science in Statistics'),(9,3,20,2,2,'MATH_KYU','Bachelor','Bachelor of Science in Mathematics'),(10,4,21,2,2,'FST_KYU','Bachelor','Bachelor of Science in Food Science and Technology'),(11,3,22,2,2,'SPO_KYU','Bachelor','Bachelor of Sports Science'),(12,4,23,3,2,'AGR_KYU','Bachelor','Bachelor of Science in Agriculture'),(13,3,24,3,2,'SOI_KYU','Bachelor','Bachelor of Science in Soil and Water Conservation'),(14,3,25,3,2,'AGEC_KYU','Bachelor','Bachelor of Agricultural Economics and Agribusiness'),(14,3,26,3,2,'AGED_KYU','Bachelor','Bachelor of Science in Agricultural Education'),(16,3,27,4,2,'BSL_KYU','Bachelor','Bachelor of Sign Language Interpreting'),(18,3,28,4,2,'CBR_KYU','Bachelor','Bachelor of Community Based Rehabilitation'),(21,3,29,5,2,'BAA_KYU','Bachelor','Bachelor of Arts in Arts'),(24,3,30,5,2,'PER_KYU','Bachelor','Bachelor of Performing Arts'),(27,3,31,6,2,'ECO_KYU','Bachelor','Bachelor of Arts in Economics'),(28,3,32,6,2,'DEV_KYU','Bachelor','Bachelor of Development Studies'),(30,3,33,6,2,'SWSA_KYU','Bachelor','Bachelor of Social Work and Social Administration'),(35,3,34,7,2,'BED_KYU','Bachelor','Bachelor of Education'),(35,2,35,7,2,'DES_KYU','Diploma','Diploma in Education Secondary'),(39,3,36,8,2,'BID_KYU','Bachelor','Bachelor of Industrial and Fine Arts'),(42,3,37,9,2,'AF_KYU','Bachelor','Bachelor of Science in Accounting and Finance'),(44,3,38,9,2,'BBA_KYU','Bachelor','Bachelor of Business Administration'),(44,3,39,9,2,'ENT_KYU','Bachelor','Bachelor of Entrepreneurship and Small Business Management'),(45,3,40,9,2,'PSM_KYU','Bachelor','Bachelor of Procurement and Supply Chain Management'),(47,5,41,10,2,'ARCH_KYU','Bachelor','Bachelor of Architecture'),(46,4,42,10,2,'QS_KYU','Bachelor','Bachelor of Science in Quantity Surveying'),(46,4,43,10,2,'LEM_KYU','Bachelor','Bachelor of Science in Land Economics'),(49,3,44,11,2,'BIT_KYU','Bachelor','Bachelor of Information Technology'),(49,3,45,11,2,'CSC_KYU','Bachelor','Bachelor of Science in Computer Science'),(50,3,46,11,2,'BIS_KYU','Bachelor','Bachelor of Information Systems'),(50,3,47,11,2,'DSE_KYU','Bachelor','Bachelor of Data Science and Analytics'),(51,3,48,11,2,'BLIS_KYU','Bachelor','Bachelor of Library and Information Science'),(51,3,49,11,2,'RAM_KYU','Bachelor','Bachelor of Records and Archives Management'),(53,3,50,12,2,'HIC_KYU','Bachelor','Bachelor of Hotel and Institutional Catering'),(54,3,51,12,2,'FAD_KYU','Bachelor','Bachelor of Fashion and Design'),(1,1,52,1,2,'CCIV_KYU','Certificate','Certificate in Civil Engineering'),(2,1,53,1,2,'CMEC_KYU','Certificate','Certificate in Mechanical Engineering'),(2,1,54,1,2,'CAUT_KYU','Certificate','Certificate in Automotive Mechanics'),(3,1,55,1,2,'CELE_KYU','Certificate','Certificate in Electrical Installation and Maintenance'),(4,2,56,1,2,'DBME_KYU','Diploma','Diploma in Biomedical Engineering'),(6,2,57,2,2,'DBIO_KYU','Diploma','Diploma in Biological Sciences'),(8,2,58,2,2,'DIC_KYU','Diploma','Diploma in Industrial Chemistry'),(8,2,59,2,2,'SLT_KYU','Diploma','Diploma in Science Laboratory Technology'),(8,1,60,2,2,'CSLT_KYU','Certificate','Certificate in Science Laboratory Technology'),(9,2,61,2,2,'DSTA_KYU','Diploma','Diploma in Statistics'),(10,2,62,2,2,'DFST_KYU','Diploma','Diploma in Food Processing Technology'),(11,2,63,2,2,'DSP_KYU','Diploma','Diploma in Sports Science'),(11,1,64,2,2,'CSP_KYU','Certificate','Certificate in Sports Coaching'),(12,2,65,3,2,'DAGR_KYU','Diploma','Diploma in Agriculture'),(12,1,66,3,2,'CAGR_KYU','Certificate','Certificate in Agriculture'),(14,2,67,3,2,'DAGB_KYU','Diploma','Diploma in Agribusiness Enterprise Management'),(16,2,68,4,2,'DSLI_KYU','Diploma','Diploma in Sign Language Interpreting'),(16,1,69,4,2,'CSLI_KYU','Certificate','Certificate in Basic Sign Language'),(17,2,70,4,2,'DVI_KYU','Diploma','Diploma in Visual Impairment Studies'),(18,2,71,4,2,'DCBR_KYU','Diploma','Diploma in Community Based Rehabilitation'),(21,2,72,5,2,'DFRE_KYU','Diploma','Diploma in French Language Studies'),(21,1,73,5,2,'CFRE_KYU','Certificate','Certificate in French Language Studies'),(24,2,74,5,2,'DPA_KYU','Diploma','Diploma in Music, Dance and Drama'),(30,2,75,6,2,'DSWSA_KYU','Diploma','Diploma in Social Work and Social Administration'),(28,2,76,6,2,'DDS_KYU','Diploma','Diploma in Development Studies'),(37,2,77,7,2,'DECE_KYU','Diploma','Diploma in Early Childhood Education'),(37,1,78,7,2,'CECE_KYU','Certificate','Certificate in Early Childhood Development'),(34,2,79,7,2,'DTE_KYU','Diploma','Diploma in Technical Teacher Education'),(39,2,80,8,2,'DFA_KYU','Diploma','Diploma in Industrial Art and Design'),(39,1,81,8,2,'CFA_KYU','Certificate','Certificate in Fine Art'),(42,2,82,9,2,'DAF_KYU','Diploma','Diploma in Accounting and Finance'),(44,2,83,9,2,'DBA_KYU','Diploma','Diploma in Business Administration'),(45,2,84,9,2,'DPSM_KYU','Diploma','Diploma in Procurement and Supply Chain Management'),(48,2,85,10,2,'DGIS_KYU','Diploma','Diploma in Geoinformatics'),(49,2,86,11,2,'DIT_KYU','Diploma','Diploma in Information Technology'),(49,1,87,11,2,'CIT_KYU','Certificate','Certificate in Information Technology'),(50,2,88,11,2,'DIS_KYU','Diploma','Diploma in Information Systems'),(51,2,89,11,2,'DLIS_KYU','Diploma','Diploma in Library and Information Science'),(51,2,90,11,2,'DRAM_KYU','Diploma','Diploma in Records and Archives Management'),(51,1,91,11,2,'CRAM_KYU','Certificate','Certificate in Records and Archives Management'),(53,2,92,12,2,'DHIC_KYU','Diploma','Diploma in Hotel and Institutional Catering'),(54,2,93,12,2,'DFAD_KYU','Diploma','Diploma in Fashion Design and Garment Making'),(54,1,94,12,2,'CFAD_KYU','Certificate','Certificate in Garment Making and Fashion'),(52,2,95,12,2,'DFCS_KYU','Diploma','Diploma in Home Economics and Consumer Studies'),(1,2,96,1,2,'MSC_CIV','Master','Master of Science in Civil Engineering'),(1,3,97,1,2,'PHD_CIV','PhD','Doctor of Philosophy in Civil Engineering'),(3,2,98,1,2,'MSC_ELE','Master','Master of Science in Electrical Engineering'),(2,2,99,1,2,'MSC_MEC','Master','Master of Science in Advanced Manufacturing Engineering'),(6,2,100,2,2,'MSC_BIO','Master','Master of Science in Conservation Biology'),(6,3,101,2,2,'PHD_BIO','PhD','Doctor of Philosophy in Biological Sciences'),(8,2,102,2,2,'MSC_CHE','Master','Master of Science in Chemistry'),(7,2,103,2,2,'MSC_PHY','Master','Master of Science in Physics'),(9,2,104,2,2,'MSC_MATH','Master','Master of Science in Mathematics'),(9,2,105,2,2,'MSC_STAT','Master','Master of Science in Statistics'),(12,2,106,3,2,'MSC_AGR','Master','Master of Science in Crop Science'),(12,3,107,3,2,'PHD_AGR','PhD','Doctor of Philosophy in Agriculture'),(18,2,108,4,2,'MA_SNE','Master','Master of Arts in Special Needs Education'),(18,2,109,4,2,'MSC_CBR','Master','Master of Science in Community Based Rehabilitation'),(18,3,110,4,2,'PHD_SNE','PhD','Doctor of Philosophy in Special Needs Education'),(25,2,111,5,2,'MA_HIS','Master','Master of Arts in History'),(21,2,112,5,2,'MA_LING','Master','Master of Arts in Linguistics'),(21,2,113,5,2,'MA_LIT','Master','Master of Arts in Literature'),(27,2,114,6,2,'MA_ECO','Master','Master of Arts in Economics'),(28,2,115,6,2,'MA_DEV','Master','Master of Development Studies'),(29,2,116,6,2,'MPA_KYU','Master','Master of Public Administration'),(36,2,117,7,2,'MED_EPM','Master','Master of Education in Educational Policy and Planning'),(36,3,118,7,2,'PHD_EDU','PhD','Doctor of Philosophy in Education'),(33,2,119,7,2,'MED_PSY','Master','Master of Educational Psychology'),(39,2,120,8,2,'MA_FA','Master','Master of Art and Industrial Design'),(44,2,121,9,2,'MBA_KYU','Master','Master of Business Administration'),(44,3,122,9,2,'PHD_BA','PhD','Doctor of Philosophy in Business Administration'),(42,2,123,9,2,'MSC_AF','Master','Master of Science in Accounting and Finance'),(45,2,124,9,2,'MSC_SCM','Master','Master of Science in Procurement and Supply Chain Management'),(47,2,125,10,2,'MARCH','Master','Master of Architecture'),(49,2,126,11,2,'MSC_CS','Master','Master of Science in Computer Science'),(50,2,127,11,2,'MSC_IS','Master','Master of Science in Information Systems'),(50,3,128,11,2,'PHD_CIS','PhD','Doctor of Philosophy in Computing'),(51,2,129,11,2,'MLIS_KYU','Master','Master of Library and Information Science'),(55,2,130,12,2,'MSC_HUN','Master','Master of Science in Human Nutrition'),(53,2,131,12,2,'MSC_HTM','Master','Master of Science in Hospitality and Tourism Management'),(59,5,132,15,1,'MBCHB_MAK','Bachelor','Bachelor of Medicine and Bachelor of Surgery'),(59,3,133,15,1,'MMED_INT','Master','Master of Medicine in Internal Medicine'),(59,3,134,15,1,'PHD_MED_MAK','PhD','Doctor of Philosophy in Medicine'),(60,3,135,15,1,'MMED_SURG','Master','Master of Medicine in General Surgery'),(60,3,136,15,1,'MMED_ORTH','Master','Master of Medicine in Orthopaedic Surgery'),(61,3,137,15,1,'MMED_OBS','Master','Master of Medicine in Obstetrics and Gynaecology'),(62,3,138,15,1,'MMED_PAED','Master','Master of Medicine in Paediatrics and Child Health'),(63,3,139,16,1,'BPH_MAK','Bachelor','Bachelor of Environmental Health Science'),(63,2,140,16,1,'MPH_MAK','Master','Master of Public Health'),(63,2,141,16,1,'MSC_EPI','Master','Master of Science in Epidemiology and Biostatistics'),(63,3,142,16,1,'PHD_PUB_MAK','PhD','Doctor of Philosophy in Public Health'),(66,3,143,17,1,'BSB_MAK','Bachelor','Bachelor of Science in Biomedical Sciences'),(66,2,144,17,1,'MSC_ANAT','Master','Master of Science in Human Anatomy'),(68,4,145,18,1,'BSN_MAK','Bachelor','Bachelor of Science in Nursing'),(68,2,146,18,1,'MSN_MAK','Master','Master of Nursing Science'),(69,4,147,18,1,'PHA_MAK','Bachelor','Bachelor of Pharmacy'),(69,2,148,18,1,'MPHARM_MAK','Master','Master of Pharmacy'),(69,5,149,18,1,'BDS_MAK','Bachelor','Bachelor of Dental Surgery'),(70,4,150,19,1,'AGR_MAK','Bachelor','Bachelor of Science in Agriculture'),(70,3,151,19,1,'AGB_MAK','Bachelor','Bachelor of Agribusiness Management'),(70,2,152,19,1,'DAGR_MAK','Diploma','Diploma in Agriculture'),(70,2,153,19,1,'MSC_AGR_MAK','Master','Master of Science in Crop Science'),(70,3,154,19,1,'PHD_AGR_MAK','PhD','Doctor of Philosophy in Agricultural Sciences'),(71,4,155,20,1,'FOR_MAK','Bachelor','Bachelor of Science in Forestry'),(71,3,156,20,1,'BTM_MAK','Bachelor','Bachelor of Tourism and Hospitality Management'),(71,2,157,20,1,'MSC_FOR','Master','Master of Science in Forestry'),(72,3,158,20,1,'ENV_MAK','Bachelor','Bachelor of Environmental Science'),(72,2,159,20,1,'MENV_MAK','Master','Master of Environment and Natural Resources'),(73,4,160,21,1,'FST_MAK','Bachelor','Bachelor of Science in Food Science and Technology'),(73,3,161,21,1,'HUN_MAK','Bachelor','Bachelor of Science in Human Nutrition'),(73,2,162,21,1,'MSC_FST_MAK','Master','Master of Science in Food Science and Technology'),(74,4,163,22,1,'CIV_MAK','Bachelor','Bachelor of Science in Civil Engineering'),(74,2,164,22,1,'MSC_CIV_MAK','Master','Master of Science in Civil Engineering'),(74,3,165,22,1,'PHD_ENG_MAK','PhD','Doctor of Philosophy in Engineering'),(75,4,166,22,1,'ELE_MAK','Bachelor','Bachelor of Science in Electrical Engineering'),(75,4,167,22,1,'STE_MAK','Bachelor','Bachelor of Science in Telecommunication Engineering'),(75,2,168,22,1,'MSC_ELE_MAK','Master','Master of Science in Electrical Engineering'),(76,4,169,22,1,'MEC_MAK','Bachelor','Bachelor of Science in Mechanical Engineering'),(76,2,170,22,1,'MSC_MEC_MAK','Master','Master of Science in Mechanical Engineering'),(77,5,171,23,1,'ARC_MAK','Bachelor','Bachelor of Architecture'),(77,4,172,23,1,'BUP_MAK','Bachelor','Bachelor of Urban and Regional Planning'),(78,4,173,23,1,'SQS_MAK','Bachelor','Bachelor of Science in Quantity Surveying'),(78,4,174,23,1,'SLE_MAK','Bachelor','Bachelor of Science in Land Economics'),(78,4,175,23,1,'SCM_MAK','Bachelor','Bachelor of Science in Construction Management'),(79,3,176,24,1,'BFA_MAK','Bachelor','Bachelor of Industrial and Fine Arts'),(79,2,177,24,1,'DFA_MAK','Diploma','Diploma in Fine Art'),(79,2,178,24,1,'MIFA_MAK','Master','Master of Industrial and Fine Arts'),(81,3,179,25,1,'BPA_MAK','Bachelor','Bachelor of Performing Arts'),(81,2,180,25,1,'DMDD_MAK','Diploma','Diploma in Music, Dance and Drama'),(84,4,181,26,1,'BJC_MAK','Bachelor','Bachelor of Journalism and Communication'),(84,2,182,26,1,'MJC_MAK','Master','Master of Arts in Journalism and Communication'),(83,3,183,26,1,'BAA_MAK','Bachelor','Bachelor of Arts in Arts'),(83,1,184,26,1,'CFRE_MAK','Certificate','Certificate in French'),(87,3,185,27,1,'SOC_MAK','Bachelor','Bachelor of Social Work and Social Administration'),(87,2,186,27,1,'MSW_MAK','Master','Master of Social Work'),(86,3,187,27,1,'BAP_MAK','Bachelor','Bachelor of Governance and International Relations'),(86,2,188,27,1,'MAPA_MAK','Master','Master of Public Administration'),(88,3,189,28,1,'BCO_MAK','Bachelor','Bachelor of Community Psychology'),(88,3,190,28,1,'BIP_MAK','Bachelor','Bachelor of Industrial and Organisational Psychology'),(88,2,191,28,1,'MIP_MAK','Master','Master of Organizational Psychology'),(88,3,192,28,1,'PHD_PSY_MAK','PhD','Doctor of Philosophy in Psychology'),(89,3,193,30,1,'ECO_MAK','Bachelor','Bachelor of Arts in Economics'),(89,3,194,30,1,'BSE_MAK','Bachelor','Bachelor of Science in Economics'),(89,2,195,30,1,'MA_ECO_MAK','Master','Master of Arts in Economics'),(89,3,196,30,1,'PHD_ECO_MAK','PhD','Doctor of Philosophy in Economics'),(90,3,197,31,1,'BBA_MAK','Bachelor','Bachelor of Business Administration'),(90,2,198,31,1,'DBA_MAK','Diploma','Diploma in Business Administration'),(90,2,199,31,1,'MBA_MAK','Master','Master of Business Administration'),(91,3,200,31,1,'BIB_MAK','Bachelor','Bachelor of International Business'),(91,3,201,31,1,'MKT_MAK','Bachelor','Bachelor of Commerce'),(92,3,202,32,1,'STA_MAK','Bachelor','Bachelor of Statistics'),(92,3,203,32,1,'BQE_MAK','Bachelor','Bachelor of Science in Quantitative Economics'),(92,2,204,32,1,'DSTA_MAK','Diploma','Diploma in Statistics'),(92,2,205,32,1,'MSTA_MAK','Master','Master of Science in Statistics'),(93,3,206,33,1,'CSC_MAK','Bachelor','Bachelor of Science in Computer Science'),(93,3,207,33,1,'BIT_MAK','Bachelor','Bachelor of Information Technology'),(93,1,208,33,1,'CIT_MAK','Certificate','Certificate in Information Technology'),(93,2,209,33,1,'MSC_CS_MAK','Master','Master of Science in Computer Science'),(93,3,210,33,1,'PHD_COMP_MAK','PhD','Doctor of Philosophy in Computer Science'),(95,3,211,33,1,'BIS_MAK','Bachelor','Bachelor of Science in Information Systems'),(95,2,212,33,1,'DIS_MAK','Diploma','Diploma in Information Systems'),(95,2,213,33,1,'MSC_IS_MAK','Master','Master of Science in Information Systems'),(96,3,214,34,1,'LIS_MAK','Bachelor','Bachelor of Library and Information Science'),(96,2,215,34,1,'DLIS_MAK','Diploma','Diploma in Library and Information Studies'),(96,2,216,34,1,'MLIS_MAK','Master','Master of Library and Information Science'),(97,3,217,34,1,'RAM_MAK','Bachelor','Bachelor of Records and Archives Management'),(97,2,218,34,1,'DRAM_MAK','Diploma','Diploma in Records and Archives Management'),(98,3,219,35,1,'EDA_MAK','Bachelor','Bachelor of Arts with Education'),(98,3,220,35,1,'EDSC_MAK','Bachelor','Bachelor of Science with Education'),(98,2,221,35,1,'MED_MAK','Master','Master of Education'),(98,3,222,35,1,'PHD_EDU_MAK','PhD','Doctor of Philosophy in Education'),(100,3,223,36,1,'BAC_MAK','Bachelor','Bachelor of Adult and Community Education'),(100,2,224,36,1,'DACE_MAK','Diploma','Diploma in Adult Education'),(100,1,225,36,1,'CACE_MAK','Certificate','Certificate in Adult Education'),(101,3,226,38,1,'SCP_MAK','Bachelor','Bachelor of Science in Physics'),(101,2,227,38,1,'MSC_PHY_MAK','Master','Master of Science in Physics'),(102,3,228,38,1,'BIC_MAK','Bachelor','Bachelor of Science in Industrial Chemistry'),(102,2,229,38,1,'MSC_CHE_MAK','Master','Master of Science in Chemistry'),(103,3,230,38,1,'MAP_MAK','Bachelor','Bachelor of Science in Mathematics'),(103,2,231,38,1,'MSC_MATH_MAK','Master','Master of Science in Mathematics'),(103,3,232,38,1,'PHD_SCI_MAK','PhD','Doctor of Philosophy in Science'),(104,3,233,39,1,'SCB_MAK','Bachelor','Bachelor of Science in Biological Sciences'),(104,2,234,39,1,'MSC_ZOO_MAK','Master','Master of Science in Zoology'),(106,5,235,40,1,'VET_MAK','Bachelor','Bachelor of Veterinary Medicine'),(106,2,236,40,1,'MVAM_MAK','Master','Master of Veterinary Medicine'),(106,3,237,40,1,'PHD_VET_MAK','PhD','Doctor of Philosophy in Veterinary Medicine'),(107,3,238,41,1,'BLT_MAK','Bachelor','Bachelor of Industrial Livestock and Business'),(107,2,239,41,1,'DLT_MAK','Diploma','Diploma in Livestock Technology'),(108,4,240,42,1,'LAW_MAK','Bachelor','Bachelor of Laws'),(108,2,241,42,1,'LLM_MAK','Master','Master of Laws'),(108,3,242,42,1,'PHD_LAW_MAK','PhD','Doctor of Philosophy in Law'),(109,3,243,43,1,'BGD_MAK','Bachelor','Bachelor of Gender and Development Studies'),(109,2,244,43,1,'MGD_MAK','Master','Master of Arts in Gender Studies'),(109,3,245,43,1,'PHD_GND_MAK','PhD','Doctor of Philosophy in Gender Studies'),(NULL,2,2001,901,19,'NK-P001','Masters','Master Of Education Management And Planning'),(NULL,1,2002,901,19,'NK-P002','Certificate','Ordinary Certificate in Early Childhood Care & Development Education'),(NULL,2,2003,901,19,'NK-P003','Diploma','Diploma In Education In Early Childhood Care And Development'),(NULL,2,2004,901,19,'NK-P004','Diploma','Diploma In Education (Secondary) - Science'),(NULL,2,2005,901,19,'NK-P005','Diploma','Diploma In Education (Secondary) - Arts'),(NULL,3,2006,901,19,'NK-P006','Bachelors','Bachelor Of Education (Primary)'),(NULL,3,2007,901,19,'NK-P007','Bachelors','Bachelor Of Science With Education (Secondary)'),(NULL,3,2008,901,19,'NK-P008','Bachelors','Bachelor Of Arts With Education (Secondary)'),(NULL,1,2009,901,19,'NK-P009','PGD','Postgraduate Diploma In Education'),(NULL,1,2010,901,19,'NK-P010','PGD','Post Graduate Diploma In Educational Management And Planning'),(NULL,3,2011,901,19,'NK-P011','PhD','PhD in Education Management'),(NULL,2,2012,902,19,'NK-P012','Masters','Masters Of Science In Information Systems'),(NULL,0,2013,902,19,'NK-P013','Certificate','Certificate in Computerised Accounting'),(NULL,0,2014,902,19,'NK-P014','Short Course','Data Management and Analysis'),(NULL,0,2015,902,19,'NK-P015','Certificate','Certificate in Computer Networking'),(NULL,2,2016,902,19,'NK-P016','Certificate','National Certificate in Information Communication Technology'),(NULL,2,2017,902,19,'NK-P017','Diploma','Diploma in Information Systems and Technology'),(NULL,3,2018,902,19,'NK-P018','Bachelors','Bachelors of Science in Cybersecurity and Digital Forensics'),(NULL,3,2019,902,19,'NK-P019','Bachelors','Bachelors in Information Systems and Technology'),(NULL,2,2020,902,19,'NK-P020','Masters','Masters in Information Systems and Technology'),(NULL,1,2021,902,19,'NK-P021','Certificate','Certificate In Python Programming'),(NULL,0,2022,902,19,'NK-P022','Certificate','Certificate in Graphics and Image Editing'),(NULL,2,2023,902,19,'NK-P023','Diploma','Diploma In Records And Information Management'),(NULL,2,2024,902,19,'NK-P024','Diploma','Diploma In Computer Science'),(NULL,3,2025,902,19,'NK-P025','Bachelors','Bachelors Of Records And Information Management'),(NULL,3,2026,902,19,'NK-P026','Bachelors','Bachelor Of Office Management And Secretarial Studies'),(NULL,3,2027,902,19,'NK-P027','Bachelors','Bachelor Of Science In Computer Science (BSC)'),(NULL,0,2028,902,19,'NK-P028','Short Course','Microsoft Office & Online Collaboration'),(NULL,3,2029,903,19,'NK-P029','Bachelors','Bachelor of Criminal Justice (BCJ)'),(NULL,2,2030,903,19,'NK-P030','Diploma','Diploma in Criminal Justice'),(NULL,4,2031,903,19,'NK-P031','Bachelors','Bachelor of Laws'),(NULL,3,2032,904,19,'NK-P032','Bachelors','Bachelor Of Arts In Community Based Development'),(NULL,3,2033,904,19,'NK-P033','Bachelors','Bachelor Of Arts In Social Work And Social Administration'),(NULL,3,2034,904,19,'NK-P034','Bachelors','Bachelor Of Science in Journalism & Public Relations'),(NULL,3,2035,904,19,'NK-P035','PhD','PhD in Counselling Psychology'),(NULL,3,2036,904,19,'NK-P036','PhD','PhD in Public Administration and Management'),(NULL,3,2037,905,19,'NK-P037','Bachelors','Bachelor Of Science In Environment Management'),(NULL,3,2038,905,19,'NK-P038','PhD','PhD in Natural Resources Management'),(NULL,3,2039,905,19,'NK-P039','Bachelors','Bachelor of Science in Public Health'),(NULL,2,2040,905,19,'NK-P040','Diploma','Diploma In Hotel Management And Institutional Catering'),(NULL,2,2041,905,19,'NK-P041','Diploma','Diploma In Tourism Operations Management'),(NULL,3,2042,905,19,'NK-P042','Bachelors','Bachelor Of Science In Hotel Management And Institutional Catering'),(NULL,3,2043,905,19,'NK-P043','Bachelors','Bachelor Of Science In Tourism Operations Management'),(NULL,2,2044,905,19,'NK-P044','Diploma','Diploma In Agribusiness'),(NULL,3,2045,905,19,'NK-P045','Bachelors','Bachelor Of Science In Wildlife And Forestry Management'),(NULL,3,2046,905,19,'NK-P046','PhD','PhD in Public Health'),(NULL,3,2047,906,19,'NK-P047','Bachelors','Bachelor of Business Administration'),(NULL,3,2048,906,19,'NK-P048','Bachelors','Bachelor Of Procurement And Logistics Management'),(NULL,3,2049,906,19,'NK-P049','Bachelors','Bachelor Of Clearing And Forwarding Management'),(NULL,3,2050,906,19,'NK-P050','Bachelors','Bachelor Of Human Resource Management'),(NULL,2,2051,906,19,'NK-P051','Masters','Master Of Procurement And Logistics Management'),(NULL,2,2052,906,19,'NK-P052','Masters','Master Of Science In Human Resource Management'),(NULL,2,2053,906,19,'NK-P053','Masters','Master Of Business Administration'),(NULL,3,2054,906,19,'NK-P054','PhD','PhD in Business Administration'),(NULL,3,2055,907,19,'NK-P055','Bachelors','Bachelor of Fashion and Textiles Design'),(NULL,3,2056,907,19,'NK-P056','Bachelors','Bachelor Of Commercial Art'),(NULL,2,2057,907,19,'NK-P057','Diploma','Diploma In Graphic Digital Design'),(NULL,2,2058,907,19,'NK-P058','Diploma','Diploma In Vocational Arts/Crafts And Design Studies'),(NULL,3,2059,907,19,'NK-P059','PhD','PhD in Art and Design'),(NULL,3,2060,908,19,'NK-P060','PhD','Ph.D In Computing'),(NULL,3,2061,908,19,'NK-P061','PhD','PhD in Development Studies'),(NULL,2,2062,908,19,'NK-P062','Masters','Masters in Taxation Management');
/*!40000 ALTER TABLE `programmes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_requests`
--

DROP TABLE IF EXISTS `role_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `context_company_name` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `context_university_id` bigint DEFAULT NULL,
  `requested_at` datetime(6) NOT NULL,
  `requested_role` varchar(16) COLLATE utf8mb4_general_ci NOT NULL,
  `review_comment` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `reviewed_by` bigint DEFAULT NULL,
  `status` varchar(16) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_role_requests_user` (`user_id`),
  KEY `idx_role_requests_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_requests`
--

LOCK TABLES `role_requests` WRITE;
/*!40000 ALTER TABLE `role_requests` DISABLE KEYS */;
INSERT INTO `role_requests` VALUES (1,NULL,NULL,'2026-10-01 01:03:15.708445','ADMIN',NULL,NULL,NULL,'PENDING',7);
/*!40000 ALTER TABLE `role_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Student pursuing internship','ROLE_STUDENT'),(2,'Academic supervisor from university','ROLE_UNI_SUPERVISOR'),(3,'Industry supervisor at host company','ROLE_IND_SUPERVISOR'),(4,'System administrator','ROLE_ADMIN');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schools`
--

DROP TABLE IF EXISTS `schools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schools` (
  `parent_school_id` int DEFAULT NULL,
  `school_id` int NOT NULL,
  `university_id` int NOT NULL,
  `school_code` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `school_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schools`
--

LOCK TABLES `schools` WRITE;
/*!40000 ALTER TABLE `schools` DISABLE KEYS */;
INSERT INTO `schools` VALUES (NULL,1,2,'FOENG','Faculty of Engineering','SCHOOL'),(NULL,2,2,'FOSCI','Faculty of Science','SCHOOL'),(NULL,3,2,'FOAGR','Faculty of Agriculture','SCHOOL'),(NULL,4,2,'FSNR','Faculty of Special Needs & Rehabilitation','SCHOOL'),(NULL,5,2,'FAH','Faculty of Arts and Humanities','SCHOOL'),(NULL,6,2,'FSS','Faculty of Social Sciences','SCHOOL'),(NULL,7,2,'SOE','School of Education','SCHOOL'),(NULL,8,2,'SAID','School of Art and Industrial Design','SCHOOL'),(NULL,9,2,'SOME','School of Management & Entrepreneurship','SCHOOL'),(NULL,10,2,'SOFBE','School of Built Environment','SCHOOL'),(NULL,11,2,'SCIS','School of Computing and Information Science','SCHOOL'),(NULL,12,2,'SOVS','School of Vocational Studies','SCHOOL'),(NULL,13,2,'IDAEL','Institute of Distance Education, E-Learning & Learning Centres','SCHOOL'),(NULL,14,2,'DRGT','Directorate of Research & Graduate Training','SCHOOL'),(NULL,15,1,'SOM','School of Medicine','SCHOOL'),(NULL,16,1,'SOPH','School of Public Health','SCHOOL'),(NULL,17,1,'SOBS','School of Biomedical Sciences','SCHOOL'),(NULL,18,1,'SOHS','School of Health Sciences','SCHOOL'),(NULL,19,1,'SOAS','School of Agricultural Sciences','SCHOOL'),(NULL,20,1,'SFES','School of Forestry, Environmental and Geographical Sciences','SCHOOL'),(NULL,21,1,'SFTNB','School of Food Technology, Nutrition and Bio-Engineering','SCHOOL'),(NULL,22,1,'SOE_MAK','School of Engineering','SCHOOL'),(NULL,23,1,'SBE_MAK','School of Built Environment','SCHOOL'),(NULL,24,1,'MGIFA','Margaret Trowell School of Industrial and Fine Arts','SCHOOL'),(NULL,25,1,'SLPA','School of Liberal and Performing Arts','SCHOOL'),(NULL,26,1,'SLLC','School of Languages, Literature and Communication','SCHOOL'),(NULL,27,1,'SSS','School of Social Sciences','SCHOOL'),(NULL,28,1,'SOP','School of Psychology','SCHOOL'),(NULL,29,1,'MISR','Makerere Institute of Social Research','SCHOOL'),(NULL,30,1,'SOECON','School of Economics','SCHOOL'),(NULL,31,1,'SOBUS','School of Business','SCHOOL'),(NULL,32,1,'SOSP','School of Statistics and Planning','SCHOOL'),(NULL,33,1,'SCIT','School of Computing and Informatics Technology','SCHOOL'),(NULL,34,1,'EASLIS','East African School of Library and Information Science','SCHOOL'),(NULL,35,1,'SOE_CEES','School of Education','SCHOOL'),(NULL,36,1,'SODLL','School of Distance and Lifelong Learning','SCHOOL'),(NULL,37,1,'SOHES','East African School of Higher Education Studies and Development','SCHOOL'),(NULL,38,1,'SPAS','School of Physical Sciences','SCHOOL'),(NULL,39,1,'SBS','School of Biological Sciences','SCHOOL'),(NULL,40,1,'SVR','School of Veterinary Medicine and Animal Resources','SCHOOL'),(NULL,41,1,'SBB','School of Biosecurity, Biotechnical and Laboratory Sciences','SCHOOL'),(NULL,42,1,'SOL','School of Law','SCHOOL'),(NULL,43,1,'IGDS','Institute of Gender and Development Studies','SCHOOL'),(NULL,901,19,'NU-SEDU','School of Education','SCHOOL'),(NULL,902,19,'NU-SCI','School of Computing and Informatics','SCHOOL'),(NULL,903,19,'NU-SLAW','School of Law','SCHOOL'),(NULL,904,19,'NU-SOSS','School of Social Sciences','SCHOOL'),(NULL,905,19,'NU-SCOS','School of Sciences','SCHOOL'),(NULL,906,19,'NU-SBA','School of Business Administration','SCHOOL'),(NULL,907,19,'NU-SCIAD','School of Commercial Industrial Art and Design','SCHOOL'),(NULL,908,19,'NU-DPGSR','Directorate of Postgraduate Studies and Research','DIRECTORATE');
/*!40000 ALTER TABLE `schools` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_profiles`
--

DROP TABLE IF EXISTS `student_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `student_no` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `reg_no` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `intake` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `program` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `course_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `mobile_no` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `year_of_study` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `academic_year` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `semester` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `organisation` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `academic_supervisor` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `academic_supervisor_contact` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `field_supervisor` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `field_supervisor_contact` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `picture` longblob,
  `unit_id` int DEFAULT NULL,
  `course_id` int DEFAULT NULL,
  `academic_supervisor_id` int DEFAULT NULL,
  `field_supervisor_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_student_no` (`student_no`),
  UNIQUE KEY `UK_reg_no` (`reg_no`),
  UNIQUE KEY `UK_student_email` (`email`),
  KEY `FK_sp_unit` (`unit_id`),
  KEY `FK_sp_course` (`course_id`),
  KEY `FK_sp_academic_sup` (`academic_supervisor_id`),
  KEY `FK_sp_field_sup` (`field_supervisor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_profiles`
--

LOCK TABLES `student_profiles` WRITE;
/*!40000 ALTER TABLE `student_profiles` DISABLE KEYS */;
INSERT INTO `student_profiles` VALUES (1,'Kasagga Fred','2400101003','2024/AUG/BCS/B23628S/DAY','AUG/2024','BSCCS','Internship','0757402058','kasaggafred999@gmail.com','2026','Two','Two','MicroVest','National ICT Innovation Hub, Nakawa','Ssemaganda Shuraim','075887005','Nangai Zackaria','0784723705','2026-07-13','2026-09-13',NULL,2,19,1,2),(2,'Alex Johnson','STU-2026-001','REG-1001','AUG/2024','BSCCS','Internship','+1 555 123 4567','alex.johnson@example.com','2026','Three','Two','Airtel Uganda','Kampala','university','0700000000','John Doe','0700000000','2026-07-13','2026-09-13',NULL,2,27,1,2),(3,'Sarah Owen','STU-2026-002','REG-1002','AUG/2024','BSE','Internship','+256 700 111 222','sarah.owen@example.com','2026','Four','Two','Airtel Uganda','Kampala','university','0700000000','John Doe','0700000000','2026-07-13','2026-09-13',NULL,6,47,1,2);
/*!40000 ALTER TABLE `student_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_settings`
--

DROP TABLE IF EXISTS `student_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_settings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `dark_mode` bit(1) DEFAULT NULL,
  `email_notifications` bit(1) DEFAULT NULL,
  `language` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sms_notifications` bit(1) DEFAULT NULL,
  `student_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKaw9pv43p3stro0l3htiqitu2k` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_settings`
--

LOCK TABLES `student_settings` WRITE;
/*!40000 ALTER TABLE `student_settings` DISABLE KEYS */;
INSERT INTO `student_settings` VALUES (1,_binary '\0',_binary '','en',_binary '',1),(2,_binary '\0',_binary '','en',_binary '',2),(3,_binary '\0',_binary '','en',_binary '',3);
/*!40000 ALTER TABLE `student_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `academic_year` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `degree_program` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `end_date` date DEFAULT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `ind_supervisor_id` bigint DEFAULT NULL,
  `intake` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `internship_company_id` bigint DEFAULT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `phone_number` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `registration_number` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `semester` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `student_number` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `uni_supervisor_id` bigint DEFAULT NULL,
  `university_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `year_of_study` int DEFAULT NULL,
  `department_id` bigint DEFAULT NULL,
  `programme_id` bigint DEFAULT NULL,
  `school_id` bigint DEFAULT NULL,
  `gender` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (1,NULL,'BSc Information Technology',NULL,'Kasagga',NULL,NULL,1,'Fred',NULL,'REG-2026-001',NULL,NULL,'2400101003',NULL,19,1,3,NULL,2019,902,'Male',NULL),(2,NULL,'BSc Information Technology',NULL,'Alex',NULL,NULL,1,'Johnson',NULL,'REG-2026-002',NULL,NULL,'STU-2026-001',NULL,19,2,2,NULL,2019,902,'Male',NULL),(3,NULL,'BSc Information Technology',NULL,'Sarah',NULL,NULL,1,'Owen',NULL,'REG-2026-003',NULL,NULL,'STU-2026-002',NULL,19,3,2,NULL,2019,902,'Female',NULL);
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `universities`
--

DROP TABLE IF EXISTS `universities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `universities` (
  `university_id` int NOT NULL AUTO_INCREMENT,
  `short_form` varchar(15) COLLATE utf8mb4_general_ci NOT NULL,
  `full_name` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `country` varchar(100) COLLATE utf8mb4_general_ci DEFAULT 'Uganda',
  `established_year` int DEFAULT NULL,
  `email` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `physical_address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `website` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`university_id`),
  UNIQUE KEY `UK_uni_short` (`short_form`),
  UNIQUE KEY `UK_uni_full_name` (`full_name`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `universities`
--

LOCK TABLES `universities` WRITE;
/*!40000 ALTER TABLE `universities` DISABLE KEYS */;
INSERT INTO `universities` VALUES (1,'MAK','Makerere University','Uganda',1922,'info@mak.ac.ug','+256 414 530 001','P.O. Box 7062, Kampala, Uganda','https://www.mak.ac.ug'),(2,'KYU','Kyambogo University','Uganda',2003,'info@kyu.ac.ug','+256 414 254 503','P.O. Box 1, Kyambogo, Kampala, Uganda','https://www.kyu.ac.ug'),(3,'MUST','Mbarara University of Science and Technology','Uganda',1989,NULL,NULL,NULL,NULL),(4,'GU','Gulu University','Uganda',2002,NULL,NULL,NULL,NULL),(5,'BUS','Busitema University','Uganda',2007,NULL,NULL,NULL,NULL),(6,'KAB','Kabale University','Uganda',2001,NULL,NULL,NULL,NULL),(7,'LU','Lira University','Uganda',2012,NULL,NULL,NULL,NULL),(8,'MU','Muni University','Uganda',2014,NULL,NULL,NULL,NULL),(9,'SUN','Soroti University','Uganda',2015,NULL,NULL,NULL,NULL),(10,'MMU','Mountains of the Moon University','Uganda',2015,NULL,NULL,NULL,NULL),(11,'MUBS','Makerere University Business School','Uganda',1997,NULL,NULL,NULL,NULL),(12,'UMI','Uganda Management Institute','Uganda',1989,NULL,NULL,NULL,NULL),(13,'KIU','Kampala International University','Uganda',2001,NULL,NULL,NULL,NULL),(14,'UCU','Uganda Christian University','Uganda',1997,NULL,NULL,NULL,NULL),(15,'IUIU','Islamic University in Uganda','Uganda',1994,NULL,NULL,NULL,NULL),(16,'UMU','Uganda Martyrs University','Uganda',1993,NULL,NULL,NULL,NULL),(17,'NDEJJE','Ndejje University','Uganda',1994,NULL,NULL,NULL,NULL),(18,'BUGEMA','Bugema University','Uganda',1994,NULL,NULL,NULL,NULL),(19,'NU','Nkumba University','Uganda',1994,'info@nku.ac.ug','+256 414 260 434','P.O. Box 75, Entebbe, Uganda','https://www.nkumba.ac.ug'),(20,'CUI','Cavendish University Uganda','Uganda',2008,NULL,NULL,NULL,NULL),(21,'VU','Victoria University','Uganda',2010,NULL,NULL,NULL,NULL),(22,'ISBAT','ISBAT University','Uganda',2005,NULL,NULL,NULL,NULL),(23,'IUEA','International University of East Africa','Uganda',2010,NULL,NULL,NULL,NULL),(24,'CIU','Clarke International University','Uganda',2005,NULL,NULL,NULL,NULL),(25,'BSU','Bishop Stuart University','Uganda',2002,NULL,NULL,NULL,NULL),(26,'MRU','Muteesa I Royal University','Uganda',2007,NULL,NULL,NULL,NULL),(27,'SLAU','St. Lawrence University','Uganda',2005,NULL,NULL,NULL,NULL),(28,'UTAMU','Uganda Technology and Management University','Uganda',2013,NULL,NULL,NULL,NULL),(29,'KCU','King Ceasor University','Uganda',2015,NULL,NULL,NULL,NULL),(30,'AFRU','Africa Renewal University','Uganda',2006,NULL,NULL,NULL,NULL),(31,'UNIK','University of Kisubi','Uganda',2014,NULL,NULL,NULL,NULL),(32,'MIU','Metropolitan International University','Uganda',2013,NULL,NULL,NULL,NULL),(33,'IU','Ibanda University','Uganda',2014,NULL,NULL,NULL,NULL),(34,'ARU','African Rural University','Uganda',2004,NULL,NULL,NULL,NULL),(35,'AWU','Ankole Western University','Uganda',2015,NULL,NULL,NULL,NULL),(36,'KUMI','Kumi University','Uganda',2009,NULL,NULL,NULL,NULL),(37,'LIU','LivingStone International University','Uganda',2008,NULL,NULL,NULL,NULL),(38,'UPU','Uganda Pentecostal University','Uganda',2010,NULL,NULL,NULL,NULL),(39,'USHG','University of Sacred Heart Gulu','Uganda',2015,NULL,NULL,NULL,NULL),(40,'TU','Team University','Uganda',2016,NULL,NULL,NULL,NULL),(41,'VUST','Valley University of Science and Technology','Uganda',2016,NULL,NULL,NULL,NULL),(42,'AUIU','Avance International University','Uganda',2017,NULL,NULL,NULL,NULL),(43,'ASUL','All Saints University Lango','Uganda',2015,NULL,NULL,NULL,NULL),(44,'AKU','Aga Khan University Kampala','Uganda',2016,NULL,NULL,NULL,NULL),(45,'ABU','African Bible University','Uganda',2005,NULL,NULL,NULL,NULL),(46,'GLRU','Great Lakes Regional University','Uganda',2016,NULL,NULL,NULL,NULL),(47,'RIU','Rwenzori International University','Uganda',2016,NULL,NULL,NULL,NULL),(48,'ROU','Royal Open University','Uganda',2017,NULL,NULL,NULL,NULL),(49,'NIU','Nexus International University','Uganda',2018,NULL,NULL,NULL,NULL),(50,'LWU','Limkokwing University Uganda','Uganda',2014,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `universities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `university_supervisors`
--

DROP TABLE IF EXISTS `university_supervisors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `university_supervisors` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `department` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `phone_number` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `university_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `university_supervisors`
--

LOCK TABLES `university_supervisors` WRITE;
/*!40000 ALTER TABLE `university_supervisors` DISABLE KEYS */;
INSERT INTO `university_supervisors` VALUES (1,'School of Computing and Informatics','David','Ssemakula','+256700000001',19,4);
/*!40000 ALTER TABLE `university_supervisors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('ADMIN','COMPANY','STUDENT','SUPERVISOR') COLLATE utf8mb4_general_ci NOT NULL,
  `company_id` bigint DEFAULT NULL,
  `university_id` int DEFAULT NULL,
  `provider` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `provider_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT '1',
  `password_reset_token` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `enabled` bit(1) NOT NULL,
  `failed_login_attempts` int NOT NULL,
  `locked_until` datetime(6) DEFAULT NULL,
  `password_changed_at` datetime(6) DEFAULT NULL,
  `password_reset_expires_at` datetime(6) DEFAULT NULL,
  `super_admin` bit(1) NOT NULL,
  `last_login_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKr43af9ap4edm43mmtq01oddj6` (`username`),
  UNIQUE KEY `UK6jdo1l976be85wv43w6x6e6x2` (`provider_id`),
  KEY `FK_users_company` (`company_id`),
  KEY `FK_users_university` (`university_id`),
  CONSTRAINT `FK_users_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_users_university` FOREIGN KEY (`university_id`) REFERENCES `universities` (`university_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'2400101003','$2a$10$lSJSrN5Qaq4xzAfSXEv0K.IQzgbeera.x2G242AkrqpAgf/6U4S1K','STUDENT',NULL,NULL,NULL,NULL,'kasaggafred999@gmail.com',0,NULL,_binary '',2,NULL,'2026-09-30 06:10:24.949184',NULL,_binary '\0',NULL),(2,'STU-2026-001','$2a$10$9JkoiqhjIToE5WzSHwjH6e6nq0y09UXDYAxOgHoHV9x7VzZyk9HmC','STUDENT',NULL,NULL,NULL,NULL,'alex.johnson@example.com',0,NULL,_binary '',0,NULL,'2026-10-01 03:54:38.981981',NULL,_binary '\0',NULL),(3,'STU-2026-002','$2b$12$0UVwuLCCvEPOWqKaHH6Jxe8D4FrKbUavHbLxyNJs.6x4aWThyD7P2','STUDENT',NULL,NULL,NULL,NULL,'sarah.owen@example.com',1,NULL,_binary '',0,NULL,NULL,NULL,_binary '\0',NULL),(4,'university','$2a$10$9WuA4QFu1pvtygPUTomQquDkg6Pa9QpcSiYGNkbTImM3L8Tnh0xDW','SUPERVISOR',NULL,19,NULL,NULL,'supervisor@mak.ac.ug',0,NULL,_binary '',0,NULL,NULL,NULL,_binary '\0','2026-10-06 05:59:37.998508'),(5,'airtel','$2a$10$D9m8aUyHFw.m5pdFoa9hxOZCc9xbheU3qiP50LLsM0nRbwSytrZ32','COMPANY',1,NULL,NULL,NULL,'info@airtel.co.ug',0,NULL,_binary '',0,NULL,NULL,NULL,_binary '\0',NULL),(6,'admin','$2a$10$vLuCfsI0XhR76hOIP6GdeO8MRRY9/vtVnVwbBjPb6FsA//IX7ZX1W','ADMIN',NULL,NULL,NULL,NULL,'admin@ims.ac.ug',0,NULL,_binary '',0,NULL,NULL,NULL,_binary '','2026-10-06 05:57:27.338878'),(7,'kyu','$2a$10$h/CcDAVTFfnlvdjrIMi1OOVqlGBDZbIFFWk2U2Dur.a/4pXcMDMj6','SUPERVISOR',NULL,2,NULL,NULL,'supervisor@kyu.ac.ug',0,NULL,_binary '',0,NULL,NULL,NULL,_binary '\0',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vacancies`
--

DROP TABLE IF EXISTS `vacancies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vacancies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `created_at` date NOT NULL,
  `deadline` date NOT NULL,
  `description` varchar(1000) COLLATE utf8mb4_general_ci NOT NULL,
  `location` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `requirements` varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `address_detail` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `application_email` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `application_instructions` text COLLATE utf8mb4_general_ci,
  `application_phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `application_url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `benefits` text COLLATE utf8mb4_general_ci,
  `city` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_email` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_person_name` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_role` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `deliverables_expected` text COLLATE utf8mb4_general_ci,
  `duration_weeks` int DEFAULT NULL,
  `eligibility_notes` text COLLATE utf8mb4_general_ci,
  `end_date` date DEFAULT NULL,
  `external_org_name` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_paid` bit(1) DEFAULT NULL,
  `min_cgpa` decimal(4,2) DEFAULT NULL,
  `nice_to_have` text COLLATE utf8mb4_general_ci,
  `origin` enum('COMPANY','SUPERVISOR','SUPER_ADMIN','UNIVERSITY') COLLATE utf8mb4_general_ci NOT NULL,
  `published_at` datetime(6) DEFAULT NULL,
  `required_attachments` text COLLATE utf8mb4_general_ci,
  `required_skills` text COLLATE utf8mb4_general_ci,
  `responsibilities` text COLLATE utf8mb4_general_ci,
  `review_note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `safety_notes` text COLLATE utf8mb4_general_ci,
  `safety_orientation_required` bit(1) NOT NULL DEFAULT b'0',
  `slots` int DEFAULT NULL,
  `source_kind` enum('COMPANY_DIRECT','EXTERNAL_OFFER','REFERRAL','SUPERVISOR_SOURCED','UNIVERSITY_SOURCED') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `source_reference` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `stipend_amount` decimal(12,2) DEFAULT NULL,
  `stipend_currency` varchar(3) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `stipend_period` varchar(16) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `target_degree_levels` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `target_department_ids` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `target_programme_ids` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `target_school_ids` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `target_year_of_study` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tools_technologies` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `verification_note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `verification_status` enum('REJECTED','UNVERIFIED','VERIFIED') COLLATE utf8mb4_general_ci NOT NULL,
  `verified_at` datetime(6) DEFAULT NULL,
  `verified_by` bigint DEFAULT NULL,
  `work_mode` enum('HYBRID','ONSITE','REMOTE') COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vacancies`
--

LOCK TABLES `vacancies` WRITE;
/*!40000 ALTER TABLE `vacancies` DISABLE KEYS */;
INSERT INTO `vacancies` VALUES (1,1,'2026-08-01','2026-09-30','Join Airtel Uganda\'s IT team for a 3-month internship in software development.','Kampala','Currently enrolled in a Computer Science or IT program','OPEN','Software Development Intern',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'COMPANY',NULL,NULL,NULL,NULL,NULL,NULL,NULL,_binary '\0',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'REJECTED',NULL,NULL,'HYBRID'),(2,1,'2026-08-01','2026-09-30','Assist the Network Operations team with monitoring and maintaining telecom infrastructure.','Kampala','Enrolled in Telecommunications or Electronics Engineering','OPEN','Network Operations Intern',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'COMPANY',NULL,NULL,NULL,NULL,NULL,NULL,NULL,_binary '\0',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'REJECTED',NULL,NULL,'HYBRID'),(3,2,'2026-08-01','2026-09-30','Support the Mobile Money team with customer support and operations.','Kampala','Enrolled in Business, IT, or related program','OPEN','Mobile Money Operations Intern',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'COMPANY',NULL,NULL,NULL,NULL,NULL,NULL,NULL,_binary '\0',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'REJECTED',NULL,NULL,'HYBRID');
/*!40000 ALTER TABLE `vacancies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'internshipManagementSystem_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-06  9:10:08
