package com.example.demo.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.company.InternshipCompany;
import com.example.demo.company.InternshipCompanyRepository;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.evaluation.EvaluationRepository;
import com.example.demo.placement.Placement;
import com.example.demo.placement.PlacementRepository;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.school.SchoolRepository;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.supervisor.IndustrialSupervisorRepository;
import com.example.demo.supervisor.UniversitySupervisorRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

/**
 * M8: aggregates everything a university supervisor needs on the dashboard,
 * scoped to a single university. All counts use indexed, university-scoped
 * queries (COUNT/GROUP BY) rather than full-table scans followed by in-memory
 * joins (the AdminService anti-pattern). Returns summaries, not raw lists.
 */
@Service
@Transactional(readOnly = true)
public class UniversityDashboardService {

    private static final long MID_TERM_DIARIES = 5;
    private static final long FINAL_REPORT_DIARIES = 10;

    /**
     * PC12: the widest "evaluations so far" bucket charted. Beyond this the exact
     * count stops being the question a supervisor asks — nobody asks how many
     * students have eleven evaluations, they ask who has none — so students past
     * the cap are folded into the final bucket rather than extending the axis
     * without bound.
     */
    private static final int MAX_EVALUATIONS_PER_STUDENT = 4;

    private final StudentRepository studentRepository;
    private final UniversityRepository universityRepository;
    private final SchoolRepository schoolRepository;
    private final DepartmentRepository departmentRepository;
    private final ProgrammeRepository programmeRepository;
    private final UniversitySupervisorRepository universitySupervisorRepository;
    private final IndustrialSupervisorRepository industrialSupervisorRepository;
    private final InternshipCompanyRepository companyRepository;
    private final DayDiaryRepository dayDiaryRepository;
    private final EvaluationRepository evaluationRepository;
    private final PlacementRepository placementRepository;

    public UniversityDashboardService(StudentRepository studentRepository,
            UniversityRepository universityRepository,
            SchoolRepository schoolRepository,
            DepartmentRepository departmentRepository,
            ProgrammeRepository programmeRepository,
            UniversitySupervisorRepository universitySupervisorRepository,
            IndustrialSupervisorRepository industrialSupervisorRepository,
            InternshipCompanyRepository companyRepository,
            DayDiaryRepository dayDiaryRepository,
            EvaluationRepository evaluationRepository,
            PlacementRepository placementRepository) {
        this.studentRepository = studentRepository;
        this.universityRepository = universityRepository;
        this.schoolRepository = schoolRepository;
        this.departmentRepository = departmentRepository;
        this.programmeRepository = programmeRepository;
        this.universitySupervisorRepository = universitySupervisorRepository;
        this.industrialSupervisorRepository = industrialSupervisorRepository;
        this.companyRepository = companyRepository;
        this.dayDiaryRepository = dayDiaryRepository;
        this.evaluationRepository = evaluationRepository;
        this.placementRepository = placementRepository;
    }

    /**
     * Builds the full stats payload scoped to {@code universityId}.
     */
    public Map<String, Object> stats(Long universityId) {
        if (universityId == null) {
            return Map.of();
        }
        List<Student> students = studentRepository.findByUniversityId(universityId);
        Map<Long, Student> studentsById = students.stream()
                .collect(Collectors.toMap(Student::getId, Function.identity()));

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("university", universityInfo(universityId));

        Map<String, Object> rosters = new LinkedHashMap<>();
        long assigned = students.stream().filter(s -> s.getInternshipCompanyId() != null).count();
        rosters.put("totalStudents", (long) students.size());
        rosters.put("assigned", assigned);
        rosters.put("pending", students.size() - assigned);
        rosters.put("placementRatePct", students.isEmpty() ? 0
                : Math.round(100.0 * assigned / students.size()));
        rosters.put("schoolsCount", (long) schoolRepository.findByUniversityId(universityId.intValue()).size());
        rosters.put("departmentsCount", (long) departmentRepository.findByUniversityId(universityId.intValue()).size());
        rosters.put("programmesCount", (long) programmeRepository.findByUniversityId(universityId.intValue()).size());
        rosters.put("uniSupervisorCount", (long) universitySupervisorRepository.findByUniversityId(universityId).size());
        rosters.put("studentsBySchool", studentsBySchool(students, universityId));
        // PC12: per-programme placement rate for the chart on the Overview tab.
        rosters.put("programmePlacementRates", programmePlacementRates(students, universityId));
        stats.put("rosters", rosters);

        stats.put("companies", companies(students, universityId));
        stats.put("diaries", diaries(studentsById, universityId));
        stats.put("evaluations", evaluations(students, studentsById, universityId));
        stats.put("placements", placements(studentsById, universityId));
        stats.put("analytics", analytics(students, universityId));
        stats.put("attention", diaryAttention(universityId));
        return stats;
    }

