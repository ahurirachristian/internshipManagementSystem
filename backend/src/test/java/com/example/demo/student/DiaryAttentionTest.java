package com.example.demo.student;

import static org.assertj.core.api.Assertions.assertThat;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/**
 * PC5 gate: the supervisor attention list.
 *
 * <p>The load-bearing case is the student who has <em>never</em> filed. A
 * "latest diary per student" inner join silently drops them, which would make the
 * list say everything is fine precisely when a student is least engaged. That case
 * is asserted here rather than assumed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DiaryAttentionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private DayDiaryRepository dayDiaryRepository;

    private static final Long MY_UNIVERSITY = 4242L;
    private static final Long OTHER_UNIVERSITY = 5252L;

    private Student student(String label, Long universityId) {
        UserEntity account = new UserEntity("attn-" + label + System.nanoTime(), "hash", Role.STUDENT);
        account.setMustChangePassword(false);
        userRepository.save(account);

        Student student = new Student();
        student.setUserId(account.getId());
        student.setUniversityId(universityId);
        student.setFirstName(label);
        student.setLastName("Student");
        student.setStudentNumber("S-" + label);
        student.setRegistrationNumber("R-" + label);
        student.setDegreeProgram("BSc");
        return studentRepository.save(student);
    }

    private DayDiary diary(Student student, LocalDate date) {
        DayDiary entry = new DayDiary();
        entry.setStudentId(student.getId());
        entry.setUniversityId(student.getUniversityId());
        entry.setDate(date);
        entry.setDailyActivities("Worked");
        entry.setKnowledgeAndSkillsGained("Learned");
        entry.setAccomplishments("Shipped");
        return dayDiaryRepository.save(entry);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor asSupervisor(Long universityId) {
        UserEntity supervisor = new UserEntity("sup-" + universityId + System.nanoTime(), "hash", Role.SUPERVISOR);
        supervisor.setUniversityId(universityId);
        supervisor.setMustChangePassword(false);
        userRepository.save(supervisor);
        return user(supervisor.getUsername()).authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    @Test
    void listsStudentsWithNoRecentEntryAndMarksThoseWhoNeverFiled() throws Exception {
        Student quiet = student("Quiet", MY_UNIVERSITY);
        diary(quiet, LocalDate.now().minusDays(9));

        Student neverFiled = student("Never", MY_UNIVERSITY);

        Student current = student("Current", MY_UNIVERSITY);
        diary(current, LocalDate.now());

        String body = mockMvc.perform(get("/api/university/stats")
                        .with(asSupervisor(MY_UNIVERSITY)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attention.windowHours").value(48))
                .andExpect(jsonPath("$.attention.total").value(2))
                .andExpect(jsonPath("$.attention.neverFiled").value(1))
                .andReturn().getResponse().getContentAsString();

        // Scoped to the attention block: the rest of /stats legitimately mentions the
        // current student in its diaries.recent and evaluations sections, so a
        // whole-body assertion would pass or fail for the wrong reason.
        String attention = attentionBlock(body);
        assertThat(attention).doesNotContain("Current");
        assertThat(attention).contains("Quiet");
        assertThat(attention).contains("Never");
    }

    /** The trailing "attention" object of the stats payload. */
    private String attentionBlock(String body) {
        int at = body.indexOf("\"attention\":");
        return at < 0 ? "" : body.substring(at);
    }

    @Test
    void aNeverFiledStudentIsNeverReportedAsZeroDaysAgo() throws Exception {
        student("Never", MY_UNIVERSITY);

        String body = mockMvc.perform(get("/api/university/stats").with(asSupervisor(MY_UNIVERSITY)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attention.students[0].neverFiled").value(true))
                .andExpect(jsonPath("$.attention.students[0].daysSinceLastEntry").doesNotExist())
                .andExpect(jsonPath("$.attention.students[0].lastEntryDate").doesNotExist())
                .andExpect(jsonPath("$.attention.students[0].neverFiled").value(true))
                .andReturn().getResponse().getContentAsString();

        assertThat(attentionBlock(body)).doesNotContain("\"daysSinceLastEntry\":0");
    }

    @Test
    void aStaleEntryReportsHowStale() throws Exception {
        Student stale = student("Stale", MY_UNIVERSITY);
        diary(stale, LocalDate.now().minusDays(5));

        mockMvc.perform(get("/api/university/stats").with(asSupervisor(MY_UNIVERSITY)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attention.students[0].neverFiled").value(false))
                .andExpect(jsonPath("$.attention.students[0].daysSinceLastEntry").value(5));
    }

    @Test
    void doesNotLeakAnotherUniversitiesStudents() throws Exception {
        student("Theirs", OTHER_UNIVERSITY);

        String body = mockMvc.perform(get("/api/university/stats").with(asSupervisor(MY_UNIVERSITY)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attention.total").value(0))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("Theirs");
    }

    @Test
    void anEntryExactlyOnTheWindowBoundaryIsNotFlagged() throws Exception {
        Student boundary = student("Boundary", MY_UNIVERSITY);
        diary(boundary, LocalDate.now().minusDays(2));

        // The window is "no entry in the last 48h"; an entry dated two days ago is
        // inside it, so flagging it would be a false alarm.
        mockMvc.perform(get("/api/university/stats").with(asSupervisor(MY_UNIVERSITY)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attention.total").value(0));
    }
}
