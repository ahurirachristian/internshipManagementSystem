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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogRepository;
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
 * PC8a gate: the completed lifecycle — PENDING → OFFERED (offer),
 * ASSIGNED → ACTIVE (start), ACTIVE → COMPLETED (complete).
 *
 * <p>Guards follow the approve/reject shape: status guard (409), then scope
 * (cross-company 403 / cross-university 404), then role (COMPANY or ADMIN,
 * else 403). Every transition writes an audit row and notifies the student and
 * the placement's university supervisor.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlacementLifecycleTest {

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

    private RequestPostProcessor asCompany(Long companyId) {
        String username = "lifeccomp" + suffix();
        UserEntity companyUser = new UserEntity(username, "hash", Role.COMPANY);
        companyUser.setCompanyId(companyId);
        companyUser.setMustChangePassword(false);
        userRepository.save(companyUser);
        return user(username).authorities(new SimpleGrantedAuthority("COMPANY"));
    }

    private RequestPostProcessor asSupervisorOf(Long universityId) {
        String username = "lifecsup" + suffix();
        UserEntity supervisor = new UserEntity(username, "hash", Role.SUPERVISOR);
        supervisor.setUniversityId(universityId);
        supervisor.setMustChangePassword(false);
        userRepository.save(supervisor);
        return user(username).authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    private RequestPostProcessor asAdmin() {
        return user("admin").authorities(new SimpleGrantedAuthority("ADMIN"));
    }

    private Long createCompany(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    /** A student (with a login) at the given university. */
    private Student createStudent(Long universityId) {
        String username = "lifestud" + suffix();
        UserEntity studentUser = new UserEntity(username, "hash", Role.STUDENT);
        studentUser.setUniversityId(universityId);
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        Student student = new Student();
        student.setUserId(studentUser.getId());
        student.setUniversityId(universityId);
        student.setFirstName("Life");
        student.setLastName("Student");
        student.setStudentNumber("LN" + suffix());
        student.setRegistrationNumber("LREG" + suffix());
        student.setDegreeProgram("BSc IT");
        return studentRepository.save(student);
    }

    /** A university-supervisor row (backed by its own user for notifications). */
    private UniversitySupervisor createUniversitySupervisorRow(Long universityId) {
        String username = "lifeassign" + suffix();
        UserEntity user = new UserEntity(username, "hash", Role.SUPERVISOR);
        user.setUniversityId(universityId);
        user.setMustChangePassword(false);
        userRepository.save(user);

        UniversitySupervisor row = new UniversitySupervisor();
        row.setUserId(user.getId());
        row.setUniversityId(universityId);
        row.setFirstName("Lina");
        row.setLastName("Assignee");
        return universitySupervisorRepository.save(row);
    }

    private Placement placement(Student student, Long companyId, Long universitySupervisorId,
            Placement.Status status) {
        Placement placement = new Placement();
        placement.setStudentId(student.getId());
        placement.setCompanyId(companyId);
        placement.setUniversityId(student.getUniversityId());
        placement.setUniversitySupervisor("Lina Assignee");
        placement.setCompanySupervisor("Field Supervisor");
        placement.setUniversitySupervisorId(universitySupervisorId);
        placement.setStatus(status);
        return placementRepository.save(placement);
    }

    private Long placementIdOf(Placement placement) {
        return placement.getId();
    }

    private boolean audited(String action, Long placementId) {
        return auditLogRepository.findAll().stream()
                .anyMatch(a -> action.equals(a.getAction())
                        && a.getDetails() != null
                        && a.getDetails().contains("Placement " + placementId));
    }

    @Test
    void startMovesAssignedToActiveAndNotifiesStudentAndSupervisor() throws Exception {
        Long companyId = createCompany("Start Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.ASSIGNED));

        mockMvc.perform(post("/api/placements/" + placementId + "/start").with(asCompany(companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        assertThat(placementRepository.findById(placementId).orElseThrow().getStatus())
                .isEqualTo(Placement.Status.ACTIVE);

        // Student and the assigned university supervisor are both notified.
        assertThat(notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(student.getUserId()))
                .anyMatch(n -> "PLACEMENT_STARTED".equals(n.getType()));
        assertThat(notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(row.getUserId()))
                .anyMatch(n -> "PLACEMENT_STARTED".equals(n.getType()));

        // The transition is audited.
        assertThat(audited("PLACEMENT_STARTED", placementId)).isTrue();
    }

    @Test
    void completeMovesActiveToCompletedAndIsAudited() throws Exception {
        Long companyId = createCompany("Done Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.ACTIVE));

        // ADMIN is the second allowed actor for the same transition.
        mockMvc.perform(post("/api/placements/" + placementId + "/complete").with(asAdmin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        assertThat(placementRepository.findById(placementId).orElseThrow().getStatus())
                .isEqualTo(Placement.Status.COMPLETED);

        assertThat(notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(student.getUserId()))
                .anyMatch(n -> "PLACEMENT_COMPLETED".equals(n.getType()));
        assertThat(notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(row.getUserId()))
                .anyMatch(n -> "PLACEMENT_COMPLETED".equals(n.getType()));
        assertThat(audited("PLACEMENT_COMPLETED", placementId)).isTrue();
    }

    @Test
    void offerMovesPendingIntoReviewAndNotifiesTheUniversity() throws Exception {
        Long companyId = createCompany("Offered Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.PENDING));

        mockMvc.perform(post("/api/placements/" + placementId + "/offer").with(asCompany(companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OFFERED"));

        assertThat(placementRepository.findById(placementId).orElseThrow().getStatus())
                .isEqualTo(Placement.Status.OFFERED);

        // Same audiences as the legacy create-offer path: university + admins.
        assertThat(notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(row.getUserId()))
                .anyMatch(n -> "PLACEMENT_OFFER".equals(n.getType()));
        Long adminId = userRepository.findByUsername("admin").orElseThrow().getId();
        assertThat(notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(adminId))
                .anyMatch(n -> "PLACEMENT_OFFER".equals(n.getType()));
        assertThat(audited("PLACEMENT_OFFER", placementId)).isTrue();
    }

    @Test
    void illegalJumpsAreRejectedWithConflict() throws Exception {
        Long companyId = createCompany("Jump Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());

        // ASSIGNED → complete is an illegal jump (only ACTIVE can complete).
        Long assigned = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.ASSIGNED));
        mockMvc.perform(post("/api/placements/" + assigned + "/complete").with(asCompany(companyId)))
                .andExpect(status().isConflict());
        assertThat(placementRepository.findById(assigned).orElseThrow().getStatus())
                .isEqualTo(Placement.Status.ASSIGNED);

        // PENDING → start is equally illegal (it must be offered first).
        Long pending = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.PENDING));
        mockMvc.perform(post("/api/placements/" + pending + "/start").with(asCompany(companyId)))
                .andExpect(status().isConflict());
        assertThat(placementRepository.findById(pending).orElseThrow().getStatus())
                .isEqualTo(Placement.Status.PENDING);

        // A finished placement cannot restart.
        Long completed = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.COMPLETED));
        mockMvc.perform(post("/api/placements/" + completed + "/start").with(asCompany(companyId)))
                .andExpect(status().isConflict());
    }

    @Test
    void anotherCompanyCannotStartThePlacement() throws Exception {
        Long companyId = createCompany("Mine Co " + suffix());
        Long rivalId = createCompany("Rival Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.ASSIGNED));

        mockMvc.perform(post("/api/placements/" + placementId + "/start").with(asCompany(rivalId)))
                .andExpect(status().isForbidden());

        assertThat(placementRepository.findById(placementId).orElseThrow().getStatus())
                .isEqualTo(Placement.Status.ASSIGNED);
        assertThat(audited("PLACEMENT_STARTED", placementId)).isFalse();
    }

    @Test
    void crossUniversityActorGetsNotFoundOnStart() throws Exception {
        Long companyId = createCompany("Cross Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.ASSIGNED));

        // A supervisor of uni B is out of scope entirely: 404, never a probing
        // oracle (L7) — and never a 403 that would confirm the row exists.
        MvcResult result = mockMvc.perform(post("/api/placements/" + placementId + "/start")
                        .with(asSupervisorOf(uniB())))
                .andExpect(status().isNotFound())
                .andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain("ASSIGNED");

        assertThat(placementRepository.findById(placementId).orElseThrow().getStatus())
                .isEqualTo(Placement.Status.ASSIGNED);
    }

    @Test
    void inScopeSupervisorStillGetsForbiddenOnStart() throws Exception {
        Long companyId = createCompany("Scoped Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.ASSIGNED));

        // Same university → scope passes, but SUPERVISOR is not COMPANY/ADMIN → 403.
        mockMvc.perform(post("/api/placements/" + placementId + "/start").with(asSupervisorOf(uniA())))
                .andExpect(status().isForbidden());

        assertThat(placementRepository.findById(placementId).orElseThrow().getStatus())
                .isEqualTo(Placement.Status.ASSIGNED);
    }

    @Test
    void studentCannotDriveLifecycleTransitions() throws Exception {
        Long companyId = createCompany("Stud Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.ASSIGNED));

        String username = "lifecvictim" + suffix();
        UserEntity studentUser = new UserEntity(username, "hash", Role.STUDENT);
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        // STUDENT is not in the class-level PreAuthorize at all.
        mockMvc.perform(post("/api/placements/" + placementId + "/start")
                        .with(user(username).authorities(new SimpleGrantedAuthority("STUDENT"))))
                .andExpect(status().isForbidden());

        assertThat(placementRepository.findById(placementId).orElseThrow().getStatus())
                .isEqualTo(Placement.Status.ASSIGNED);
    }

    @Test
    void offerRequiresPendingStatus() throws Exception {
        Long companyId = createCompany("Offjump Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());

        // ASSIGNED → offer is an illegal jump: the status guard fires before anything else.
        Long assigned = placementIdOf(placement(student, companyId, row.getId(), Placement.Status.ASSIGNED));
        mockMvc.perform(post("/api/placements/" + assigned + "/offer").with(asCompany(companyId)))
                .andExpect(status().isConflict());
        assertThat(placementRepository.findById(assigned).orElseThrow().getStatus())
                .isEqualTo(Placement.Status.ASSIGNED);

        // Unknown id is a plain 404.
        mockMvc.perform(post("/api/placements/999999999/offer").with(asCompany(companyId)))
                .andExpect(status().isNotFound());
    }
}
