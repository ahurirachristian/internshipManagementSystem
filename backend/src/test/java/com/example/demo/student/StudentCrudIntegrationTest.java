package com.example.demo.student;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/**
 * M3 gate (MIGRATION_PLAN.md): the student API speaks the Model-B
 * students table and registration creates a linked Student row.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StudentCrudIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private UserEntity newUser(String username, Role role) {
        return userRepository.save(new UserEntity(username, passwordEncoder.encode("Student@123"), role));
    }

    @Test
    void registrationCreatesModelBStudentRow() throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"m3row\",\"password\":\"Student@123\","
                                + "\"confirmPassword\":\"Student@123\",\"role\":\"STUDENT\","
                                + "\"firstName\":\"Probe\",\"lastName\":\"Three\","
                                + "\"degreeProgram\":\"BSc Computer Science\",\"yearOfStudy\":\"2\"}"))
                .andExpect(status().isCreated());

        UserEntity user = userRepository.findByUsername("m3row").orElseThrow();
        Student student = studentRepository.findByUserId(user.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals("Probe", student.getFirstName());
        org.junit.jupiter.api.Assertions.assertEquals("Three", student.getLastName());
        org.junit.jupiter.api.Assertions.assertEquals(19L, student.getUniversityId());
        org.junit.jupiter.api.Assertions.assertEquals("m3row", student.getStudentNumber());
        org.junit.jupiter.api.Assertions.assertEquals(2, student.getYearOfStudy());
    }

    @Test
    void nonStudentRegistrationDoesNotCreateStudentRow() throws Exception {
        long before = studentRepository.count();
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"m3company\",\"password\":\"Student@123\","
                                + "\"confirmPassword\":\"Student@123\",\"role\":\"COMPANY\"}"))
                .andExpect(status().isCreated());
        org.junit.jupiter.api.Assertions.assertEquals(before, studentRepository.count());
    }

    @Test
    void adminCanCreateAndFetchStudentByCompany() throws Exception {
        UserEntity account = newUser("m3linked", Role.STUDENT);
        Student student = new Student();
        student.setUserId(account.getId());
        student.setUniversityId(19L);
        student.setFirstName("Ada");
        student.setLastName("Okello");
        student.setStudentNumber("m3linked");
        student.setRegistrationNumber("REG-M3");
        student.setDegreeProgram("BSc Software Engineering");
        student = studentRepository.save(student);

        mockMvc.perform(get("/api/students/{id}", student.getId()).with(user("admin").authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Ada"))
                .andExpect(jsonPath("$.studentNumber").value("m3linked"));

        mockMvc.perform(get("/api/students/search?q=ada").with(user("admin").authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].registrationNumber").value("REG-M3"));
    }

    @Test
    void companyScopedLookupUsesExactForeignKey() throws Exception {
        UserEntity account = newUser("m3placed", Role.STUDENT);
        Student student = new Student();
        student.setUserId(account.getId());
        student.setUniversityId(19L);
        student.setFirstName("Nekesa");
        student.setLastName("Wani");
        student.setStudentNumber("m3placed");
        student.setRegistrationNumber("REG-M3B");
        student.setDegreeProgram("BSc IT");
        student.setInternshipCompanyId(9001L);
        studentRepository.save(student);

        mockMvc.perform(get("/api/students/company/{companyId}", 9001L).with(user("admin").authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("COMPANY"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].firstName").value("Nekesa"));
    }
}
