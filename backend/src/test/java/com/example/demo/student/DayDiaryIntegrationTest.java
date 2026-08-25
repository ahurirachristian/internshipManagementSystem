package com.example.demo.student;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/**
 * M4 gate (MIGRATION_PLAN.md): day_diaries rekeyed to Model-B students.id
 * with ownership checks on create/update/delete.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DayDiaryIntegrationTest {

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

    private UserEntity newUser(String username, Role role) {
        return userRepository.save(new UserEntity(username, passwordEncoder.encode("Student@123"), role));
    }

    private Student newStudent(String username) {
        UserEntity user = newUser(username, Role.STUDENT);
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

    private SecurityMockMvcRequestPostProcessors.UserRequestPostProcessor as(Student student, String... roles) {
        UserEntity user = userRepository.findById(student.getUserId()).orElseThrow();
        SimpleGrantedAuthority[] authorities = java.util.Arrays.stream(roles)
                .map(SimpleGrantedAuthority::new)
                .toArray(SimpleGrantedAuthority[]::new);
        return SecurityMockMvcRequestPostProcessors.user(user.getUsername()).authorities(authorities);
    }

    private String diaryJson() {
        return "{\"date\":\"2026-08-25\",\"dailyActivities\":\"Worked on migration\","
                + "\"knowledgeAndSkillsGained\":\"Schema rekeys\",\"accomplishments\":"
                + "\"Diary created against Model-B row\"}";
    }

    private SecurityMockMvcRequestPostProcessors.UserRequestPostProcessor as(UserEntity user, String... roles) {
        SimpleGrantedAuthority[] authorities = java.util.Arrays.stream(roles)
                .map(SimpleGrantedAuthority::new)
                .toArray(SimpleGrantedAuthority[]::new);
        return SecurityMockMvcRequestPostProcessors.user(user.getUsername()).authorities(authorities);
    }

    @Test
    void studentCreatesDiaryAgainstModelBRow() throws Exception {
        Student owner = newStudent("m4diary");

        mockMvc.perform(post("/api/diaries").with(as(owner, "STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(diaryJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.studentId").value(owner.getId()))
                .andExpect(jsonPath("$.status").value("PENDING"));

        var mine = dayDiaryRepository.findByStudentIdOrderByDateDesc(owner.getId());
        org.junit.jupiter.api.Assertions.assertEquals(1, mine.size());
        org.junit.jupiter.api.Assertions.assertEquals(LocalDate.of(2026, 8, 25), mine.get(0).getDate());
    }

    @Test
    void foreignStudentCannotDeleteOthersDiary() throws Exception {
        Student owner = newStudent("m4owner");
        Student stranger = newStudent("m4stranger");

        DayDiary diary = new DayDiary();
        diary.setDate(LocalDate.of(2026, 8, 25));
        diary.setDailyActivities("Owner entry");
        diary.setKnowledgeAndSkillsGained("x");
        diary.setAccomplishments("y");
        diary.setStudentId(owner.getId());
        diary = dayDiaryRepository.save(diary);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/diaries/{id}", diary.getId())
                        .with(as(stranger, "STUDENT")))
                .andExpect(status().isForbidden());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/diaries/{id}", diary.getId())
                        .with(as(owner, "STUDENT")))
                .andExpect(status().isNoContent());
    }

    @Test
    void supervisorFeedbackFlattensStudentIdentity() throws Exception {
        Student owner = newStudent("m4feed");

        DayDiary diary = new DayDiary();
        diary.setDate(LocalDate.of(2026, 8, 25));
        diary.setDailyActivities("Entry awaiting review");
        diary.setKnowledgeAndSkillsGained("k");
        diary.setAccomplishments("a");
        diary.setStudentId(owner.getId());
        diary = dayDiaryRepository.save(diary);

        UserEntity supervisor = newUser("m4sup", Role.SUPERVISOR);
        mockMvc.perform(post("/api/diaries/{id}/feedback", diary.getId()).with(as(supervisor, "SUPERVISOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"feedback\":\"Good progress\",\"status\":\"APPROVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mockMvc.perform(get("/api/diaries").with(as(supervisor, "SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].studentName").value("m4feed Tester"))
                .andExpect(jsonPath("$[0].studentNumber").value("m4feed"));
    }

    private UserEntity findUser(Student student) {
        return userRepository.findById(student.getUserId()).orElseThrow();
    }
}
