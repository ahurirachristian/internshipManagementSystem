package com.example.demo.controller;

import java.security.Principal;
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
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;

@RestController
@RequestMapping("/api/diaries")
public class DayDiaryApiController {

    private final DayDiaryRepository dayDiaryRepository;
    private final StudentProfileRepository studentProfileRepository;

    public DayDiaryApiController(DayDiaryRepository dayDiaryRepository, StudentProfileRepository studentProfileRepository) {
        this.dayDiaryRepository = dayDiaryRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public List<DayDiary> getAllDiaries() {
        return dayDiaryRepository.findAll();
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<String> exportDiariesCsv() {
        List<DayDiary> diaries = dayDiaryRepository.findAllWithStudent();
        String csv = diaries.stream()
                .map(d -> {
                    String studentName = d.getStudentProfile() != null
                            ? escape(d.getStudentProfile().getFirstName() + " " + d.getStudentProfile().getLastName())
                            : "";
                    String username = d.getStudentProfile() != null ? escape(d.getStudentProfile().getUsername()) : "";
                    return String.join(",",
                            escape(d.getId()),
                            escape(d.getDate() != null ? d.getDate().toString() : ""),
                            studentName,
                            username,
                            escape(d.getDailyActivities()),
                            escape(d.getKnowledgeAndSkillsGained()),
                            escape(d.getAccomplishments()));
                })
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,Date,Student,Username,DailyActivities,KnowledgeAndSkillsGained,Accomplishments\n" + csv;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"diaries.csv\"")
                .body(body);
    }

    @GetMapping("/student/{username}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'STUDENT')")
    public List<DayDiary> getDiariesByStudent(@PathVariable String username) {
        return dayDiaryRepository.findByStudentProfileUsernameOrderByDateDesc(username);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'STUDENT')")
    public ResponseEntity<DayDiary> getDiaryById(@PathVariable Long id) {
        return dayDiaryRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<DayDiary> createDiary(@RequestBody DayDiary diary, Principal principal) {
        StudentProfile studentProfile = studentProfileRepository.findByUsername(principal.getName()).orElse(null);
        if (studentProfile == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        diary.setStudentProfile(studentProfile);
        DayDiary saved = dayDiaryRepository.save(diary);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<DayDiary> updateDiary(@PathVariable Long id, @RequestBody DayDiary updates, Principal principal) {
        DayDiary diary = dayDiaryRepository.findById(id).orElse(null);
        if (diary == null) {
            return ResponseEntity.notFound().build();
        }
        boolean isOwner = diary.getStudentProfile() != null
                && diary.getStudentProfile().getUsername().equals(principal.getName());
        boolean isAdmin = principal instanceof Authentication
                && ((Authentication) principal).getAuthorities().stream()
                        .anyMatch(auth -> auth.getAuthority().equals("ADMIN"));
        boolean isSupervisor = principal instanceof Authentication
                && ((Authentication) principal).getAuthorities().stream()
                        .anyMatch(auth -> auth.getAuthority().equals("SUPERVISOR"));
        if (!isOwner && !isAdmin && !isSupervisor) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        diary.setDate(updates.getDate());
        diary.setDailyActivities(updates.getDailyActivities());
        diary.setKnowledgeAndSkillsGained(updates.getKnowledgeAndSkillsGained());
        diary.setAccomplishments(updates.getAccomplishments());
        diary.setAccountNumber(updates.getAccountNumber());
        diary.setAction(updates.getAction());
        diary.setTechnologyTools(updates.getTechnologyTools());
        diary.setIndustrialSupervisorComment(updates.getIndustrialSupervisorComment());
        diary.setUniversitySupervisorComment(updates.getUniversitySupervisorComment());
        return ResponseEntity.ok(dayDiaryRepository.save(diary));
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
        String industrialComment = body.getOrDefault("industrialSupervisorComment", diary.getIndustrialSupervisorComment());
        String universityComment = body.getOrDefault("universitySupervisorComment", diary.getUniversitySupervisorComment());
        diary.setAccomplishments(diary.getAccomplishments() != null
                ? diary.getAccomplishments() + "\n\n[Supervisor Feedback]: " + feedback
                : "[Supervisor Feedback]: " + feedback);
        diary.setIndustrialSupervisorComment(industrialComment);
        diary.setUniversitySupervisorComment(universityComment);
        DayDiary saved = dayDiaryRepository.save(diary);
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "status", status,
                "feedback", feedback,
                "industrialSupervisorComment", saved.getIndustrialSupervisorComment(),
                "universitySupervisorComment", saved.getUniversitySupervisorComment(),
                "message", "Feedback submitted successfully"
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'STUDENT')")
    public ResponseEntity<Void> deleteDiary(@PathVariable Long id) {
        if (dayDiaryRepository.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        dayDiaryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
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
