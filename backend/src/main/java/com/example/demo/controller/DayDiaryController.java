package com.example.demo.controller;

import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.example.demo.student.DayDiary;
import com.example.demo.student.StudentProfile;
import com.example.demo.service.StudentService;

@Controller
@RequestMapping("/student/diary")
public class DayDiaryController {

    private final StudentService studentService;

    public DayDiaryController(StudentService studentService) {
        this.studentService = studentService;
    }

    @PostMapping("/save")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String saveDiaryEntry(@ModelAttribute("diaryEntry") DayDiary diaryEntry,
            Principal principal, RedirectAttributes redirectAttributes) {
        StudentProfile studentProfile = studentService.findByUsername(principal.getName()).orElse(null);
        if (studentProfile == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Unable to save diary entry. Student profile not found.");
            return "redirect:/student/dashboard";
        }
        diaryEntry.setStudentProfile(studentProfile);
        studentService.saveDayDiary(diaryEntry);
        redirectAttributes.addFlashAttribute("successMessage", "Diary entry saved successfully.");
        return "redirect:/student/dashboard";
    }
}
