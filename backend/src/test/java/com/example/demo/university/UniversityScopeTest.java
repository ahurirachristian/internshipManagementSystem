package com.example.demo.university;

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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.UserRepository;

/**
 * P5 gate (R5/L7): a university supervisor works only inside their own
 * university; cross-tenant targets 404, privileged targets 403.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UniversityScopeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    private Long uniA() {
        return userRepository.findByUsername("university").orElseThrow().getUniversityId();
    }

    private Long uniB() {
        return userRepository.findByUsername("kyu").orElseThrow().getUniversityId();
    }

    private RequestPostProcessor asSupervisorA() {
        return user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    private RequestPostProcessor asStudent() {
        return user("plainstudent").authorities(new SimpleGrantedAuthority("STUDENT"));
    }

    private Long registerStudentIn(Long universityId) throws Exception {
        String username = "scope" + System.nanoTime();
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\","
                                + "\"email\":\"" + username + "@example.com\","
                                + "\"universityId\":" + universityId + ","
                                + "\"password\":\"secret123\",\"confirmPassword\":\"secret123\"}"))
                .andExpect(status().isCreated());
        return userRepository.findByUsername(username).orElseThrow().getId();
    }

    @Test
    void listIsScopedToTheCallersUniversity() throws Exception {
        Long ownId = registerStudentIn(uniA());
        Long otherId = registerStudentIn(uniB());

        String body = mockMvc.perform(get("/api/university/users").with(asSupervisorA()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(body).contains("\"id\":" + ownId);
        org.assertj.core.api.Assertions.assertThat(body).doesNotContain("\"id\":" + otherId);
        org.assertj.core.api.Assertions.assertThat(body).doesNotContain("\"username\":\"admin\"");
    }

    @Test
    void supervisorCanCreateAssignAndDisableWithinOwnUniversity() throws Exception {
        String username = "newperson" + System.nanoTime();
        mockMvc.perform(post("/api/university/users").with(asSupervisorA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"role\":\"STUDENT\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.universityId").value(uniA()))
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        Long id = userRepository.findByUsername(username).orElseThrow().getId();

        mockMvc.perform(post("/api/university/users/" + id + "/role").with(asSupervisorA())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"SUPERVISOR\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("SUPERVISOR"));

        mockMvc.perform(post("/api/university/users/" + id + "/enabled").with(asSupervisorA())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    void createForcesTheCallersUniversityEvenIfAnotherIsSupplied() throws Exception {
        String username = "forceduni" + System.nanoTime();
        mockMvc.perform(post("/api/university/users").with(asSupervisorA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"role\":\"STUDENT\",\"universityId\":" + uniB() + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.universityId").value(uniA()));
    }

    @Test
    void crossUniversityTargetIsNotFound() throws Exception {
        Long otherId = registerStudentIn(uniB());

        mockMvc.perform(post("/api/university/users/" + otherId + "/role").with(asSupervisorA())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"SUPERVISOR\"}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/university/users/" + otherId + "/enabled").with(asSupervisorA())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminTargetsAreForbiddenToUniversitySupervisors() throws Exception {
        Long adminId = userRepository.findByUsername("admin").orElseThrow().getId();

        mockMvc.perform(post("/api/university/users/" + adminId + "/role").with(asSupervisorA())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"STUDENT\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/university/users/" + adminId + "/enabled").with(asSupervisorA())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void onlyStudentOrSupervisorRolesCanBeAssigned() throws Exception {
        Long ownId = registerStudentIn(uniA());

        mockMvc.perform(post("/api/university/users/" + ownId + "/role").with(asSupervisorA())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/university/users").with(asSupervisorA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"bad" + System.nanoTime() + "\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void studentsCannotUseTheUniversityEndpoints() throws Exception {
        mockMvc.perform(get("/api/university/users").with(asStudent()))
                .andExpect(status().isForbidden());
    }

    @Test
    void supervisorResetIsScopedToOwnUniversity() throws Exception {
        Long ownId = registerStudentIn(uniA());
        Long otherId = registerStudentIn(uniB());
        Long adminId = userRepository.findByUsername("admin").orElseThrow().getId();

        mockMvc.perform(post("/api/users/" + ownId + "/reset").with(asSupervisorA()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tempPassword").isNotEmpty());
        mockMvc.perform(post("/api/users/" + otherId + "/reset").with(asSupervisorA()))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/users/" + adminId + "/reset").with(asSupervisorA()))
                .andExpect(status().isForbidden());
    }
}
