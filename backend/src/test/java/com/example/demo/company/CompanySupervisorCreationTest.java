package com.example.demo.company;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.email.ConsoleEmailSender;
import com.example.demo.notification.NotificationRepository;
import com.example.demo.supervisor.IndustrialSupervisorRepository;

/**
 * P6 gate (R7/L9/L21): a company provisions its own field supervisors —
 * SUPERVISOR users scoped to the company with linked industrial_supervisor
 * rows, forced first-login password change, credentials email, and a scoped
 * reset endpoint. Cross-company and privileged targets stay out of reach.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CompanySupervisorCreationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private IndustrialSupervisorRepository industrialSupervisorRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private ConsoleEmailSender consoleEmailSender;

    private Long companyId(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    private RequestPostProcessor asCompanyUser(String username, Long companyId) {
        UserEntity companyUser = new UserEntity(username, "hashed-" + username,
                com.example.demo.auth.Role.COMPANY);
        companyUser.setCompanyId(companyId);
        companyUser.setMustChangePassword(false);
        userRepository.save(companyUser);
        return user(username).authorities(new SimpleGrantedAuthority("COMPANY"));
    }

    /** Tests never parse JSON with Jackson (not on the test classpath). */
    private String jsonValue(String body, String field) {
        Matcher matcher = Pattern.compile("\"" + field + "\":\"([^\"]+)\"").matcher(body);
        return matcher.find() ? matcher.group(1) : null;
    }

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    @Test
    void companyCreatesFieldSupervisorWithLinkedRows() throws Exception {
        Long companyId = companyId("Supervisor Co " + suffix());
        RequestPostProcessor me = asCompanyUser("compsup" + suffix(), companyId);

        String email = "field" + suffix() + "@example.com";
        MvcResult result = mockMvc.perform(post("/api/companies/me/supervisors").with(me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Grace\",\"lastName\":\"Nabatanzi\","
                                + "\"email\":\"" + email + "\",\"phone\":\"+256700000001\","
                                + "\"department\":\"Engineering\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("SUPERVISOR"))
                .andExpect(jsonPath("$.companyId").value(companyId))
                .andExpect(jsonPath("$.mustChangePassword").value(true))
                .andReturn();

        String username = jsonValue(result.getResponse().getContentAsString(), "username");
        UserEntity supervisor = userRepository.findByUsername(username).orElseThrow();

        org.assertj.core.api.Assertions.assertThat(supervisor.getCompanyId()).isEqualTo(companyId);
        org.assertj.core.api.Assertions.assertThat(supervisor.getUniversityId()).isNull();
        org.assertj.core.api.Assertions.assertThat(
                industrialSupervisorRepository.findAll().stream()
                        .anyMatch(s -> supervisor.getId().equals(s.getUserId())
                                && companyId.equals(s.getCompanyId())
                                && "Grace".equals(s.getFirstName())
                                && "Nabatanzi".equals(s.getLastName())))
                .isTrue();

        // CREDENTIALS_ISSUED goes to the new supervisor; the email carries the username.
        org.assertj.core.api.Assertions.assertThat(
                notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(supervisor.getId()))
                .anyMatch(n -> "CREDENTIALS_ISSUED".equals(n.getType()));
        org.assertj.core.api.Assertions.assertThat(consoleEmailSender.lastEmail().to()).contains(email);
        org.assertj.core.api.Assertions.assertThat(consoleEmailSender.lastEmail().html()).contains(username);
    }

    @Test
    void listShowsOnlyTheCallersOwnSupervisors() throws Exception {
        Long mine = companyId("List Co " + suffix());
        Long other = companyId("Other Co " + suffix());

        UserEntity own = new UserEntity("ownsup" + suffix(), "hash", com.example.demo.auth.Role.SUPERVISOR);
        own.setCompanyId(mine);
        own.setMustChangePassword(false);
        userRepository.save(own);

        UserEntity theirs = new UserEntity("othsup" + suffix(), "hash", com.example.demo.auth.Role.SUPERVISOR);
        theirs.setCompanyId(other);
        theirs.setMustChangePassword(false);
        userRepository.save(theirs);

        String body = mockMvc.perform(get("/api/companies/me/supervisors")
                        .with(asCompanyUser("complist" + suffix(), mine)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(body).contains(own.getUsername());
        org.assertj.core.api.Assertions.assertThat(body).doesNotContain(theirs.getUsername());
    }

    @Test
    void companyResetsItsOwnFieldSupervisor() throws Exception {
        Long companyId = companyId("Reset Co " + suffix());
        RequestPostProcessor me = asCompanyUser("compreset" + suffix(), companyId);

        String email = "sam" + suffix() + "@example.com";
        mockMvc.perform(post("/api/companies/me/supervisors").with(me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Sam\",\"lastName\":\"Owori\","
                                + "\"email\":\"" + email + "\"}"))
                .andExpect(status().isCreated());

        UserEntity supervisor = userRepository.findByEmail(email).orElseThrow();

        MvcResult reset = mockMvc.perform(post("/api/users/" + supervisor.getId() + "/reset").with(me))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tempPassword").isNotEmpty())
                .andReturn();

        String tempPassword = jsonValue(reset.getResponse().getContentAsString(), "tempPassword");

        // The temp password works once and forces a password change.
        mockMvc.perform(post("/api/login")
                        .param("username", supervisor.getUsername())
                        .param("password", tempPassword))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        // ...and the company still sees (and manages) its supervisor afterwards.
        String body = mockMvc.perform(get("/api/companies/me/supervisors").with(me))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(body)
                .contains("\"username\":\"" + supervisor.getUsername() + "\"");
    }

    @Test
    void companyCannotActOutsideItsScope() throws Exception {
        Long mine = companyId("Scope Co " + suffix());
        Long other = companyId("Far Co " + suffix());
        RequestPostProcessor me = asCompanyUser("compscope" + suffix(), mine);

        UserEntity otherSupervisor = new UserEntity("farsup" + suffix(), "hash",
                com.example.demo.auth.Role.SUPERVISOR);
        otherSupervisor.setCompanyId(other);
        otherSupervisor.setMustChangePassword(false);
        userRepository.save(otherSupervisor);

        // Another company's supervisor cannot be reset (L21).
        mockMvc.perform(post("/api/users/" + otherSupervisor.getId() + "/reset").with(me))
                .andExpect(status().isForbidden());

        // An ADMIN target is out of reach even inside the company's own scope (L7).
        Long adminId = userRepository.findByUsername("admin").orElseThrow().getId();
        mockMvc.perform(post("/api/users/" + adminId + "/reset").with(me))
                .andExpect(status().isForbidden());

        // Duplicate email is rejected.
        String email = "dup" + suffix() + "@example.com";
        mockMvc.perform(post("/api/companies/me/supervisors").with(me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"First\",\"lastName\":\"Person\","
                                + "\"email\":\"" + email + "\"}"))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/companies/me/supervisors").with(me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Second\",\"lastName\":\"Person\","
                                + "\"email\":\"" + email + "\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void studentCannotUseCompanyEndpoints() throws Exception {
        UserEntity student = new UserEntity("compstudent" + suffix(), "hash",
                com.example.demo.auth.Role.STUDENT);
        student.setMustChangePassword(false);
        userRepository.save(student);

        mockMvc.perform(get("/api/companies/me/supervisors")
                        .with(user(student.getUsername()).authorities(new SimpleGrantedAuthority("STUDENT"))))
                .andExpect(status().isForbidden());
    }
}