    /**
     * PC5: students who have stopped filing day diaries.
     *
     * <p>A supervisor's real question is "who has gone quiet", so this is keyed on
     * absence rather than on activity. It deliberately counts a student who has
     * never filed at all — an empty result and a full result are both informative,
     * and a "latest entry" query that inner-joins would drop the never-filed case.
     */
    private Map<String, Object> diaryAttention(Long universityId) {
        // 48 hours, measured in days because DayDiary.date is a LocalDate with no
        // time component; two days back is the closest honest expression.
        LocalDate since = LocalDate.now().minusDays(2);

        Map<Long, LocalDate> latestByStudent = new HashMap<>();
        for (Object[] row : dayDiaryRepository.findLatestDiaryDatePerStudent(universityId)) {
            if (row[0] instanceof Number id && row[1] instanceof LocalDate date) {
                latestByStudent.put(id.longValue(), date);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object[] row : dayDiaryRepository.findStudentsWithoutDiarySince(universityId, since)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("studentId", ((Number) row[0]).longValue());
            item.put("firstName", row[1]);
            item.put("lastName", row[2]);
            item.put("studentNumber", row[3]);
            LocalDate latest = latestByStudent.get(((Number) row[0]).longValue());
            item.put("lastEntryDate", latest);
            // null means never filed, which is a worse state than a stale entry and
            // must not be rendered as "0 days ago".
            item.put("daysSinceLastEntry", latest == null ? null
                    : ChronoUnit.DAYS.between(latest, LocalDate.now()));
            item.put("neverFiled", latest == null);
            rows.add(item);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("windowHours", 48);
        out.put("sinceDate", since);
        out.put("total", (long) rows.size());
        out.put("neverFiled", rows.stream().filter(r -> Boolean.TRUE.equals(r.get("neverFiled"))).count());
        out.put("students", rows);
        return out;
    }

    /**
     * Chart-ready groupings for the university analytics tab. All series are
     * produced with university-scoped GROUP BY queries or derived from the
     * already-scoped student list (never global findAll joins).
     */
    private Map<String, Object> analytics(List<Student> students, Long universityId) {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("byYearOfStudy", yearOfStudy(students));
        a.put("byGender", gender(students));
        a.put("bySchool", bySchool(students, universityId));
        a.put("byProgramme", byProgramme(universityId));
        a.put("byCompany", companySeries(students, universityId));
        a.put("placementStatus", placementStatus(universityId));
        a.put("diaryStatus", diaryStatus(universityId));
        a.put("avgScores", averageScores(universityId));
        return a;
    }

    private List<Map<String, Object>> yearOfStudy(List<Student> students) {
        Map<Integer, Long> counts = new HashMap<>();
        students.forEach(s -> {
            Integer y = s.getYearOfStudy();
            counts.merge(y, 1L, Long::sum);
        });
        return counts.entrySet().stream()
                .sorted((x, y) -> Long.compare(
                        x.getKey() == null ? Long.MAX_VALUE : x.getKey().longValue(),
                        y.getKey() == null ? Long.MAX_VALUE : y.getKey().longValue()))
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("year", e.getKey() == null ? "Unspecified" : "Year " + e.getKey());
                    row.put("count", e.getValue());
                    return row;
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> gender(List<Student> students) {
        Map<String, Long> counts = new HashMap<>();
        students.forEach(s -> {
            String g = s.getGender();
            g = (g == null || g.isBlank()) ? "Unspecified" : g;
            counts.merge(g, 1L, Long::sum);
        });
        return counts.entrySet().stream()
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("gender", e.getKey());
                    row.put("count", e.getValue());
                    return row;
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> bySchool(List<Student> students, Long universityId) {
        return studentsBySchool(students, universityId);
    }

    private List<Map<String, Object>> byProgramme(Long universityId) {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : studentRepository.countByUniversityIdGroupByProgrammeId(universityId)) {
            Long pid = ((Number) row[0]).longValue();
            counts.merge(pid, (Long) row[1], Long::sum);
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<Long, Long> e : counts.entrySet()) {
            String name = programmeRepository.findById(e.getKey().intValue())
                    .map(p -> p.getProgrammeName())
                    .orElse("Programme " + e.getKey());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("programme", name);
            row.put("count", e.getValue());
            rows.add(row);
        }
        rows.sort((x, y) -> Long.compare((Long) y.get("count"), (Long) x.get("count")));
        return rows;
    }

    private List<Map<String, Object>> companySeries(List<Student> students, Long universityId) {
        Map<Long, Long> hosting = new HashMap<>();
        students.stream().map(Student::getInternshipCompanyId)
                .filter(id -> id != null)
                .forEach(id -> hosting.merge(id, 1L, Long::sum));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<Long, Long> e : hosting.entrySet()) {
            companyRepository.findById(e.getKey())
                    .ifPresent(c -> {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("company", c.getCompanyName());
                        row.put("interns", e.getValue());
                        rows.add(row);
                    });
        }
        rows.sort((x, y) -> Long.compare((Long) y.get("interns"), (Long) x.get("interns")));
        return rows;
    }

    private Map<String, Object> placementStatus(Long universityId) {
        return (Map<String, Object>) placements(new HashMap<>(), universityId).get("byStatus");
    }

    /**
     * PC6b: the review UI (DayDiaryReviewModal) offers PENDING, APPROVED,
     * NEEDS_REVISION and REJECTED. REJECTED was previously discarded here, so a
     * rejected diary was recorded but invisible in the pie and the pie's total
     * disagreed with the diary count. DayDiary.status is a free-text column, so
     * the aggregate seeds the known review vocabulary and appends any other
     * status string it finds rather than dropping it — an unexpected value
     * surfaces as its own slice instead of vanishing.
     */
    private Map<String, Object> diaryStatus(Long universityId) {
        Map<String, Long> statuses = new LinkedHashMap<>();
        statuses.put("PENDING", 0L);
        statuses.put("APPROVED", 0L);
        statuses.put("NEEDS_REVISION", 0L);
        statuses.put("REJECTED", 0L);
        for (Object[] row : dayDiaryRepository.countByStatusGrouped(universityId)) {
            String status = (String) row[0];
            if (status != null) {
                statuses.merge(status, (Long) row[1], Long::sum);
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Long> e : statuses.entrySet()) {
            out.put(e.getKey(), e.getValue());
        }
        return out;
    }

    private Map<String, Object> averageScores(Long universityId) {
        Object[] row = evaluationRepository.averageScores(universityId);
        return avgScores(unwrapRow(row));
    }

    /**
     * Spring Data may return a single-row multi-column aggregate either as a
     * flat Object[] ([a,b,c,d]) or as a length-1 Object[] wrapping that row
     * ([[a,b,c,d]]). Normalize both to the flat row.
     */
    private Object[] unwrapRow(Object[] row) {
        if (row == null || row.length != 1 || !(row[0] instanceof Object[])) {
            return row;
        }
        return (Object[]) row[0];
    }

    /**
     * PC12: placement rate per programme, for the programme chart.
     *
     * <p>Computed over the student list the endpoint already loaded, in the same
     * shape as {@link #studentsBySchool}, so it costs no query. "Placed" means
     * {@code internshipCompanyId != null} — deliberately the same definition the
     * headline placementRatePct and the per-school rows already use. Deriving a
     * second notion from Placement.status would make this chart disagree with
     * the rate printed directly above it, and two placement rates on one screen
     * is worse than none.
     */
    private List<Map<String, Object>> programmePlacementRates(List<Student> students, Long universityId) {
        Map<Long, long[]> counts = new LinkedHashMap<>();
        for (Student s : students) {
            if (s.getProgrammeId() == null) {
                continue;
            }
            long[] tally = counts.computeIfAbsent(s.getProgrammeId(), k -> new long[2]);
            tally[0]++;
            if (s.getInternshipCompanyId() != null) {
                tally[1]++;
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Programme p : programmeRepository.findByUniversityId(universityId.intValue())) {
            long[] tally = counts.get((long) p.getProgrammeId());
            if (tally == null || tally[0] == 0) {
                // A programme with no students in this university has no rate.
                // Emitting 0% would read as "everyone here failed to get placed".
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("programmeId", p.getProgrammeId());
            row.put("programmeName", p.getProgrammeName());
            row.put("programmeCode", p.getProgrammeCode());
            row.put("total", tally[0]);
            row.put("placed", tally[1]);
            row.put("placementRatePct", Math.round(100.0 * tally[1] / tally[0]));
            rows.add(row);
        }
        // Highest rate first, then by name so equal rates have a stable order
        // and the chart does not reshuffle between loads.
        rows.sort((a, b) -> {
            int byRate = Long.compare((Long) b.get("placementRatePct"), (Long) a.get("placementRatePct"));
            return byRate != 0 ? byRate
                    : String.valueOf(a.get("programmeName")).compareTo(String.valueOf(b.get("programmeName")));
        });
        return rows;
    }

    private Map<String, Object> universityInfo(Long universityId) {
        Map<String, Object> u = new LinkedHashMap<>();
        universityRepository.findById(universityId.intValue()).ifPresent(uni -> {
            u.put("fullName", uni.getFullName());
            u.put("shortForm", uni.getShortForm());
            u.put("country", uni.getCountry());
            u.put("establishedYear", uni.getEstablishedYear());
        });
        return u;
    }

    private List<Map<String, Object>> studentsBySchool(List<Student> students, Long universityId) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (com.example.demo.school.School s : schoolRepository.findByUniversityId(universityId.intValue())) {
            long count = students.stream().filter(st -> st.getSchoolId() != null
                    && st.getSchoolId().intValue() == s.getSchoolId()).count();
            long placed = students.stream().filter(st -> st.getSchoolId() != null
                    && st.getSchoolId().intValue() == s.getSchoolId()
                    && st.getInternshipCompanyId() != null).count();
            if (count == 0) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("schoolId", s.getSchoolId());
            row.put("name", s.getSchoolName());
            row.put("count", count);
            row.put("assigned", placed);
            row.put("placementRatePct", Math.round(100.0 * placed / count));
            rows.add(row);
        }
        return rows;
    }

    private Map<String, Object> companies(List<Student> students, Long universityId) {
        Map<Long, Long> hosting = new HashMap<>();
        students.stream().map(Student::getInternshipCompanyId)
                .filter(id -> id != null)
                .forEach(id -> hosting.merge(id, 1L, Long::sum));

        // Union: any company hosting this university's interns OR registered to the
        // university itself (a company stays visible even when its universityId is null).
        java.util.Set<Long> visible = new java.util.LinkedHashSet<>(hosting.keySet());
        for (InternshipCompany c : companyRepository.findAll()) {
            if (c.getUniversityId() != null && c.getUniversityId().equals(universityId)) {
                visible.add(c.getId());
            }
        }
        Map<Long, InternshipCompany> byId = new HashMap<>();
        for (InternshipCompany c : companyRepository.findAll()) {
            byId.put(c.getId(), c);
        }

        List<Map<String, Object>> companyRows = new ArrayList<>();
        for (Long cid : visible) {
            InternshipCompany c = byId.get(cid);
            if (c == null) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", cid);
            row.put("companyName", c.getCompanyName());
            row.put("internCount", hosting.getOrDefault(cid, 0L));
            companyRows.add(row);
        }
        companyRows.sort((a, b) -> Long.compare((Long) b.get("internCount"), (Long) a.get("internCount")));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("distinctCompanies", (long) companyRows.size());
        out.put("companies", companyRows);
        return out;
    }

    private Map<String, Object> diaries(Map<Long, Student> studentsById, Long universityId) {
        Map<String, Object> out = new LinkedHashMap<>();
        long total = dayDiaryRepository.countByUniversityId(universityId);
        long pending = dayDiaryRepository.countByUniversityIdAndStatus(universityId, "PENDING");
        out.put("totalEntries", total);
        out.put("pendingReview", pending);
        out.put("reviewed", total - pending);

        List<Map<String, Object>> recent = new ArrayList<>();
        for (DayDiary d : dayDiaryRepository.findTop10ByUniversityIdOrderByDateDesc(universityId)) {
            Student s = studentsById.get(d.getStudentId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", d.getId());
            row.put("date", d.getDate() != null ? d.getDate().toString() : null);
            row.put("status", d.getStatus());
            row.put("hasFeedback", d.getSupervisorFeedback() != null && !d.getSupervisorFeedback().isBlank());
            row.put("studentName", s != null ? s.getFirstName() + " " + s.getLastName() : "");
            row.put("studentNo", s != null ? s.getStudentNumber() : "");
            recent.add(row);
        }
        out.put("recent", recent);
        return out;
    }

    private Map<String, Object> evaluations(List<Student> students, Map<Long, Student> studentsById, Long universityId) {
        Map<String, Object> out = new LinkedHashMap<>();
        long total = evaluationRepository.countByUniversityId(universityId);

        // PC11: two grouped queries replace the two per-student loops below.
        // See the repository javadoc for why the university predicate differs
        // between them — it mirrors the filters this method always applied.
        Map<Long, Long> evalsPerStudent = new HashMap<>();
        for (Object[] row : evaluationRepository.countByStudentIdGrouped(universityId)) {
            evalsPerStudent.put((Long) row[0], (Long) row[1]);
        }
        Map<Long, Long> diariesPerStudent = new HashMap<>();
        for (Object[] row : dayDiaryRepository.countByStudentIdGrouped()) {
            diariesPerStudent.put((Long) row[0], (Long) row[1]);
        }

        long evaluated = students.stream()
                .filter(s -> evalsPerStudent.getOrDefault(s.getId(), 0L) > 0)
                .count();
        out.put("totalEvaluations", total);
        out.put("evaluatedStudents", evaluated);

        Object[] avg = unwrapRow(evaluationRepository.averageScores(universityId));
        out.put("averageScores", avgScores(avg));

        long midTerm = students.stream()
                .filter(s -> diariesPerStudent.getOrDefault(s.getId(), 0L) >= MID_TERM_DIARIES).count();
        long finalReport = students.stream()
                .filter(s -> diariesPerStudent.getOrDefault(s.getId(), 0L) >= FINAL_REPORT_DIARIES).count();
        out.put("midTermReady", midTerm);
        out.put("finalReportReady", finalReport);

        List<Map<String, Object>> byStudent = new ArrayList<>();
        for (Student s : students) {
            long evaluationCount = evalsPerStudent.getOrDefault(s.getId(), 0L);
            long diaryCount = diariesPerStudent.getOrDefault(s.getId(), 0L);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("studentId", s.getId());
            row.put("studentName", s.getFirstName() + " " + s.getLastName());
            row.put("studentNo", s.getStudentNumber());
            row.put("evaluated", evaluationCount > 0);
            row.put("evaluationCount", evaluationCount);
            row.put("diaryCount", diaryCount);
            row.put("midTermReady", diaryCount >= MID_TERM_DIARIES);
            row.put("finalReportReady", diaryCount >= FINAL_REPORT_DIARIES);
            byStudent.add(row);
        }
        out.put("byStudent", byStudent);

        // PC12: how many students sit in each "evaluations so far" bucket.
        // Derived from the same evalsPerStudent map the by-student rows above
        // use, so this adds no query — the alternative, a second grouped count,
        // would duplicate work PC11 already did.
        //
        // Every bucket is emitted, including the zero ones, so a chart can plot
        // the shape of the cohort rather than only the buckets that happen to
        // have members. studentsWithNoEvaluation is derived from the student list
        // rather than from the map so that students in neither the map nor the
        // list still reconcile: evaluatedStudents + studentsWithNoEvaluation
        // always equals the cohort size.
        List<Map<String, Object>> evalDistribution = new ArrayList<>();
        long noEvaluations = 0;
        for (int n = 0; n <= MAX_EVALUATIONS_PER_STUDENT; n++) {
            final long count = n;
            long inBucket = evalsPerStudent.values().stream()
                    .filter(v -> v == count)
                    .count();
            if (count == 0) {
                noEvaluations = students.stream()
                        .filter(s -> !evalsPerStudent.containsKey(s.getId()))
                        .count();
                inBucket = noEvaluations;
            } else if (count == MAX_EVALUATIONS_PER_STUDENT) {
                // The top bucket is "this many or more", so a student with nine
                // evaluations is counted here rather than falling out of the
                // chart entirely.
                inBucket += evalsPerStudent.values().stream()
                        .filter(v -> v > count)
                        .count();
            }
            Map<String, Object> bucket = new LinkedHashMap<>();
            bucket.put("evaluationCount", (long) n);
            bucket.put("students", inBucket);
            if (count == MAX_EVALUATIONS_PER_STUDENT) {
                bucket.put("label", n + "+");
            }
            evalDistribution.add(bucket);
        }
        out.put("byEvaluationCount", evalDistribution);
        out.put("studentsWithNoEvaluation", noEvaluations);
        return out;
    }

    private Map<String, Object> placements(Map<Long, Student> studentsById, Long universityId) {
        Map<String, Object> byStatus = new LinkedHashMap<>();
        for (Placement.Status status : Placement.Status.values()) {
            byStatus.put(status.name(), 0L);
        }
        for (Object[] row : placementRepository.countByStatusGrouped(universityId)) {
            byStatus.put(((Placement.Status) row[0]).name(), (Long) row[1]);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("byStatus", byStatus);
        return out;
    }

    private Map<String, Object> avgScores(Object[] avg) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (avg == null || avg.length < 4) {
            return m;
        }
        m.put("punctuality", round(avg[0]));
        m.put("practicalWorkEthics", round(avg[1]));
        m.put("attendance", round(avg[2]));
        m.put("workplacePerformance", round(avg[3]));
        return m;
    }

    private Double round(Object v) {
        if (v == null) {
            return null;
        }
        return Math.round(((Number) v).doubleValue() * 10.0) / 10.0;
    }
}
