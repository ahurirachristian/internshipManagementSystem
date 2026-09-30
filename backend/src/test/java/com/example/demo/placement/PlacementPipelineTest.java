package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
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

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.notification.NotificationRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.supervisor.UniversitySupervisor;
import com.example.demo.supervisor.UniversitySupervisorRepository;

/**
 * P7 gate (R8/R9/L9): the offer pipeline — company posts an offer
 * (OFFERED), the student's university assigns a supervisor (ASSIGNED) or
 * declines (CANCELLED), with scoped notifications at every step.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlacementPipelineTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private UniversitySupervisorRepository universitySupervisorRepository;

    @Autowired
    private PlacementRepository placementRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private Long uniA() {
        return userRepository.findByUsername("university").orElseThrow().getUniversityId();
    }

    private Long uniB() {
        return userRepository.findByUsername("kyu").orElseThrow().getUniversityId();
    }

    private RequestPostProcessor asCompany(Long companyId) {
        String username = "pipecompany" + suffix();
        UserEntity companyUser = new UserEntity(username, "hash", Role.COMPANY);
        companyUser.setCompanyId(companyId);
        companyUser.setMustChangePassword(false);
        userRepository.save(companyUser);
        return user(username).authorities(new SimpleGrantedAuthority("COMPANY"));
    }

    private RequestPostProcessor asSupervisorOf(Long universityId) {
        String username = "pipereviewer" + suffix();
        UserEntity supervisor = new UserEntity(username, "hash", Role.SUPERVISOR);
        supervisor.setUniversityId(universityId);
        supervisor.setMustChangePassword(false);
        userRepository.save(supervisor);
        return user(username).authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    private Long createCompany(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    /** A student (with a login) plus a university-supervisor row of the same university. */
    private Student createStudent(Long universityId) {
        String username = "pipestudent" + suffix();
        UserEntity studentUser = new UserEntity(username, "hash", Role.STUDENT);
        studentUser.setUniversityId(universityId);
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        Student student = new Student();
        student.setUserId(studentUser.getId());
        student.setUniversityId(universityId);
        student.setFirstName("Pipe");
        student.setLastName("Student");
        student.setStudentNumber("PN" + suffix());
        student.setRegistrationNumber("REG" + suffix());
        student.setDegreeProgram("BSc IT");
        return studentRepository.save(student);
    }

    /** A university supervisor row (backed by its own user for notifications). */
    private UniversitySupervisor createUniversitySupervisorRow(Long universityId) {
        String username = "pipeassignee" + suffix();
        UserEntity user = new UserEntity(username, "hash", Role.SUPERVISOR);
        user.setUniversityId(universityId);
        user.setMustChangePassword(false);
        userRepository.save(user);

        UniversitySupervisor row = new UniversitySupervisor();
        row.setUserId(user.getId());
        row.setUniversityId(universityId);
        row.setFirstName("Ada");
        row.setLastName("Assignee");
        return universitySupervisorRepository.save(row);
    }

    private Long offer(Student student, Long companyId, RequestPostProcessor asCompany) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/placements").with(asCompany)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":" + student.getId()
                                + ",\"offerNote\":\"Exciting internship\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OFFERED"))
                .andExpect(jsonPath("$.companyId").value(companyId))
                .andReturn();
        Matcher matcher = Pattern.compile("\"id\":(\\d+)").matcher(result.getResponse().getContentAsString());
        assertThat(matcher.find()).isTrue();
        return Long.parseLong(matcher.group(1));
    }

    @Test
    void offerForcesOwnCompanyAndNotifiesTheUniversity() throws Exception {
        Long companyId = createCompany("Offer Co " + suffix());
        Long otherCompanyId = createCompany("Rival Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        RequestPostProcessor company = asCompany(companyId);

        // A spoofed companyId in the body is ignored (L8).
        MvcResult result = mockMvc.perform(post("/api/placements").with(company)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":" + student.getId()
                                + ",\"companyId\":" + otherCompanyId + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.companyId").value(companyId))
                .andExpect(jsonPath("$.status").value("OFFERED"))
                .andReturn();
        Matcher matcher = Pattern.compile("\"id\":(\\d+)").matcher(result.getResponse().getContentAsString());
        assertThat(matcher.find()).isTrue();
        Long placementId = Long.parseLong(matcher.group(1));
        assertThat(placementRepository.findById(placementId).orElseThrow().getCompanyId())
                .isEqualTo(companyId);

        // University supervisors (via their row) and admins are notified.
        assertThat(notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(row.getUserId()))
                .anyMatch(n -> "PLACEMENT_OFFER".equals(n.getType())
                        && "/university/placements".equals(n.getLink()));

        Long adminId = userRepository.findByUsername("admin").orElseThrow().getId();
        assertThat(notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(adminId))
                .anyMatch(n -> "PLACEMENT_OFFER".equals(n.getType()));
    }

    @Test
    void approveAssignsSupervisorAndNotifiesAllThreeParties() throws Exception {
        Long companyId = createCompany("Approve Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        RequestPostProcessor company = asCompany(companyId);
        Long placementId = offer(student, companyId, company);

        mockMvc.perform(post("/api/placements/" + placementId + "/approve")
                        .with(asSupervisorOf(uniA()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universitySupervisorId\":" + row.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.universitySupervisorId").value(row.getId()))
                .andExpect(jsonPath("$.universitySupervisor").value("Ada Assignee"));

        // Student, company user, and the assigned supervisor are all notified.
        assertThat(notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(student.getUserId()))
                .anyMatch(n -> "PLACEMENT_APPROVED".equals(n.getType()));
        UserEntity companyUser = userRepository.findByCompanyId(companyId).stream()
                .filter(u -> "COMPANY".equals(u.getRole().name())).findFirst().orElseThrow();
        assertThat(notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(companyUser.getId()))
                .anyMatch(n -> "PLACEMENT_APPROVED".equals(n.getType()));
        assertThat(notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(row.getUserId()))
                .anyMatch(n -> "PLACEMENT_APPROVED".equals(n.getType()));

        // The student's /me endpoint now shows the supervisor.
        mockMvc.perform(get("/api/placements/me")
                        .with(user(userRepository.findById(student.getUserId()).orElseThrow().getUsername())
                                .authorities(new SimpleGrantedAuthority("STUDENT"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.universitySupervisor").value("Ada Assignee"));
    }

    @Test
    void wrongUniversitySupervisorIsRejected() throws Exception {
        Long companyId = createCompany("Wrong Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor otherUniRow = createUniversitySupervisorRow(uniB());
        Long placementId = offer(student, companyId, asCompany(companyId));

        mockMvc.perform(post("/api/placements/" + placementId + "/approve")
                        .with(asSupervisorOf(uniA()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universitySupervisorId\":" + otherUniRow.getId() + "}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void crossUniversityReviewerIsNotFound() throws Exception {
        Long companyId = createCompany("Cross Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = offer(student, companyId, asCompany(companyId));

        mockMvc.perform(post("/api/placements/" + placementId + "/approve")
                        .with(asSupervisorOf(uniB()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universitySupervisorId\":" + row.getId() + "}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void anotherCompanyCannotReviewAnOffer() throws Exception {
        Long companyId = createCompany("Mine Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = offer(student, companyId, asCompany(companyId));

        mockMvc.perform(post("/api/placements/" + placementId + "/approve")
                        .with(asCompany(createCompany("Sneaky Co " + suffix())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universitySupervisorId\":" + row.getId() + "}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/placements/" + placementId + "/reject")
                        .with(asCompany(companyId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectCancelsAndNotifiesStudentAndCompany() throws Exception {
        Long companyId = createCompany("Reject Co " + suffix());
        Student student = createStudent(uniA());
        RequestPostProcessor company = asCompany(companyId);
        Long placementId = offer(student, companyId, company);

        mockMvc.perform(post("/api/placements/" + placementId + "/reject").with(asSupervisorOf(uniA())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        assertThat(notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(student.getUserId()))
                .anyMatch(n -> "PLACEMENT_REJECTED".equals(n.getType()));
        UserEntity companyUser = userRepository.findByCompanyId(companyId).stream()
                .filter(u -> "COMPANY".equals(u.getRole().name())).findFirst().orElseThrow();
        assertThat(notificationRepository
                .findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(companyUser.getId()))
                .anyMatch(n -> "PLACEMENT_REJECTED".equals(n.getType()));
    }
}
