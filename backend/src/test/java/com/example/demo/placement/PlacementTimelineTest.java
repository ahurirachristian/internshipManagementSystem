package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
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
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.supervisor.UniversitySupervisor;
import com.example.demo.supervisor.UniversitySupervisorRepository;

/**
 * PC8b gate: the placement timeline — five timestamp columns, the
 * status-history trail, and the three queries (funnel-over-time, median
 * time-to-placement, active duration).
 *
 * <p>The contract under test is the plan's backfill policy: NULLs are
 * EXCLUDED from every aggregate, never coerced to epoch and never counted as
 * a zero-length interval. A placement that never left {@code ASSIGNED} must
 * therefore vanish from the duration average rather than halve it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlacementTimelineTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PlacementRepository placementRepository;

    @Autowired
    private PlacementStatusHistoryRepository placementStatusHistoryRepository;

    @Autowired
    private PlacementTimelineService placementTimelineService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private UniversitySupervisorRepository universitySupervisorRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private Long uniA() {
        return userRepository.findByUsername("university").orElseThrow().getUniversityId();
    }

    private RequestPostProcessor asCompany(Long companyId) {
        String username = "tlccomp" + suffix();
        UserEntity companyUser = new UserEntity(username, "hash", Role.COMPANY);
        companyUser.setCompanyId(companyId);
        companyUser.setMustChangePassword(false);
        userRepository.save(companyUser);
        return user(username).authorities(new SimpleGrantedAuthority("COMPANY"));
    }

    private Long createCompany(String name) {
        Company company = new Company();
        company.setName(name);
        return companyRepository.save(company).getId();
    }

    private Student createStudent(Long universityId) {
        String username = "tlcstud" + suffix();
        UserEntity studentUser = new UserEntity(username, "hash", Role.STUDENT);
        studentUser.setUniversityId(universityId);
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        Student student = new Student();
        student.setUserId(studentUser.getId());
        student.setUniversityId(universityId);
        student.setFirstName("Tlc");
        student.setLastName("Student");
        student.setStudentNumber("TC" + suffix());
        student.setRegistrationNumber("TCR" + suffix());
        student.setDegreeProgram("BSc IT");
        return studentRepository.save(student);
    }

    private UniversitySupervisor createUniversitySupervisorRow(Long universityId) {
        String username = "tlcassign" + suffix();
        UserEntity user = new UserEntity(username, "hash", Role.SUPERVISOR);
        user.setUniversityId(universityId);
        user.setMustChangePassword(false);
        userRepository.save(user);

        UniversitySupervisor row = new UniversitySupervisor();
        row.setUserId(user.getId());
        row.setUniversityId(universityId);
        row.setFirstName("Tina");
        row.setLastName("Assignee");
        return universitySupervisorRepository.save(row);
    }

    private Placement placement(Student student, Long companyId, Long universitySupervisorId,
            Placement.Status status) {
        Placement placement = new Placement();
        placement.setStudentId(student.getId());
        placement.setCompanyId(companyId);
        placement.setUniversityId(student.getUniversityId());
        placement.setUniversitySupervisor("Tina Assignee");
        placement.setCompanySupervisor("Field Supervisor");
        placement.setUniversitySupervisorId(universitySupervisorId);
        placement.setStatus(status);
        return placementRepository.save(placement);
    }

    /** In-memory fixture row — never persisted; compute() only reads timestamps. */
    private Placement fixture(LocalDateTime createdAt, LocalDateTime offeredAt, LocalDateTime assignedAt,
            LocalDateTime startedAt, LocalDateTime completedAt) {
        Placement placement = new Placement();
        placement.setStudentId(1L);
        placement.setCompanyId(1L);
        placement.setUniversitySupervisor("Fixture");
        placement.setCompanySupervisor("Fixture");
        placement.setStatus(Placement.Status.COMPLETED);
        placement.setCreatedAt(createdAt);
        placement.setOfferedAt(offeredAt);
        placement.setAssignedAt(assignedAt);
        placement.setStartedAt(startedAt);
        placement.setCompletedAt(completedAt);
        return placement;
    }

    // PC8b: a hand-computed fixture — every expected number below was derived
    // by hand from the dates, not from a previous run of the code.
    private static final LocalDateTime JAN1 = LocalDateTime.of(2026, 1, 1, 0, 0);
    private static final LocalDateTime JAN2 = LocalDateTime.of(2026, 1, 2, 0, 0);
    private static final LocalDateTime JAN3 = LocalDateTime.of(2026, 1, 3, 0, 0);
    private static final LocalDateTime JAN4 = LocalDateTime.of(2026, 1, 4, 0, 0);
    private static final LocalDateTime JAN5 = LocalDateTime.of(2026, 1, 5, 0, 0);
    private static final LocalDateTime JAN6 = LocalDateTime.of(2026, 1, 6, 0, 0);
    private static final LocalDateTime JAN8 = LocalDateTime.of(2026, 1, 8, 0, 0);
    private static final LocalDateTime JAN9 = LocalDateTime.of(2026, 1, 9, 0, 0);
    private static final LocalDateTime JAN15 = LocalDateTime.of(2026, 1, 15, 0, 0);
    private static final LocalDateTime FEB1 = LocalDateTime.of(2026, 2, 1, 0, 0);
    private static final LocalDateTime FEB10 = LocalDateTime.of(2026, 2, 10, 0, 0);
    private static final LocalDateTime FEB20 = LocalDateTime.of(2026, 2, 20, 0, 0);
    private static final LocalDateTime MAR3 = LocalDateTime.of(2026, 3, 3, 0, 0);

    @Test
    void aggregatesMatchAHandComputedFixture() {
        // ttp: Jan1→Jan5 = 4d; Jan3→Jan9 = 6d; Jan4→Jan8 = 4d → [4,4,6] median 4
        // duration: Feb1→Mar3 = 30d; Feb10→Feb20 = 10d → avg 20 (ASSIGNED-only row excluded)
        Placement p1 = fixture(JAN1, JAN2, JAN5, FEB1, MAR3);
        Placement p2 = fixture(JAN3, JAN6, JAN9, FEB10, FEB20);
        Placement p3 = fixture(JAN4, JAN8, JAN8, null, null); // never left ASSIGNED
        Placement p4 = fixture(null, null, null, null, null); // legacy row, all NULL

        PlacementTimelineDto dto = placementTimelineService.compute(List.of(p1, p2, p3, p4));

        assertThat(dto.medianTimeToPlacementDays()).isEqualTo(4.0);
        assertThat(dto.timeToPlacementSample()).isEqualTo(3);
        assertThat(dto.averageActiveDurationDays()).isEqualTo(20.0);
        assertThat(dto.activeDurationSample()).isEqualTo(2);

        // Funnel over time: Jan offered=3 assigned=3; Feb started=2 completed=1; Mar completed=1.
        assertThat(dto.funnel()).hasSize(3);
        PlacementTimelineDto.MonthFunnel jan = dto.funnel().get(0);
        assertThat(jan.month()).isEqualTo("2026-01");
        assertThat(jan.offered()).isEqualTo(3);
        assertThat(jan.assigned()).isEqualTo(3);
        assertThat(jan.started()).isZero();
        assertThat(jan.completed()).isZero();
        PlacementTimelineDto.MonthFunnel feb = dto.funnel().get(1);
        assertThat(feb.month()).isEqualTo("2026-02");
        assertThat(feb.offered()).isZero();
        assertThat(feb.assigned()).isZero();
        assertThat(feb.started()).isEqualTo(2);
        assertThat(feb.completed()).isEqualTo(1);
        PlacementTimelineDto.MonthFunnel mar = dto.funnel().get(2);
        assertThat(mar.month()).isEqualTo("2026-03");
        assertThat(mar.completed()).isEqualTo(1);
    }

    @Test
    void nullsAreExcludedFromAveragesNeverCoercedToEpoch() {
        // One complete row (10-day interval) and one legacy all-NULL row.
        // If the NULL row were coerced to epoch the median would explode; if it
        // were counted as a zero interval the average would halve to 5.
        Placement complete = fixture(JAN1, JAN2, JAN3, JAN5, JAN15);
        Placement legacy = fixture(null, null, null, null, null);

        PlacementTimelineDto dto = placementTimelineService.compute(List.of(complete, legacy));

        assertThat(dto.medianTimeToPlacementDays()).isEqualTo(2.0);
        assertThat(dto.timeToPlacementSample()).isEqualTo(1);
        assertThat(dto.averageActiveDurationDays()).isEqualTo(10.0);
        assertThat(dto.activeDurationSample()).isEqualTo(1);
    }

    @Test
    void noQualifyingRowsYieldsNullNotZero() {
        PlacementTimelineDto dto = placementTimelineService.compute(
                List.of(fixture(null, null, null, null, null)));

        assertThat(dto.medianTimeToPlacementDays()).isNull();
        assertThat(dto.averageActiveDurationDays()).isNull();
        assertThat(dto.timeToPlacementSample()).isZero();
        assertThat(dto.activeDurationSample()).isZero();
        assertThat(dto.funnel()).isEmpty();
    }

    @Test
    void walkedStartCompleteYieldsPositiveDurationAndHistory() throws Exception {
        Long companyId = createCompany("Tlc Walk Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = placement(student, companyId, row.getId(), Placement.Status.ASSIGNED).getId();

        mockMvc.perform(post("/api/placements/" + placementId + "/start").with(asCompany(companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
        mockMvc.perform(post("/api/placements/" + placementId + "/complete").with(asCompany(companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        Placement walked = placementRepository.findById(placementId).orElseThrow();
        assertThat(walked.getStartedAt()).isNotNull();
        assertThat(walked.getCompletedAt()).isNotNull();
        assertThat(Duration.between(walked.getStartedAt(), walked.getCompletedAt()).toNanos()).isPositive();

        // The duration feeds the query as a positive, non-null sample.
        PlacementTimelineDto dto = placementTimelineService.compute(List.of(walked));
        assertThat(dto.activeDurationSample()).isEqualTo(1);
        assertThat(dto.averageActiveDurationDays()).isNotNull().isPositive();

        // Both transitions are on the trail, in order, attributed to the actor.
        List<PlacementStatusHistory> trail =
                placementStatusHistoryRepository.findByPlacementIdOrderByIdAsc(placementId);
        assertThat(trail).hasSize(2);
        assertThat(trail.get(0).getFromStatus()).isEqualTo("ASSIGNED");
        assertThat(trail.get(0).getToStatus()).isEqualTo("ACTIVE");
        assertThat(trail.get(0).getChangedAt()).isNotNull();
        assertThat(trail.get(0).getChangedBy()).isNotBlank();
        assertThat(trail.get(1).getFromStatus()).isEqualTo("ACTIVE");
        assertThat(trail.get(1).getToStatus()).isEqualTo("COMPLETED");
    }

    @Test
    void approvedPlacementStampsAssignedAtAndWritesHistory() throws Exception {
        Long companyId = createCompany("Tlc Appr Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Placement offered = placement(student, companyId, row.getId(), Placement.Status.OFFERED);

        mockMvc.perform(post("/api/placements/" + offered.getId() + "/approve")
                        .with(user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universitySupervisorId\":" + row.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ASSIGNED"));

        Placement assigned = placementRepository.findById(offered.getId()).orElseThrow();
        assertThat(assigned.getAssignedAt()).isNotNull();

        List<PlacementStatusHistory> trail =
                placementStatusHistoryRepository.findByPlacementIdOrderByIdAsc(offered.getId());
        assertThat(trail).hasSize(1);
        assertThat(trail.get(0).getFromStatus()).isEqualTo("OFFERED");
        assertThat(trail.get(0).getToStatus()).isEqualTo("ASSIGNED");
        assertThat(trail.get(0).getChangedBy()).isEqualTo("university");
    }

    @Test
    void offerAndRejectLeaveACompleteTwoStepTrail() throws Exception {
        Long companyId = createCompany("Tlc Rej Co " + suffix());
        Student student = createStudent(uniA());
        UniversitySupervisor row = createUniversitySupervisorRow(uniA());
        Long placementId = placement(student, companyId, row.getId(), Placement.Status.PENDING).getId();

        mockMvc.perform(post("/api/placements/" + placementId + "/offer").with(asCompany(companyId)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/placements/" + placementId + "/reject")
                        .with(user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        List<PlacementStatusHistory> trail =
                placementStatusHistoryRepository.findByPlacementIdOrderByIdAsc(placementId);
        assertThat(trail).hasSize(2);
        // offer() transitions an EXISTING PENDING row, so the trail starts there.
        assertThat(trail.get(0).getFromStatus()).isEqualTo("PENDING");
        assertThat(trail.get(0).getToStatus()).isEqualTo("OFFERED");
        assertThat(trail.get(1).getFromStatus()).isEqualTo("OFFERED");
        assertThat(trail.get(1).getToStatus()).isEqualTo("CANCELLED");
    }

    @Test
    void directCreateLeavesFromStatusNullBecauseTheRowWasBorn() throws Exception {
        Long companyId = createCompany("Tlc Birth Co " + suffix());
        Student student = createStudent(uniA());

        // The legacy ADMIN direct-create path: the placement has no previous
        // status, so its opening history row carries from_status = NULL.
        mockMvc.perform(post("/api/placements")
                        .with(user("admin").authorities(new SimpleGrantedAuthority("ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":" + student.getId()
                                + ",\"companyId\":" + companyId
                                + ",\"universitySupervisor\":\"Tina Assignee\""
                                + ",\"companySupervisor\":\"Field Supervisor\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());

        Long createdId = placementRepository.findByStudentId(student.getId()).stream()
                .filter(p -> p.getCompanyId().equals(companyId))
                .findFirst().orElseThrow().getId();
        List<PlacementStatusHistory> trail =
                placementStatusHistoryRepository.findByPlacementIdOrderByIdAsc(createdId);
        assertThat(trail).hasSize(1);
        assertThat(trail.get(0).getFromStatus()).isNull();
        assertThat(trail.get(0).getToStatus()).isEqualTo("PENDING");
        assertThat(trail.get(0).getChangedBy()).isEqualTo("admin");
    }

    @Test
    void createdAtDefaultsOnNewRowsAndStaysNullForLegacyShapedOnes() {
        Placement fresh = placement(createStudent(uniA()), createCompany("Tlc Fresh " + suffix()), null,
                Placement.Status.PENDING);
        assertThat(fresh.getCreatedAt()).isNotNull();

        // Backfill policy: an explicitly-NULL (legacy-shaped) row must round-trip
        // as NULL — i.e. Hibernate has to overwrite the entity's now() initializer
        // with the stored NULL on load, not fabricate a creation date.
        fresh.setCreatedAt(null);
        placementRepository.saveAndFlush(fresh);
        entityManager.clear();
        assertThat(placementRepository.findById(fresh.getId()).orElseThrow().getCreatedAt()).isNull();
    }

    @Test
    void loginStampsLastLoginAtButFailedLoginAndSessionRefreshDoNot() throws Exception {
        // Seeded student account: password known, deterministic state.
        UserEntity account = userRepository.findByUsername("2400101003").orElseThrow();
        account.setLastLoginAt(null);
        account.setMustChangePassword(false);
        userRepository.saveAndFlush(account);
        assertThat(account.getLastLoginAt()).isNull();

        // A wrong password must not stamp anything.
        mockMvc.perform(post("/api/login")
                        .param("username", "2400101003").param("password", "wrong-pass"))
                .andExpect(status().isUnauthorized());
        assertThat(userRepository.findByUsername("2400101003").orElseThrow().getLastLoginAt()).isNull();

        // The one true login path does stamp.
        MvcResult login = mockMvc.perform(post("/api/login")
                        .param("username", "2400101003").param("password", "Student@123"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(userRepository.findByUsername("2400101003").orElseThrow().getLastLoginAt()).isNotNull();

        // A later authenticated request goes through AuthorityRefreshFilter, which
        // must NOT restamp — otherwise lastLoginAt degrades to "last seen".
        LocalDateTime frozen = LocalDateTime.of(2026, 1, 1, 8, 0);
        UserEntity reloaded = userRepository.findByUsername("2400101003").orElseThrow();
        reloaded.setLastLoginAt(frozen);
        userRepository.saveAndFlush(reloaded);

        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        mockMvc.perform(get("/api/me").session(session))
                .andExpect(status().isOk());
        assertThat(userRepository.findByUsername("2400101003").orElseThrow().getLastLoginAt())
                .isEqualTo(frozen);
    }
}
