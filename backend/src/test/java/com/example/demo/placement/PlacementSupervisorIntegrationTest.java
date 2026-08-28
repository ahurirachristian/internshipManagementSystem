package com.example.demo.placement;

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
import org.springframework.transaction.annotation.Transactional;

/**
 * M5 gate (MIGRATION_PLAN.md): typed supervisor ids ride beside legacy
 * strings, the supervisors endpoint no longer leaks hashes, and the
 * credential generator is retired.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlacementSupervisorIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private SimpleGrantedAuthority auth(String role) {
        return new SimpleGrantedAuthority(role);
    }

    @Test
    void placementCreationResolvesTypedSupervisorIds() throws Exception {
        mockMvc.perform(post("/api/placements")
                        .with(user("admin").authorities(auth("ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":1,\"companyId\":1,"
                                + "\"universitySupervisor\":\"David Ssemakula\","
                                + "\"companySupervisor\":\"Grace Nabatanzi\",\"status\":\"ACTIVE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.universitySupervisorId").isNumber())
                .andExpect(jsonPath("$.companySupervisorId").isNumber());
    }

    @Test
    void evaluationCreationResolvesSupervisorUserId() throws Exception {
        mockMvc.perform(post("/api/evaluations")
                        .with(user("admin").authorities(auth("ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":1,\"supervisorType\":\"UNIVERSITY\","
                                + "\"supervisorUsername\":\"university\","
                                + "\"punctuality\":8,\"practicalWorkEthics\":7,\"attendance\":9,"
                                + "\"workplacePerformance\":8}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.supervisorUserId").isNumber());
    }

    @Test
    void supervisorListDoesNotLeakPasswordHashes() throws Exception {
        mockMvc.perform(get("/api/supervisors").with(user("admin").authorities(auth("ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").exists())
                .andExpect(jsonPath("$[0].password").doesNotExist())
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    @Test
    void retiredCredentialEndpointIsGone() throws Exception {
        mockMvc.perform(post("/api/university/students/credential")
                        .with(user("admin").authorities(auth("ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentNo\":\"x\"}"))
                .andExpect(status().isNotFound());
    }
}
