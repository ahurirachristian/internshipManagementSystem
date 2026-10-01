package com.example.demo.company;

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
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.evaluation.Evaluation;
import com.example.demo.evaluation.EvaluationRepository;
import com.example.demo.placement.Placement;
import com.example.demo.placement.PlacementRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * PC4 gate: a company's Overview figures come only from its own rows.
 *
 * <p>The scoping claim is the point of this test. A company id on the request would
 * let one company read another's pipeline by incrementing an integer, so the endpoint
 * takes no id at all and the only isolation check available is "does company A's
 * response change when company B gains placements?".
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CompanyAnalyticsTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private PlacementRepository placementRepository;

    @Autowired
    private EvaluationRepository evaluationRepository;

    @Autowired
    private StudentRepository studentRepository;

    private Long companyId(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    private RequestPostProcessor asCompanyUser(String username, Long companyId) {
        UserEntity companyUser = new UserEntity(username, "hashed-" + username, Role.COMPANY);
        companyUser.setCompanyId(companyId);
        companyUser.setMustChangePassword(false);
        userRepository.save(companyUser);
        return user(username).authorities(new SimpleGrantedAuthority("COMPANY"));
    }

    private Student student(String first, String last, Long companyId, LocalDate start) {
        // students.user_id is NOT NULL, so each intern needs its own login account.
        UserEntity account = new UserEntity("intern-" + first.toLowerCase() + "-" + last.toLowerCase()
                + System.nanoTime(), "hash", Role.STUDENT);
        account.setMustChangePassword(false);
        userRepository.save(account);

        Student student = new Student();
        student.setUserId(account.getId());
        student.setFirstName(first);
        student.setLastName(last);
        student.setRegistrationNumber(first + "-" + last);
        student.setStudentNumber("S" + Math.abs((first + last).hashCode()));
        student.setDegreeProgram("Computer Science");
        student.setInternshipCompanyId(companyId);
        student.setStartDate(start);
        return studentRepository.save(student);
    }

    private Placement placement(Long studentId, Long companyId, Placement.Status status) {
        return placementRepository.save(new Placement(studentId, companyId, "Uni Sup", "Co Sup", status));
    }

    @Test
    void reportsEveryStatusAndZeroesTheRest() throws Exception {
        Long companyId = companyId("Analytics Co");
        Student intern = student("Ada", "Lovelace", companyId, LocalDate.of(2026, 1, 5));
        placement(intern.getId(), companyId, Placement.Status.ACTIVE);
        placement(intern.getId(), companyId, Placement.Status.ACTIVE);
        placement(intern.getId(), companyId, Placement.Status.OFFERED);

        mockMvc.perform(get("/api/companies/me/analytics").with(asCompanyUser("compA", companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.offers.ACTIVE").value(2))
                .andExpect(jsonPath("$.offers.OFFERED").value(1))
                // All six statuses are present even at zero, so the donut has no gaps
                // and the frontend never has to guess a missing key.
                .andExpect(jsonPath("$.offers.PENDING").value(0))
                .andExpect(jsonPath("$.offers.ASSIGNED").value(0))
                .andExpect(jsonPath("$.offers.COMPLETED").value(0))
                .andExpect(jsonPath("$.offers.CANCELLED").value(0))
                .andExpect(jsonPath("$.internCount").value(1))
                .andExpect(jsonPath("$.avgEvaluation").doesNotExist());
    }

    @Test
    void companyASeesOnlyItsOwnPipeline() throws Exception {
        Long mine = companyId("Scoped Mine");
        Long theirs = companyId("Scoped Theirs");

        Student myIntern = student("Mine", "One", mine, LocalDate.of(2026, 1, 5));
        placement(myIntern.getId(), mine, Placement.Status.ACTIVE);
        Student theirIntern = student("Theirs", "Two", theirs, LocalDate.of(2026, 1, 5));
        placement(theirIntern.getId(), theirs, Placement.Status.ACTIVE);
        placement(theirIntern.getId(), theirs, Placement.Status.CANCELLED);

        String body = mockMvc.perform(get("/api/companies/me/analytics").with(asCompanyUser("compB", mine)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.offers.ACTIVE").value(1))
                .andExpect(jsonPath("$.offers.CANCELLED").value(0))
                .andExpect(jsonPath("$.internCount").value(1))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("Mine").doesNotContain("Theirs");
    }

    @Test
    void evaluationAverageIsCompanyScopedThroughThePlacement() throws Exception {
        Long mine = companyId("Eval Mine");
        Long theirs = companyId("Eval Theirs");

        Student myIntern = student("Eval", "Mine", mine, LocalDate.of(2026, 1, 5));
        Placement myPlacement = placement(myIntern.getId(), mine, Placement.Status.COMPLETED);
        Student theirIntern = student("Eval", "Theirs", theirs, LocalDate.of(2026, 1, 5));
        Placement theirPlacement = placement(theirIntern.getId(), theirs, Placement.Status.COMPLETED);

        Evaluation mineEval = new Evaluation(myIntern.getId(), myPlacement.getId(), "INDUSTRIAL",
                "co.sup", 90, 90, 90, 90, 90, 90, 90, 90);
        evaluationRepository.save(mineEval);

        // A perfect score at another company must not lift this company's average.
        Evaluation theirEval = new Evaluation(theirIntern.getId(), theirPlacement.getId(), "INDUSTRIAL",
                "co.sup", 100, 100, 100, 100, 100, 100, 100, 100);
        evaluationRepository.save(theirEval);

        mockMvc.perform(get("/api/companies/me/analytics").with(asCompanyUser("compC", mine)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avgEvaluation").value(90.0))
                .andExpect(jsonPath("$.evaluationCount").value(1))
                .andExpect(jsonPath("$.interns[0].evaluated").value(true))
                .andExpect(jsonPath("$.interns[0].averageGrade").value(90.0));
    }

    @Test
    void internProgressReportsTheTwoTrackedFacts() throws Exception {
        Long companyId = companyId("Progress Co");

        Student started = student("Started", "Intern", companyId, LocalDate.of(2026, 2, 1));
        placement(started.getId(), companyId, Placement.Status.ACTIVE);

        Student notStarted = student("Pending", "Intern", companyId, null);
        placement(notStarted.getId(), companyId, Placement.Status.OFFERED);

        String body = mockMvc.perform(get("/api/companies/me/analytics").with(asCompanyUser("compD", companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interns.length()").value(2))
                .andReturn().getResponse().getContentAsString();

        // Started but not yet evaluated is half complete; the other intern is not.
        assertThat(body).contains("\"progressPercent\":50").contains("\"progressPercent\":0");
    }

    @Test
    void companyWithoutPlacementsGetsAnEmptyShapeNotAnError() throws Exception {
        Long companyId = companyId("Quiet Co");

        mockMvc.perform(get("/api/companies/me/analytics").with(asCompanyUser("compE", companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.internCount").value(0))
                .andExpect(jsonPath("$.interns.length()").value(0))
                .andExpect(jsonPath("$.offers.PENDING").value(0))
                .andExpect(jsonPath("$.avgEvaluation").doesNotExist());
    }

    @Test
    void anInternWithSeveralPlacementsIsOneRowNotSeveral() throws Exception {
        Long companyId = companyId("Multi Placement Co");
        Student intern = student("Repeat", "Intern", companyId, LocalDate.of(2026, 3, 1));
        placement(intern.getId(), companyId, Placement.Status.PENDING);
        placement(intern.getId(), companyId, Placement.Status.ACTIVE);
        // A cancelled row must not make an active intern read as cancelled.
        placement(intern.getId(), companyId, Placement.Status.CANCELLED);

        mockMvc.perform(get("/api/companies/me/analytics").with(asCompanyUser("compF", companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.internCount").value(1))
                .andExpect(jsonPath("$.interns.length()").value(1))
                .andExpect(jsonPath("$.interns[0].placementStatus").value("ACTIVE"))
                // The offers funnel still counts every placement, cancelled included.
                .andExpect(jsonPath("$.offers.PENDING").value(1))
                .andExpect(jsonPath("$.offers.ACTIVE").value(1))
                .andExpect(jsonPath("$.offers.CANCELLED").value(1));
    }

    @Test
    void nonCompanyRolesCannotReadAnalytics() throws Exception {
        UserEntity studentUser = new UserEntity("studentreader", "hash", Role.STUDENT);
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        mockMvc.perform(get("/api/companies/me/analytics")
                        .with(user(studentUser.getUsername()).authorities(new SimpleGrantedAuthority("STUDENT"))))
                .andExpect(status().isForbidden());
    }
}
