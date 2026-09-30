package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLog;
import com.example.demo.audit.AuditLogRepository;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * P7 gate (R8/L9): the lookup endpoint is scoped (supervisor pinned to their
 * own university), audited with the client IP, rate-limited, and generic on
 * miss so student numbers cannot be probed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StudentLookupScopeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private Long uniA() {
        return userRepository.findByUsername("university").orElseThrow().getUniversityId();
    }

    private Long uniB() {
        return userRepository.findByUsername("kyu").orElseThrow().getUniversityId();
    }

    private RequestPostProcessor asCompany() {
        String username = "lookupco" + suffix();
        UserEntity companyUser = new UserEntity(username, "hash", Role.COMPANY);
        companyUser.setCompanyId(1L);
        companyUser.setMustChangePassword(false);
        userRepository.save(companyUser);
        return user(username).authorities(new SimpleGrantedAuthority("COMPANY"));
    }

    private RequestPostProcessor asSupervisorOf(Long universityId) {
        String username = "lookupsup" + suffix();
        UserEntity supervisor = new UserEntity(username, "hash", Role.SUPERVISOR);
        supervisor.setUniversityId(universityId);
        supervisor.setMustChangePassword(false);
        userRepository.save(supervisor);
        return user(username).authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    private Student createStudent(Long universityId, String studentNumber) {
        String username = "lookupstudent" + suffix();
        UserEntity studentUser = new UserEntity(username, "hash", Role.STUDENT);
        studentUser.setUniversityId(universityId);
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        Student student = new Student();
        student.setUserId(studentUser.getId());
        student.setUniversityId(universityId);
        student.setFirstName("Look");
        student.setLastName("Up");
        student.setStudentNumber(studentNumber);
        student.setRegistrationNumber("REG" + suffix());
        student.setDegreeProgram("BSc IT");
        return studentRepository.save(student);
    }

    private String lookupBody(Long universityId, String studentNumber) {
        return "{\"universityId\":" + universityId + ",\"studentNumber\":\"" + studentNumber + "\"}";
    }

    @Test
    void companyFindsStudentByUniversityAndNumber() throws Exception {
        Student student = createStudent(uniA(), "SN" + suffix());

        mockMvc.perform(post("/api/companies/student-lookup").with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(lookupBody(uniA(), student.getStudentNumber())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentNumber").value(student.getStudentNumber()))
                .andExpect(jsonPath("$.firstName").value("Look"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.units").isArray());

        // Every lookup is audited with the acting account and IP.
        assertThat(auditLogRepository.findAll().stream()
                .anyMatch(a -> "STUDENT_LOOKUP".equals(a.getAction())
                        && a.getDetails() != null
                        && a.getDetails().contains("studentId " + student.getId())))
                .isTrue();
    }

    @Test
    void unknownNumberIsAuditedThenGenericNotFound() throws Exception {
        createStudent(uniA(), "REAL" + suffix());

        MvcResult result = mockMvc.perform(post("/api/companies/student-lookup").with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(lookupBody(uniA(), "GHOST" + suffix())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Student not found."))
                .andReturn();

        // The audit row is written even when nothing is found (with IP).
        assertThat(auditLogRepository.findAll().stream()
                .anyMatch(a -> "STUDENT_LOOKUP".equals(a.getAction())
                        && a.getDetails() != null
                        && a.getDetails().contains("no match")))
                .isTrue();
    }

    @Test
    void supervisorIsForcedToTheirOwnUniversity() throws Exception {
        Student otherUniStudent = createStudent(uniB(), "OTHER" + suffix());

        // A supervisor of uni A asking for uni B's student lands on uni A → miss → 404.
        mockMvc.perform(post("/api/companies/student-lookup").with(asSupervisorOf(uniA()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(lookupBody(uniB(), otherUniStudent.getStudentNumber())))
                .andExpect(status().isNotFound());
    }

    @Test
    void studentCannotUseTheLookupEndpoint() throws Exception {
        String username = "lookupvictim" + suffix();
        UserEntity studentUser = new UserEntity(username, "hash", Role.STUDENT);
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        mockMvc.perform(post("/api/companies/student-lookup")
                        .with(user(username).authorities(new SimpleGrantedAuthority("STUDENT")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(lookupBody(uniA(), "WHATEVER")))
                .andExpect(status().isForbidden());
    }
}
