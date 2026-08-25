-- MySQL dump 10.13  Distrib 9.1.0, for Win64 (x86_64)
--
-- Host: localhost    Database: internshipmanagementsystem_db
-- ------------------------------------------------------
-- Server version	9.1.0

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
-- Table structure for table `industrial_supervisors`
--

DROP TABLE IF EXISTS `industrial_supervisors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `industrial_supervisors` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `department` varchar(150) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `industrial_supervisors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `industrial_supervisors_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `internship_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `industrial_supervisors`
--

LOCK TABLES `industrial_supervisors` WRITE;
/*!40000 ALTER TABLE `industrial_supervisors` DISABLE KEYS */;
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
  `company_name` varchar(255) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `postal_address` varchar(255) DEFAULT NULL,
  `physical_address` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `branch` varchar(100) DEFAULT NULL,
  `country_id` int NOT NULL,
  `university_id` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `country_id` (`country_id`),
  KEY `university_id` (`university_id`),
  CONSTRAINT `internship_companies_ibfk_1` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `internship_companies_ibfk_2` FOREIGN KEY (`university_id`) REFERENCES `universities` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `internship_companies`
--

LOCK TABLES `internship_companies` WRITE;
/*!40000 ALTER TABLE `internship_companies` DISABLE KEYS */;
/*!40000 ALTER TABLE `internship_companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ROLE_STUDENT','Student pursuing internship'),(2,'ROLE_UNI_SUPERVISOR','Academic supervisor from university'),(3,'ROLE_IND_SUPERVISOR','Industry supervisor at host company'),(4,'ROLE_ADMIN','System administrator');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_profiles`
--

DROP TABLE IF EXISTS `student_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` varchar(255) NOT NULL,
  `degree_program` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `industrial_supervisor_id` varchar(255) NOT NULL,
  `internship_company` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `phone_number` varchar(255) NOT NULL,
  `picture_url` varchar(255) NOT NULL,
  `registration_number` varchar(255) NOT NULL,
  `student_number` varchar(255) NOT NULL,
  `university_supervisor` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `year_of_study` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK2nj0j3xkk6lso2iqdey534nsc` (`email`),
  UNIQUE KEY `UKhf3jq2rgpu0479yxv91v9i53c` (`registration_number`),
  UNIQUE KEY `UKgw5qtpb5wxec98wkj0qcsj67c` (`student_number`),
  UNIQUE KEY `UKlugkd4u2ntb4kmqigl76adf48` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_profiles`
--

LOCK TABLES `student_profiles` WRITE;
/*!40000 ALTER TABLE `student_profiles` DISABLE KEYS */;
INSERT INTO `student_profiles` VALUES (1,'COMP-2024','Computer Science','alex.johnson@example.com','Alex','IND-3456','TechCorp Solutions','Johnson','+1 555 123 4567','/images/student-placeholder.png','REG-1001','STU-2026-001','Dr. Emily Carter','student',3);
/*!40000 ALTER TABLE `student_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `university_id` bigint NOT NULL,
  `internship_company_id` bigint DEFAULT NULL,
  `uni_supervisor_id` bigint DEFAULT NULL,
  `ind_supervisor_id` bigint DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `registration_number` varchar(100) NOT NULL,
  `student_number` varchar(100) NOT NULL,
  `degree_program` varchar(255) NOT NULL,
  `year_of_study` int DEFAULT '1',
  `phone_number` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `registration_number` (`registration_number`),
  UNIQUE KEY `student_number` (`student_number`),
  KEY `university_id` (`university_id`),
  KEY `internship_company_id` (`internship_company_id`),
  KEY `uni_supervisor_id` (`uni_supervisor_id`),
  KEY `ind_supervisor_id` (`ind_supervisor_id`),
  CONSTRAINT `students_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `students_ibfk_2` FOREIGN KEY (`university_id`) REFERENCES `universities` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `students_ibfk_3` FOREIGN KEY (`internship_company_id`) REFERENCES `internship_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `students_ibfk_4` FOREIGN KEY (`uni_supervisor_id`) REFERENCES `university_supervisors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `students_ibfk_5` FOREIGN KEY (`ind_supervisor_id`) REFERENCES `industrial_supervisors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `universities`
--

DROP TABLE IF EXISTS `universities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `universities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `postal_address` varchar(255) DEFAULT NULL,
  `physical_address` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `campus_branch` varchar(100) DEFAULT NULL,
  `country_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `country_id` (`country_id`),
  CONSTRAINT `universities_ibfk_1` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `universities`
--

LOCK TABLES `universities` WRITE;
/*!40000 ALTER TABLE `universities` DISABLE KEYS */;
INSERT INTO `universities` VALUES (1,'Makerere University','info@mak.ac.ug','P.O. Box 7062','Makerere Hill, Kampala','https://www.mak.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(2,'Kyambogo University','vckyu@kyu.ac.ug','P.O. Box 1','Kyambogo Hill, Kampala','https://kyu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(3,'Mbarara University of Science and Technology','ar@must.ac.ug','P.O. Box 1410','Mbarara Town','https://www.must.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(4,'Gulu University','pro@gu.ac.ug','P.O. Box 166','Gulu City','https://gu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(5,'Busitema University','ar@busitema.ac.ug','P.O. Box 236','Tororo','https://busitema.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(6,'Kabale University','info@kab.ac.ug','P.O. Box 317','Kikungiri Hill, Kabale','https://kab.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(7,'Lira University','ar@lira.ac.ug','P.O. Box 1035','Lira City','https://lira.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(8,'Muni University','ar@muni.ac.ug','P.O. Box 725','Arua City','https://muni.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(9,'Soroti University','info@sun.ac.ug','P.O. Box 211','Soroti City','https://sun.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(10,'Mountains of the Moon University','info@mmu.ac.ug','P.O. Box 837','Fort Portal','https://mmu.ac.ug','Lake Saaka Campus',1,'2026-07-31 18:47:23'),(11,'Makerere University Business School (MUBS)','pro@mubs.ac.ug','P.O. Box 1337','Nakawa, Kampala','https://mubs.ac.ug','Nakawa Campus',1,'2026-07-31 18:47:23'),(12,'Uganda Management Institute (UMI)','admin@umi.ac.ug','P.O. Box 20131','Jinja Road, Kampala','https://umi.ac.ug','Kampala Main',1,'2026-07-31 18:47:23'),(13,'Kampala International University (KIU)','info@kiu.ac.ug','P.O. Box 20000','Kansanga, Ggaba Road','https://kiu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(14,'Uganda Christian University (UCU)','info@ucu.ac.ug','P.O. Box 4','Bishop Tucker Road, Mukono','https://ucu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(15,'Islamic University in Uganda (IUIU)','email@iuiu.ac.ug','P.O. Box 2555','Mbale City','https://www.iuiu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(16,'Uganda Martyrs University (UMU)','umu@umu.ac.ug','P.O. Box 5498','Nkozi, Mpigi','https://umu.ac.ug','Nkozi Campus',1,'2026-07-31 18:47:23'),(17,'Ndejje University','registrar@ndejjeuniversity.ac.ug','P.O. Box 7088','Luweero / Kampala','https://ndejjeuniversity.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(18,'Bugema University','info@bugemauniv.ac.ug','P.O. Box 6529','Gayaza-Zirobwe Road','https://bugemauniv.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(19,'Nkumba University','ar@nkumbauniversity.ac.ug','P.O. Box 237','Entebbe','https://nkumbauniversity.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(20,'Cavendish University Uganda','info@cavendish.ac.ug','P.O. Box 33123','Ggaba Road, Kampala','https://cavendish.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(21,'Victoria University','info@vu.ac.ug','P.O. Box 30866','Jinja Road, Kampala','https://vu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(22,'ISBAT University','info@isbatuniversity.ac.ug','P.O. Box 24388','Lugogo Bypass, Kampala','https://isbatuniversity.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(23,'International University of East Africa (IUEA)','info@iuea.ac.ug','P.O. Box 35502','Kansanga, Kampala','https://iuea.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(24,'Clarke International University','info@ciu.ac.ug','P.O. Box 7782','Muyenga, Kampala','https://ciu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(25,'Bishop Stuart University','ar@bsu.ac.ug','P.O. Box 9, Mbarara','Kakoba Hill, Mbarara','https://bsu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(26,'Muteesa I Royal University','info@mru.ac.ug','P.O. Box 1400','Masaka City','https://mru.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(27,'St. Lawrence University (SLAU)','info@slau.ac.ug','P.O. Box 29607','Mengo, Rubaga, Kampala','https://slau.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(28,'Uganda Technology and Management University (UTAMU)','info@utamu.ac.ug','P.O. Box 73307','Bugolobi, Kampala','https://utamu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(29,'King Ceasor University','info@kcu.ac.ug','P.O. Box 88','Bunga, Kampala','https://kcu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(30,'Africa Renewal University','info@afru.ac.ug','P.O. Box 35138','Buloba, Wakiso','https://afru.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(31,'University of Kisubi (UNIK)','info@unik.ac.ug','P.O. Box 182','Entebbe Road, Kisubi','https://unik.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(32,'Metropolitan International University','info@miu.ac.ug','P.O. Box 155','Kisoro / Kampala','https://miu.ac.ug','Kampala Branch',1,'2026-07-31 18:47:23'),(33,'Ibanda University','info@ibandauniversity.ac.ug','P.O. Box 35','Ibanda Town','https://ibandauniversity.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(34,'African Rural University','info@aru.ac.ug','P.O. Box 24','Kagadi Town','https://aru.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(35,'Ankole Western University','info@awu.ac.ug','P.O. Box 112','Kabwohe, Sheema','https://awu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(36,'Kumi University','info@kumiuniversity.ac.ug','P.O. Box 178','Kumi Town','https://kumiuniversity.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(37,'LivingStone International University','info@livingstone.ac.ug','P.O. Box 1500','Mbale City','https://livingstone.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(38,'Uganda Pentecostal University','info@upu.ac.ug','P.O. Box 829','Fort Portal','https://upu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(39,'University of the Sacred Heart Gulu','info@ushg.ac.ug','P.O. Box 374','Gulu City','https://ushg.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(40,'Team University','info@teamuniversity.ac.ug','P.O. Box 8128','Kabuusu, Rubaga, Kampala','https://teamuniversity.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(41,'Valley University of Science and Technology','info@vust.ac.ug','P.O. Box 44','Bushenyi Town','https://vust.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(42,'Avance International University','info@avance.ac.ug','P.O. Box 2221','Nabweru, Kampala','https://avance.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(43,'All Saints University Lango','info@asul.ac.ug','P.O. Box 32','Lira City','https://asul.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(44,'Aga Khan University Kampala','info@aku.edu','P.O. Box 8842','Makerere Hill Road, Kampala','https://aku.edu','Kampala Campus',1,'2026-07-31 18:47:23'),(45,'African Bible University','info@abu.ac.ug','P.O. Box 7122','Lubowa, Entebbe Road','https://abu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(46,'Great Lakes Regional University','info@glru.ac.ug','P.O. Box 117','Kanungu Town','https://glru.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(47,'Rwenzori International University','info@riu.ac.ug','P.O. Box 11','Kasese Town','https://riu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(48,'Royal Open University','info@rou.ac.ug','P.O. Box 2011','Kampala','https://rou.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(49,'Nexus International University','info@niu.ac.ug','P.O. Box 712','Kampala','https://niu.ac.ug','Main Campus',1,'2026-07-31 18:47:23'),(50,'Limkokwing University Uganda','info@limkokwing.ac.ug','P.O. Box 40','Namataba, Mukono','https://limkokwing.ac.ug','Main Campus',1,'2026-07-31 18:47:23');
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
  `user_id` bigint NOT NULL,
  `university_id` bigint NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `department` varchar(150) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `university_id` (`university_id`),
  CONSTRAINT `university_supervisors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `university_supervisors_ibfk_2` FOREIGN KEY (`university_id`) REFERENCES `universities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `university_supervisors`
--

LOCK TABLES `university_supervisors` WRITE;
/*!40000 ALTER TABLE `university_supervisors` DISABLE KEYS */;
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
  `password` varchar(255) NOT NULL,
  `role` enum('ADMIN','STUDENT','SUPERVISOR') NOT NULL,
  `username` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKr43af9ap4edm43mmtq01oddj6` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'$2a$10$trQQpptnKtF3rxW8wP7LVOqw9KsDAADwFZG3GWJyx5VX8TlnQs7Gq','STUDENT','student'),(2,'$2a$10$Vuv4rgrMZiO4ykJI0qje3O0/R/.D1cJJsbBO33KMXGYytaXIE96rS','SUPERVISOR','supervisor'),(3,'$2a$10$WbXG6rnem.o0nPwK3xMLnenAi5aal1RorUWrmNdDfE9pPGm8qwuN6','ADMIN','admin');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-19 11:25:06
