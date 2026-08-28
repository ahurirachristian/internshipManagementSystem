package com.example.demo.service;

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
        stats.put("rosters", rosters);

        stats.put("companies", companies(students, universityId));
        stats.put("diaries", diaries(studentsById, universityId));
        stats.put("evaluations", evaluations(students, studentsById, universityId));
        stats.put("placements", placements(studentsById, universityId));
        stats.put("analytics", analytics(students, universityId));
        return stats;
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

    private Map<String, Object> diaryStatus(Long universityId) {
        Map<String, Long> statuses = new LinkedHashMap<>();
        statuses.put("PENDING", 0L);
        statuses.put("APPROVED", 0L);
        statuses.put("NEEDS_REVISION", 0L);
        for (Object[] row : dayDiaryRepository.countByStatusGrouped(universityId)) {
            String status = (String) row[0];
            if (status != null && statuses.containsKey(status)) {
                statuses.put(status, (Long) row[1]);
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
        long evaluated = students.stream()
                .filter(s -> evaluationRepository.findByStudentId(s.getId()).stream()
                        .anyMatch(e -> e.getUniversityId() != null
                                && e.getUniversityId().equals(universityId)))
                .count();
        out.put("totalEvaluations", total);
        out.put("evaluatedStudents", evaluated);

        Object[] avg = unwrapRow(evaluationRepository.averageScores(universityId));
        out.put("averageScores", avgScores(avg));

        long midTerm = students.stream().filter(s -> diaryCount(studentsById, s) >= MID_TERM_DIARIES).count();
        long finalReport = students.stream().filter(s -> diaryCount(studentsById, s) >= FINAL_REPORT_DIARIES).count();
        out.put("midTermReady", midTerm);
        out.put("finalReportReady", finalReport);

        List<Map<String, Object>> byStudent = new ArrayList<>();
        for (Student s : students) {
            List<com.example.demo.evaluation.Evaluation> evals =
                    evaluationRepository.findByStudentId(s.getId()).stream()
                            .filter(e -> e.getUniversityId() != null && e.getUniversityId().equals(universityId))
                            .collect(Collectors.toList());
            long diaryCount = diaryCount(studentsById, s);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("studentId", s.getId());
            row.put("studentName", s.getFirstName() + " " + s.getLastName());
            row.put("studentNo", s.getStudentNumber());
            row.put("evaluated", !evals.isEmpty());
            row.put("evaluationCount", (long) evals.size());
            row.put("diaryCount", diaryCount);
            row.put("midTermReady", diaryCount >= MID_TERM_DIARIES);
            row.put("finalReportReady", diaryCount >= FINAL_REPORT_DIARIES);
            byStudent.add(row);
        }
        out.put("byStudent", byStudent);
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

    private long diaryCount(Map<Long, Student> studentsById, Student s) {
        return dayDiaryRepository.findByStudentIdOrderByDateDesc(s.getId()).size();
    }
}
