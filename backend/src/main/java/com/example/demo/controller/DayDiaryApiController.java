package com.example.demo.controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.auth.UserRepository;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.audit.AuditLogService;

/**
 * M4: diaries are keyed to Model-B students.id; student identity is resolved
 * per entry instead of via the dropped StudentProfile join.
 */
@RestController
@RequestMapping("/api/diaries")
public class DayDiaryApiController {

    private final DayDiaryRepository dayDiaryRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public DayDiaryApiController(DayDiaryRepository dayDiaryRepository, StudentRepository studentRepository,
            UserRepository userRepository, AuditLogService auditLogService) {
        this.dayDiaryRepository = dayDiaryRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public List<Map<String, Object>> getMyDiaries(Principal principal) {
        Student student = currentStudent(principal.getName());
        if (student == null) {
            return List.of();
        }
        return dayDiaryRepository.findByStudentIdOrderByDateDesc(student.getId()).stream()
                .map(this::toView)
                .collect(java.util.stream.Collectors.toList());
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public List<Map<String, Object>> getAllDiaries() {
        return dayDiaryRepository.findAll().stream()
                .map(this::toView)
                .collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<String> exportDiariesCsv() {
        List<Map<String, Object>> diaries = dayDiaryRepository.findAll().stream()
                .map(this::toView)
                .collect(java.util.stream.Collectors.toList());
        String csv = diaries.stream()
                .map(d -> String.join(",",
                        escape(d.get("id")),
                        escape(d.get("date")),
                        escape(d.get("studentName")),
                        escape(d.get("studentNumber")),
                        escape(d.get("dailyActivities")),
                        escape(d.get("knowledgeAndSkillsGained")),
                        escape(d.get("accomplishments"))))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,Date,Student,StudentNo,DailyActivities,KnowledgeAndSkillsGained,Accomplishments\n" + csv;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"diaries.csv\"")
                .body(body);
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'STUDENT')")
    public ResponseEntity<List<Map<String, Object>>> getDiariesByStudent(@PathVariable Long studentId,
            Principal principal) {
        if (isStudent(principal)) {
            Student mine = currentStudent(principal.getName());
            if (mine == null || !mine.getId().equals(studentId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(dayDiaryRepository.findByStudentIdOrderByDateDesc(studentId).stream()
                .map(this::toView)
                .collect(java.util.stream.Collectors.toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'STUDENT')")
    public ResponseEntity<Map<String, Object>> getDiaryById(@PathVariable Long id) {
        return dayDiaryRepository.findById(id)
                .map(this::toView)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<?> createDiary(@RequestBody DayDiary diary, Principal principal) {
        Student student = currentStudent(principal.getName());
        if (student == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        diary.setId(null);
        diary.setStudentId(student.getId());
        DayDiary saved = dayDiaryRepository.save(diary);
        auditLogService.log(principal.getName(), "STUDENT", "CREATE", "DayDiary",
                "Created diary entry for " + fullName(student), null);
        return ResponseEntity.status(HttpStatus.CREATED).body(toView(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> updateDiary(@PathVariable Long id, @RequestBody DayDiary updates, Principal principal) {
        DayDiary diary = dayDiaryRepository.findById(id).orElse(null);
        if (diary == null) {
            return ResponseEntity.notFound().build();
        }
        boolean isOwner = isOwner(diary, principal.getName());
        boolean isAdminOrSupervisor = hasAuthority(principal, "ADMIN") || hasAuthority(principal, "SUPERVISOR");
        if (!isOwner && !isAdminOrSupervisor) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        diary.setDate(updates.getDate());
        diary.setDailyActivities(updates.getDailyActivities());
        diary.setKnowledgeAndSkillsGained(updates.getKnowledgeAndSkillsGained());
        diary.setAccomplishments(updates.getAccomplishments());
        DayDiary updated = dayDiaryRepository.save(diary);
        auditLogService.log(principal.getName(), "STUDENT", "UPDATE", "DayDiary",
                "Updated diary entry for " + diaryOwnerName(diary), null);
        return ResponseEntity.ok(toView(updated));
    }

    @PostMapping("/{id}/feedback")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> submitFeedback(@PathVariable Long id, @RequestBody Map<String, String> body) {
        DayDiary diary = dayDiaryRepository.findById(id).orElse(null);
        if (diary == null) {
            return ResponseEntity.notFound().build();
        }
        String feedback = body.getOrDefault("feedback", "");
        String status = body.getOrDefault("status", "PENDING");
        diary.setSupervisorFeedback(feedback);
        diary.setStatus(status);
        DayDiary saved = dayDiaryRepository.save(diary);
        auditLogService.log("supervisor", "SUPERVISOR", "FEEDBACK", "DayDiary",
                "Submitted feedback on diary for " + diaryOwnerName(saved) + " (status: " + status + ")", null);
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "status", status,
                "feedback", feedback,
                "message", "Feedback submitted successfully"
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'STUDENT')")
    public ResponseEntity<Void> deleteDiary(@PathVariable Long id, Principal principal) {
        DayDiary diary = dayDiaryRepository.findById(id).orElse(null);
        if (diary == null) {
            return ResponseEntity.notFound().build();
        }
        // M4 ownership fix: previously any STUDENT could delete any diary.
        if (isStudent(principal) && !isOwner(diary, principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        dayDiaryRepository.delete(diary);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toView(DayDiary d) {
        Map<String, Object> view = new HashMap<>();
        view.put("id", d.getId());
        view.put("date", d.getDate());
        view.put("dailyActivities", d.getDailyActivities());
        view.put("knowledgeAndSkillsGained", d.getKnowledgeAndSkillsGained());
        view.put("accomplishments", d.getAccomplishments());
        view.put("status", d.getStatus());
        view.put("supervisorFeedback", d.getSupervisorFeedback());
        view.put("studentId", d.getStudentId());
        Student owner = d.getStudentId() != null ? studentRepository.findById(d.getStudentId()).orElse(null) : null;
        view.put("studentName", owner != null ? fullName(owner) : "");
        view.put("studentNumber", owner != null ? owner.getStudentNumber() : "");
        return view;
    }

    private Student currentStudent(String username) {
        return userRepository.findByUsername(username)
                .flatMap(user -> studentRepository.findByUserId(user.getId()))
                .orElse(null);
    }

    private boolean isOwner(DayDiary diary, String username) {
        Student mine = currentStudent(username);
        return mine != null && diary.getStudentId() != null && diary.getStudentId().equals(mine.getId());
    }

    private String diaryOwnerName(DayDiary diary) {
        Student owner = diary.getStudentId() != null ? studentRepository.findById(diary.getStudentId()).orElse(null) : null;
        return owner != null ? fullName(owner) : "Unknown";
    }

    private String fullName(Student s) {
        return (s.getFirstName() + " " + s.getLastName()).trim();
    }

    private boolean isStudent(Principal principal) {
        return hasAuthority(principal, "STUDENT");
    }

    private boolean hasAuthority(Principal principal, String authority) {
        return principal instanceof Authentication auth
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(authority));
    }

    private String escape(Object value) {
        if (value == null) return "";
        String s = value.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = s.replace("\"", "\"\"");
            return "\"" + s + "\"";
        }
        return s;
    }
}
