package com.example.demo.placement;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.notification.NotificationRepository;

/**
 * P6 gate (L8): a company owns only its own vacancies — companyId is forced
 * from the session on writes, cross-company updates/deletes are 403, and a
 * new vacancy notifies every admin.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VacancyOwnershipTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private Long companyId(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    private RequestPostProcessor asCompany(String username, Long companyId) {
        UserEntity companyUser = new UserEntity(username, "hashed-" + username,
                com.example.demo.auth.Role.COMPANY);
        companyUser.setCompanyId(companyId);
        companyUser.setMustChangePassword(false);
        UserEntity saved = userRepository.save(companyUser);
        return user(username).authorities(new SimpleGrantedAuthority("COMPANY"));
    }

    private String vacancyBody(Long companyId, String title) {
        return "{\"title\":\"" + title + "\",\"description\":\"Great role\","
                + "\"companyId\":" + companyId + ","
                + "\"location\":\"Kampala\",\"requirements\":\"None\","
                + "\"status\":\"OPEN\",\"deadline\":\"2026-12-31\"}";
    }

    @Test
    void companyCreateForcesItsOwnCompanyId() throws Exception {
        Long mine = companyId("Force Co");
        Long other = companyId("Other Co");
        RequestPostProcessor me = asCompany("vacforce" + System.nanoTime(), mine);

        String response = mockMvc.perform(post("/api/vacancies").with(me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vacancyBody(other, "Spoofed vacancy")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.companyId").value(mine))
                .andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(response).contains("Spoofed vacancy");
    }

    @Test
    void companyCannotUpdateAnotherCompanysVacancy() throws Exception {
        Long mine = companyId("Mine Co");
        Long other = companyId("Rival Co");
        RequestPostProcessor me = asCompany("vacrival" + System.nanoTime(), mine);

        Vacancy theirs = vacancyRepository.save(new Vacancy("Rival role", "Their opening",
                other, "Kampala", "None", "OPEN", LocalDate.of(2026, 12, 31), LocalDate.now()));

        mockMvc.perform(put("/api/vacancies/" + theirs.getId()).with(me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vacancyBody(other, "Hijacked title")))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/vacancies/" + theirs.getId()).with(me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vacancyBody(mine, "Attempted take-over")))
                .andExpect(status().isForbidden());
    }

    @Test
    void companyCannotDeleteAnotherCompanysVacancy() throws Exception {
        Long mine = companyId("Delete Co");
        Long other = companyId("Victim Co");
        RequestPostProcessor me = asCompany("vacdel" + System.nanoTime(), mine);

        Vacancy theirs = vacancyRepository.save(new Vacancy("Victim role", "Their opening",
                other, "Kampala", "None", "OPEN", LocalDate.of(2026, 12, 31), LocalDate.now()));

        mockMvc.perform(delete("/api/vacancies/" + theirs.getId()).with(me))
                .andExpect(status().isForbidden());
    }

    @Test
    void companyUpdatesAndDeletesItsOwnVacancy() throws Exception {
        Long mine = companyId("Own Co");
        RequestPostProcessor me = asCompany("vacown" + System.nanoTime(), mine);

        Vacancy mineVacancy = vacancyRepository.save(new Vacancy("My role", "My opening",
                mine, "Kampala", "None", "OPEN", LocalDate.of(2026, 12, 31), LocalDate.now()));

        mockMvc.perform(put("/api/vacancies/" + mineVacancy.getId()).with(me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vacancyBody(mine, "Updated my role")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated my role"))
                .andExpect(jsonPath("$.companyId").value(mine));

        mockMvc.perform(delete("/api/vacancies/" + mineVacancy.getId()).with(me))
                .andExpect(status().isNoContent());
    }

    @Test
    void adminCanManageAnyVacancy() throws Exception {
        RequestPostProcessor admin = user("vacadmin" + System.nanoTime())
                .authorities(new SimpleGrantedAuthority("ADMIN"));

        Vacancy anyones = vacancyRepository.save(new Vacancy("Admin target", "Opening",
                companyId("Target Co"), "Kampala", "None", "OPEN",
                LocalDate.of(2026, 12, 31), LocalDate.now()));

        mockMvc.perform(put("/api/vacancies/" + anyones.getId()).with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vacancyBody(999L, "Admin edited")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyId").value(999));

        mockMvc.perform(delete("/api/vacancies/" + anyones.getId()).with(admin))
                .andExpect(status().isNoContent());
    }

    @Test
    void newVacancyNotifiesAllAdmins() throws Exception {
        Long mine = companyId("Notify Co");
        RequestPostProcessor me = asCompany("vacnotify" + System.nanoTime(), mine);
        Long adminId = userRepository.findByUsername("admin").orElseThrow().getId();

        mockMvc.perform(post("/api/vacancies").with(me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vacancyBody(mine, "Announced role")))
                .andExpect(status().isCreated());

        org.assertj.core.api.Assertions.assertThat(
                notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(adminId))
                .anyMatch(n -> "NEW_VACANCY".equals(n.getType())
                        && n.getLink() != null && n.getLink().contains("/admin/marketplace"));
    }
}
