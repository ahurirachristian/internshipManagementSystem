package com.example.demo.auth;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void studentCanAccessStudentAreaButNotAdminArea() throws Exception {
        mockMvc.perform(get("/student/dashboard").with(user("student").authorities(new SimpleGrantedAuthority("STUDENT"))))
                .andExpect(status().is3xxRedirection());

        mockMvc.perform(get("/admin/dashboard").with(user("student").authorities(new SimpleGrantedAuthority("STUDENT"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void supervisorCanAccessSupervisorArea() throws Exception {
        mockMvc.perform(get("/university/dashboard").with(user("supervisor").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().is3xxRedirection());

        mockMvc.perform(get("/university/credentials").with(user("supervisor").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().isOk());
    }

    @Test
    void adminCanAccessAllAreas() throws Exception {
        mockMvc.perform(get("/admin/dashboard").with(user("admin").authorities(new SimpleGrantedAuthority("ADMIN"))))
                .andExpect(status().isOk());
    }

    @Test
    void supervisorDashboardShowsLinkedUniversityAndStudents() throws Exception {
        mockMvc.perform(get("/university/dashboard").with(user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().is3xxRedirection());

        mockMvc.perform(get("/university/credentials").with(user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Massachusetts Institute of Technology")))
                .andExpect(content().string(containsString("Registered Students")))
                .andExpect(content().string(containsString("Alex")));
    }
}
