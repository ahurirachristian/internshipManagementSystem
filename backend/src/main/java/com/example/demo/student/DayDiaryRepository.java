package com.example.demo.student;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DayDiaryRepository extends JpaRepository<DayDiary, Long> {
    List<DayDiary> findByStudentIdOrderByDateDesc(Long studentId);

    long countByUniversityId(Long universityId);

    long countByUniversityIdAndStatus(Long universityId, String status);

    List<DayDiary> findTop10ByUniversityIdOrderByDateDesc(Long universityId);

    @Query("SELECT d.status, COUNT(d) FROM DayDiary d WHERE d.universityId = :universityId GROUP BY d.status")
    List<Object[]> countByStatusGrouped(@Param("universityId") Long universityId);

    /**
     * PC5: students of this university with no diary entry dated on or after
     * {@code sinceDate}. Expressed as NOT EXISTS rather than a "latest date per
     * student" group-by, so a student who has never submitted is included —
     * which is precisely the case a supervisor needs to see.
     */
    @Query("SELECT s.id, s.firstName, s.lastName, s.studentNumber " +
           "FROM Student s WHERE s.universityId = :universityId AND NOT EXISTS (" +
           "SELECT d.id FROM DayDiary d WHERE d.studentId = s.id AND d.date >= :sinceDate) " +
           "ORDER BY s.lastName, s.firstName")
    List<Object[]> findStudentsWithoutDiarySince(@Param("universityId") Long universityId,
                                                 @Param("sinceDate") LocalDate sinceDate);

    /** Newest diary date per student, for showing how stale each one actually is. */
    @Query("SELECT d.studentId, MAX(d.date) FROM DayDiary d " +
           "WHERE d.universityId = :universityId GROUP BY d.studentId")
    List<Object[]> findLatestDiaryDatePerStudent(@Param("universityId") Long universityId);

    /**
     * PC11: diary count per student in one round trip. Replaces the per-student
     * {@code findByStudentIdOrderByDateDesc(...).size()} that the dashboard ran
     * twice per student (once for mid-term readiness, once for the by-student
     * rows) — the same 2N shape the plan flags for evaluations.
     *
     * <p>Deliberately NOT filtered by university. The method it replaces counted
     * every diary a student had, regardless of which university filed it, so
     * scoping this query would silently change the readiness numbers on any
     * database where a student has cross-university rows. Kept exactly as-is:
     * a student absent from the map reads as zero.
     */
    @Query("SELECT d.studentId, COUNT(d) FROM DayDiary d GROUP BY d.studentId")
    List<Object[]> countByStudentIdGrouped();

    /**
     * PC12: diary review backlog per university, for the admin chart.
     *
     * <p>Deliberately <em>not</em> grouped by {@code d.status}, although the plan
     * names that column. The app's canonical vocabulary is Reviewed /
     * Awaiting review, and PC6a established that it is derived from whether a
     * university supervisor left a comment — see {@code isReviewed} in
     * StudentDataContext. The {@code status} column is legacy: the seeder writes
     * "PENDING" to every row and never touches it again, so grouping by it
     * yields a single bucket that is both constant and meaningless. A chart
     * built on it would report every diary in the system as one status and
     * disagree with the figure each supervisor already sees on their own tab.
     *
     * <p>The university comes from {@code Student} rather than
     * {@code DayDiary.universityId}, matching the PC11 diary-count query. The
     * student's own record is the authority on which university they belong to;
     * a denormalised copy on the diary can be stale after a transfer.
     *
     * <p>Whitespace-only comments do not count as reviewed, matching isReviewed,
     * which trims before testing length.
     *
     * <p>This is the one native query in the codebase. The supervisor comment is
     * a CLOB, and Hibernate rejects {@code trim()} on a CLOB argument because it
     * validates that argument is a STRING — so the blank-vs-empty distinction
     * cannot be expressed in JPQL at all. Dropping the trim here would make this
     * chart disagree with the supervisor's own tab for any entry whose comment is
     * whitespace, which is precisely the class of drift the canonical two-value
     * status was introduced to prevent.
     *
     * <p>Four nested TRIMs rather than one: SQL's {@code TRIM} removes spaces
     * only, while the frontend's {@code String.prototype.trim} removes every kind
     * of whitespace. A comment of {@code "\n  "} is length 0 in JavaScript and
     * length 1 to a single {@code TRIM}, so one TRIM would report a blank entry
     * as reviewed.
     *
     * <p>The non-space characters are passed as {@code CHAR(10)}, {@code CHAR(9)}
     * and {@code CHAR(13)} rather than as {@code '\n'} and friends. Backslash
     * escapes are not standard SQL: the H2 test datasource reads {@code '\n'} as
     * a literal backslash and an "n", so the TRIM silently strips the wrong
     * characters and blank comments get counted as reviewed. {@code CHAR(n)} means
     * the same thing in MySQL and in H2.
     *
     * @return rows of {@code [universityId, reviewedCount, totalCount]}
     */
    @Query(value = "SELECT st.university_id AS university_id, "
            + "SUM(CASE WHEN d.university_supervisor_comment IS NOT NULL AND CHAR_LENGTH("
            + "TRIM(BOTH CHAR(10) FROM TRIM(BOTH CHAR(9) FROM TRIM(BOTH CHAR(13) FROM "
            + "TRIM(d.university_supervisor_comment))))"
            + ") > 0 THEN 1 ELSE 0 END) AS reviewed_count, "
            + "COUNT(*) AS total_count "
            + "FROM day_diaries d JOIN students st ON st.id = d.student_id "
            + "GROUP BY st.university_id",
            nativeQuery = true)
    List<Object[]> countDiaryBacklogGroupedByUniversity();
}
