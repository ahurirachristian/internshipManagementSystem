package com.example.demo.company;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.UserEntity;
import com.example.demo.evaluation.Evaluation;
import com.example.demo.evaluation.EvaluationRepository;
import com.example.demo.placement.Placement;
import com.example.demo.placement.PlacementRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * PC4: the company dashboard's Overview tab.
 *
 * <p>Every figure here is computed from the caller's own company id. The id is never
 * taken from the request, so a company cannot read another company's pipeline by
 * guessing it.
 *
 * <p>Intern progress is list-first: the developer's reference built a percentage out
 * of two client-side booleans per intern. That is kept, because it answers a real
 * question ("who is actually under way?"), but the two facts it reads are computed
 * here instead — the intern's recorded start date and whether any evaluation exists
 * for a placement belonging to this company.
 */
@Service
public class CompanyAnalyticsService {

    /** All six statuses, in pipeline order, always present so the donut has no gaps. */
    private static final Placement.Status[] STATUSES = Placement.Status.values();

    private final PlacementRepository placementRepository;
    private final EvaluationRepository evaluationRepository;
    private final StudentRepository studentRepository;

    public CompanyAnalyticsService(PlacementRepository placementRepository,
            EvaluationRepository evaluationRepository,
            StudentRepository studentRepository) {
        this.placementRepository = placementRepository;
        this.evaluationRepository = evaluationRepository;
        this.studentRepository = studentRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> analytics(UserEntity actor) {
        Long companyId = actor.getCompanyId();
        Map<String, Object> out = new LinkedHashMap<>();
        if (companyId == null) {
            // Same shape as a company with no placements, so the dashboard renders an
            // empty state instead of special-casing an unlinked account into an error.
            out.put("offers", emptyStatuses());
            out.put("interns", List.of());
            out.put("internCount", 0);
            out.put("avgEvaluation", null);
            out.put("evaluationCount", 0);
            return out;
        }

        out.put("offers", statusCounts(companyId));

        // One aggregate query, both figures. Calling it twice for the average and the
        // count would double the scan on every dashboard load.
        List<Object[]> grades = evaluationRepository.averageOverallGradeByCompanyId(companyId);
        out.put("avgEvaluation", averageOverallGrade(grades));
        out.put("evaluationCount", evaluationCount(grades));

        List<Map<String, Object>> interns = internProgress(companyId);
        out.put("interns", interns);
        out.put("internCount", interns.size());
        return out;
    }

    private Map<String, Long> emptyStatuses() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Placement.Status status : STATUSES) {
            counts.put(status.name(), 0L);
        }
        return counts;
    }

    private Map<String, Long> statusCounts(Long companyId) {
        Map<String, Long> counts = emptyStatuses();
        for (Object[] row : placementRepository.countByCompanyStatusGrouped(companyId)) {
            String status = row[0] == null ? null : row[0].toString();
            if (status != null && counts.containsKey(status)) {
                counts.put(status, ((Number) row[1]).longValue());
            }
        }
        return counts;
    }

    private Double averageOverallGrade(List<Object[]> rows) {
        Object[] row = firstRow(rows);
        if (row == null || !(row[0] instanceof Number average)) {
            return null;
        }
        return round(average.doubleValue());
    }

    private long evaluationCount(List<Object[]> rows) {
        Object[] row = firstRow(rows);
        if (row == null || row.length < 2 || !(row[1] instanceof Number count)) {
            return 0L;
        }
        return count.longValue();
    }

    /** An aggregate with no GROUP BY yields one row, or none when nothing matches. */
    private Object[] firstRow(List<Object[]> rows) {
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        Object[] row = rows.get(0);
        return row != null && row.length > 0 ? row : null;
    }

    /**
     * One row per intern placed at this company. Evaluations are matched through the
     * placement's company, so an evaluation recorded against a university placement
     * cannot mark a different company's intern as evaluated.
     */
    private List<Map<String, Object>> internProgress(Long companyId) {
        List<Placement> placements = placementRepository.findByCompanyId(companyId);
        if (placements.isEmpty()) {
            return List.of();
        }

        // One row per intern, not per placement: a student can hold several
        // placements at the same company, and the dashboard question is "how is
        // this person doing", which has one answer.
        Map<Long, Student> students = new LinkedHashMap<>();
        Map<Long, List<Placement>> byStudent = new LinkedHashMap<>();
        for (Placement placement : placements) {
            byStudent.computeIfAbsent(placement.getStudentId(), key -> new ArrayList<>()).add(placement);
        }
        for (Long studentId : byStudent.keySet()) {
            if (studentId != null) {
                studentRepository.findById(studentId).ifPresent(student -> students.put(studentId, student));
            }
        }

        // Evaluations for all of this company's placements in one query.
        Map<Long, List<Evaluation>> evaluationsByPlacement = new LinkedHashMap<>();
        List<Long> placementIds = placements.stream().map(Placement::getId).filter(java.util.Objects::nonNull).toList();
        if (!placementIds.isEmpty()) {
            for (Evaluation evaluation : evaluationRepository.findByPlacementIdIn(placementIds)) {
                evaluationsByPlacement
                        .computeIfAbsent(evaluation.getPlacementId(), key -> new ArrayList<>())
                        .add(evaluation);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<Long, List<Placement>> entry : byStudent.entrySet()) {
            Student student = students.get(entry.getKey());
            if (student == null) {
                continue;
            }
            List<Evaluation> evaluations = new ArrayList<>();
            for (Placement placement : entry.getValue()) {
                evaluations.addAll(evaluationsByPlacement.getOrDefault(placement.getId(), List.of()));
            }
            boolean started = student.getStartDate() != null;
            boolean evaluated = !evaluations.isEmpty();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("studentId", student.getId());
            row.put("firstName", student.getFirstName());
            row.put("lastName", student.getLastName());
            row.put("degreeProgram", student.getDegreeProgram());
            row.put("yearOfStudy", student.getYearOfStudy());
            row.put("placementStatus", furthestStatus(entry.getValue()));
            row.put("startDate", student.getStartDate());
            row.put("endDate", student.getEndDate());
            row.put("started", started);
            row.put("evaluated", evaluated);
            row.put("averageGrade", averageGrade(evaluations));
            // The two tracked onboarding facts, so the percentage is derived on one side only.
            row.put("progressPercent", (started ? 50 : 0) + (evaluated ? 50 : 0));
            rows.add(row);
        }
        return rows;
    }

    /**
     * The furthest an intern has got, so a student holding both an ACTIVE and a
     * CANCELLED placement is not reported as cancelled. CANCELLED is excluded
     * because it is a dead end, not progress.
     */
    private String furthestStatus(List<Placement> placements) {
        Placement.Status best = null;
        for (Placement placement : placements) {
            Placement.Status status = placement.getStatus();
            if (status == null || status == Placement.Status.CANCELLED) {
                continue;
            }
            if (best == null || status.ordinal() > best.ordinal()) {
                best = status;
            }
        }
        if (best == null) {
            return placements.isEmpty() ? null : Placement.Status.CANCELLED.name();
        }
        return best.name();
    }

    private Double averageGrade(List<Evaluation> evaluations) {
        Double total = null;
        int counted = 0;
        for (Evaluation evaluation : evaluations) {
            Integer grade = evaluation.getOverallGrade();
            if (grade == null) {
                continue;
            }
            total = total == null ? grade.doubleValue() : total + grade;
            counted += 1;
        }
        return counted == 0 ? null : round(total / counted);
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
