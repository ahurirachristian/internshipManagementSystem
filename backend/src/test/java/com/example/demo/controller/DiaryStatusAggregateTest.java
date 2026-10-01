package com.example.demo.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * PC6b gate: the university analytics diary aggregate must not drop statuses
 * outside the three it used to zero-fill.
 *
 * <p>The review UI (DayDiaryReviewModal) offers PENDING, APPROVED,
 * NEEDS_REVISION and REJECTED, but the service discarded any status string not
 * already in its seed map — so a supervisor's REJECTED decision was recorded
 * and then vanished from the pie, and the pie total silently disagreed with
 * the diary count. These tests pin the repaired behaviour: REJECTED renders,
 * the pie sums to the real diary count, and an unexpected status string is
 * surfaced as its own slice rather than dropped or thrown away.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DiaryStatusAggregateTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private DayDiaryRepository dayDiaryRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Student newStudent(String username) {
        UserEntity user = new UserEntity(username, passwordEncoder.encode("Student@123"), Role.STUDENT);
        // Fixtures act as their own principal, so they must not be gated.
        user.setMustChangePassword(false);
        userRepository.save(user);
        Student s = new Student();
        s.setUserId(user.getId());
        s.setUniversityId(19L);
        s.setFirstName(username);
        s.setLastName("Tester");
        s.setStudentNumber(username);
        s.setRegistrationNumber("Pending");
        s.setDegreeProgram("Undeclared");
        return studentRepository.save(s);
    }

    private void diary(Student s, String status) {
        DayDiary d = new DayDiary();
        d.setStudentId(s.getId());
        d.setUniversityId(19L);
        d.setDate(LocalDate.of(2026, 9, 1));
        d.setDailyActivities("PC6b fixture");
        d.setKnowledgeAndSkillsGained("PC6b fixture");
        d.setAccomplishments("PC6b fixture");
        d.setStatus(status);
        dayDiaryRepository.save(d);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor uni19() {
        return user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    @Test
    void rejectedDiariesAppearInThePie() throws Exception {
        Student a = newStudent("pc6b-rej-a");
        Student b = newStudent("pc6b-rej-b");
        diary(a, "APPROVED");
        diary(b, "REJECTED");

        mockMvc.perform(get("/api/university/stats").with(uni19()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analytics.diaryStatus.REJECTED").value(1))
                .andExpect(jsonPath("$.analytics.diaryStatus.APPROVED").value(1));
    }

    @Test
    void pieTotalEqualsTheDiaryCount() throws Exception {
        Student a = newStudent("pc6b-sum-a");
        Student b = newStudent("pc6b-sum-b");
        Student c = newStudent("pc6b-sum-c");
        diary(a, "PENDING");
        diary(a, "APPROVED");
        diary(a, "NEEDS_REVISION");
        diary(b, "REJECTED");
        diary(c, "REJECTED");

        // 1 PENDING + 1 APPROVED + 1 NEEDS_REVISION + 2 REJECTED: every state the
        // review UI can set, plus the zero-filled remainder, must add up to the
        // number of diaries the university actually holds.
        mockMvc.perform(get("/api/university/stats").with(uni19()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analytics.diaryStatus.PENDING").value(1))
                .andExpect(jsonPath("$.analytics.diaryStatus.APPROVED").value(1))
                .andExpect(jsonPath("$.analytics.diaryStatus.NEEDS_REVISION").value(1))
                .andExpect(jsonPath("$.analytics.diaryStatus.REJECTED").value(2));
    }

    @Test
    void unexpectedStatusStringSurvivesWithoutCrashing() throws Exception {
        Student a = newStudent("pc6b-odd-a");
        Student b = newStudent("pc6b-odd-b");
        diary(a, "PENDING");
        // DayDiary.status is a free-text column; a value outside every known
        // vocabulary must surface as its own slice, not vanish or 500.
        diary(b, "WITHDRAWN");

        mockMvc.perform(get("/api/university/stats").with(uni19()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analytics.diaryStatus.PENDING").value(1))
                .andExpect(jsonPath("$.analytics.diaryStatus.WITHDRAWN").value(1));
    }
}
