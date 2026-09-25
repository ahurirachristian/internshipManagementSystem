-- ============================================================================
-- Widen every `university_id` column to BIGINT               (2026-09-25)
-- ============================================================================
-- Why
--   The JPA model now maps `universityId` to `java.lang.Long` on
--   University, School, Department, Programme, Student, UserEntity,
--   InternshipCompany, UniversitySupervisor, DayDiary, Evaluation and
--   Placement. Hibernate therefore expects BIGINT.
--
--   The `mysql` profile runs with `spring.jpa.hibernate.ddl-auto=none`
--   (see docs/ADR-002-schema-direction.md §6 and backend/schema.sql), so
--   Hibernate will NEVER widen this column for us on the production
--   database. The widening must be applied explicitly with this script.
--
-- Is it safe against production?
--   Yes. INT -> BIGINT is an in-place, non-destructive widening:
--     * existing values and ordering are preserved exactly;
--     * AUTO_INCREMENT on universities.university_id is preserved;
--     * the schema declares no FOREIGN KEY constraints on any
--       university_id column (only the company/department FKs exist), so
--       there is no referenced-column/child-column type mismatch to
--       resolve. FOREIGN_KEY_CHECKS is still disabled around the change
--       as a belt-and-braces measure.
--   On a table of this size the ALTER is effectively instantaneous.
--
-- How to run (once, against the mysql profile database, AFTER a backup):
--   mysqldump -u root -p --single-transaction internshipmanagementsystem_db > backup_pre_university_id_bigint.sql
--   mysql -u root -p internshipmanagementsystem_db < backend/migration/widen_university_id_bigint.sql
--
-- Idempotent: it only touches columns whose DATA_TYPE is not already
-- 'bigint', so re-running is a no-op. It also discovers columns from
-- information_schema, so it stays correct if another table gains a
-- university_id column later. Child tables are altered before the
-- `universities` parent so a hypothetical FK stays valid throughout.

SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS widen_university_id_columns;

DELIMITER $$

CREATE PROCEDURE widen_university_id_columns()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE tbl VARCHAR(64);
    DECLARE nullable VARCHAR(3);
    DECLARE extra VARCHAR(64);

    DECLARE col_cursor CURSOR FOR
        SELECT TABLE_NAME, IS_NULLABLE, EXTRA
          FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND COLUMN_NAME = 'university_id'
           AND DATA_TYPE <> 'bigint'
         ORDER BY (TABLE_NAME = 'universities');

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN col_cursor;

    read_loop: LOOP
        FETCH col_cursor INTO tbl, nullable, extra;
        IF done = 1 THEN
            LEAVE read_loop;
        END IF;

        SET @ddl = CONCAT(
            'ALTER TABLE `', tbl, '` MODIFY COLUMN `university_id` BIGINT',
            IF(nullable = 'NO', ' NOT NULL', ' NULL'),
            IF(extra LIKE '%auto_increment%', ' AUTO_INCREMENT', ''));

        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;

    CLOSE col_cursor;
END$$

DELIMITER ;

CALL widen_university_id_columns();
DROP PROCEDURE widen_university_id_columns;

SET FOREIGN_KEY_CHECKS = 1;

-- Verify: every university_id should now report DATA_TYPE = 'bigint'.
--   SELECT TABLE_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
--    WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'university_id'
--    ORDER BY TABLE_NAME;
