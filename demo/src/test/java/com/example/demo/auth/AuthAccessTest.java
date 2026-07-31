package com.example.demo.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "student", authorities = "STUDENT")
    void studentCanAccessStudentAreaButNotAdminArea() throws Exception {
        mockMvc.perform(get("/student/dashboard"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "supervisor", authorities = "SUPERVISOR")
    void supervisorCanAccessSupervisorArea() throws Exception {
        mockMvc.perform(get("/supervisor/dashboard"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin", authorities = "ADMIN")
    void adminCanAccessAllAreas() throws Exception {
        mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().isOk());
    }
}
