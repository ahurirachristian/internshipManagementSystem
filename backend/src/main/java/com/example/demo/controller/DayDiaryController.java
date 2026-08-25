package com.example.demo.controller;

import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.example.demo.student.DayDiary;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.auth.UserRepository;
import com.example.demo.student.DayDiaryRepository;

/**
 * M4: MVC form posts attach diaries to the Model-B students row.
 */
@Controller
@RequestMapping("/student/diary")
public class DayDiaryController {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final DayDiaryRepository dayDiaryRepository;

    public DayDiaryController(UserRepository userRepository, StudentRepository studentRepository,
            DayDiaryRepository dayDiaryRepository) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.dayDiaryRepository = dayDiaryRepository;
    }

    @PostMapping("/save")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String saveDiaryEntry(@ModelAttribute("diaryEntry") DayDiary diaryEntry,
            Principal principal, RedirectAttributes redirectAttributes) {
        Student student = userRepository.findByUsername(principal.getName())
                .flatMap(user -> studentRepository.findByUserId(user.getId()))
                .orElse(null);
        if (student == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Unable to save diary entry. Student profile not found.");
            return "redirect:/student/dashboard";
        }
        diaryEntry.setId(null);
        diaryEntry.setStudentId(student.getId());
        dayDiaryRepository.save(diaryEntry);
        redirectAttributes.addFlashAttribute("successMessage", "Diary entry saved successfully.");
        return "redirect:/student/dashboard";
    }
}
