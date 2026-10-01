package com.example.demo.industrial;

import java.security.Principal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.AuthorizationScopeService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.evaluation.Evaluation;
import com.example.demo.evaluation.EvaluationRepository;
import com.example.demo.placement.Placement;
import com.example.demo.placement.PlacementRepository;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * PC7.5: the field supervisor's own company-scoped overview — the dashboard
 * the §1.4 persona never had. Every question it answers is grounded in rows
 * that exist today; no chart invents a figure (plan §0).
 */
@RestController
@RequestMapping("/api/industrial")
@PreAuthorize("hasAnyAuthority('INDUSTRIAL_SUPERVISOR', 'ADMIN')")
public class IndustrialSupervisorController {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final PlacementRepository placementRepository;
    private final DayDiaryRepository dayDiaryRepository;
    private final EvaluationRepository evaluationRepository;
    private final StudentRepository studentRepository;
    private final AuthorizationScopeService scopeService;

    public IndustrialSupervisorController(UserRepository userRepository,
            CompanyRepository companyRepository, PlacementRepository placementRepository,
            DayDiaryRepository dayDiaryRepository, EvaluationRepository evaluationRepository,
            StudentRepository studentRepository, AuthorizationScopeService scopeService) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.placementRepository = placementRepository;
        this.dayDiaryRepository = dayDiaryRepository;
        this.evaluationRepository = evaluationRepository;
        this.studentRepository = studentRepository;
        this.scopeService = scopeService;
    }

    @GetMapping("/me/overview")
    public ResponseEntity<Map<String, Object>> overview(Principal principal) {
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        if (actor.getCompanyId() == null) {
            // PC7 invariant: a field supervisor is company-scoped by definition.
            throw new IllegalArgumentException("Your account is not linked to a company.");
        }
        if (!scopeService.isAdminLike(actor)) {
            // Belt and braces: the @PreAuthorize already gates the role.
            if (!"INDUSTRIAL_SUPERVISOR".equals(actor.getRole().name())) {
                throw new org.springframework.security.access.AccessDeniedException("Not a field supervisor.");
            }
        }

        Company company = companyRepository.findById(actor.getCompanyId()).orElse(null);
        List<Placement> placements = placementRepository.findByCompanyId(actor.getCompanyId());

        // One row per intern, matching the company dashboard's semantics.
        Map<Long, Student> byStudent = new LinkedHashMap<>();
        for (Placement placement : placements) {
            if (placement.getStudentId() != null && !byStudent.containsKey(placement.getStudentId())) {
                studentRepository.findById(placement.getStudentId())
                        .ifPresent(student -> byStudent.put(placement.getStudentId(), student));
            }
        }

        int internsFiling = 0;
        int evaluatedCount = 0;
        List<Map<String, Object>> interns = new ArrayList<>();
        for (Student student : byStudent.values()) {
            List<DayDiary> diaries = dayDiaryRepository.findByStudentIdOrderByDateDesc(student.getId());
            if (!diaries.isEmpty()) {
                internsFiling += 1;
            }
            List<Evaluation> evaluations = evaluationRepository.findByStudentId(student.getId());
            boolean evaluated = evaluations.stream()
                    .anyMatch(e -> actor.getId().equals(e.getSupervisorUserId()));
            if (evaluated) {
                evaluatedCount += 1;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("studentId", student.getId());
            row.put("name", student.getFirstName() + " " + student.getLastName());
            row.put("studentNumber", student.getStudentNumber());
            row.put("status", furthestStatus(placements, student.getId()));
            row.put("diaryCount", diaries.size());
            row.put("latestDiaryDate", diaries.isEmpty() ? null : diaries.get(0).getDate());
            row.put("evaluatedByMe", evaluated);
            interns.add(row);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("companyName", company != null && company.getName() != null ? company.getName() : null);
        out.put("internCount", byStudent.size());
        out.put("internsFiling", internsFiling);
        out.put("evaluatedByMe", evaluatedCount);
        out.put("interns", interns);
        return ResponseEntity.ok(out);
    }

    private String furthestStatus(List<Placement> placements, Long studentId) {
        Placement.Status best = null;
        for (Placement placement : placements) {
            if (!studentId.equals(placement.getStudentId())) {
                continue;
            }
            Placement.Status status = placement.getStatus();
            if (status == null || status == Placement.Status.CANCELLED) {
                continue;
            }
            if (best == null || status.ordinal() > best.ordinal()) {
                best = status;
            }
        }
        return best == null ? null : best.name();
    }
}
