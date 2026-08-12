package com.example.demo.controller;

import java.security.Principal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'STUDENT')")
    public ResponseEntity<Void> deleteDiary(@PathVariable Long id) {
        if (dayDiaryRepository.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        dayDiaryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
