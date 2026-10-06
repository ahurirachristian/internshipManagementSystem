package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.school.School;
import com.example.demo.school.SchoolRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;
import com.jayway.jsonpath.JsonPath;

/**
 * Step S6.7 (opportunity plan §8.7): the four attachment endpoints of §6.6 —
 * upload / list / download / delete — and the two loopholes they exist to
 * close: [H13] (a file is never more visible than its advert) and [H14] (no
 * on-disk name leaks, no blob outlives its row, no path escapes the root).
 *
 * <p>The suite is organised around <b>who ends up seeing what</b>, not around
 * the happy path: every audience the resolver can hand out gets a test that
 * asserts the exact rows they receive, and every negative case asserts 404
 * (never 403) so the endpoint cannot be used as an existence oracle. The
 * house-style extras pin the mechanics the plan calls out explicitly:
 * {@code universityId} forced from the session (never the form), metadata
 * responses free of {@code fileName}/{@code/storagePath}, targeting that may
 * only narrow (§5.8), and the [H14] cleanup when a row cannot be persisted.
 *
 * <p>Like every step of this plan, the negative tests are proven non-vacuous
 * by a fault-injection run (recorded in the plan's S6.7 row).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunityAttachmentScopeTest {

    /** Academic units seeded at each test's own university. */
    private static final int PROGRAMME_P1 = 96201;
    private static final int PROGRAMME_P2 = 96202;
    /** A programme belonging to somebody else — never own [H7]. */
    private static final int PROGRAMME_FOREIGN = 96501;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UniversityRepository universityRepository;
    @Autowired
    private CompanyRepository companyRepository;
    @Autowired
    private SchoolRepository schoolRepository;
    @Autowired
    private ProgrammeRepository programmeRepository;
    @Autowired
    private StudentRepository studentRepository;
    @Autowired
    private VacancyRepository vacancyRepository;
    @Autowired
    private OpportunityShareRepository shareRepository;
    @Autowired
    private OpportunityAttachmentRepository attachmentRepository;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    // --- Fixtures ---

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private UserEntity superAdmin() {
        return userRepository.findByUsername("admin").orElseThrow();
    }

    private UserEntity account(String prefix, Role role, Long companyId, Long universityId) {
        UserEntity user = new UserEntity(prefix + suffix(), "hash", role);
        user.setMustChangePassword(false);
        user.setCompanyId(companyId);
        user.setUniversityId(universityId);
        return userRepository.save(user);
    }

    private UserEntity companyUser() {
        Company company = new Company();
        company.setName("Attach Co " + suffix());
        long companyId = companyRepository.save(company).getId();
        return account("attco", Role.COMPANY, companyId, null);
    }

    private UserEntity supervisor(long universityId) {
        return account("attsup", Role.SUPERVISOR, null, universityId);
    }

    private UserEntity plainAdmin() {
        return account("attadm", Role.ADMIN, null, null);
    }

    private long university() {
        String tag = suffix();
        return universityRepository.save(new University(("ATT" + tag).substring(0, 15),
                "Attachment Test University " + tag)).getId();
    }

    private UserEntity student(long universityId, int programmeId, Integer yearOfStudy) {
        UserEntity account = account("attstu", Role.STUDENT, null, universityId);
        Student row = new Student();
        row.setUserId(account.getId());
        row.setUniversityId(universityId);
        row.setProgrammeId((long) programmeId);
        row.setYearOfStudy(yearOfStudy);
        row.setFirstName("Attach");
        row.setLastName("Student" + suffix());
        row.setRegistrationNumber("REG" + suffix());
        row.setStudentNumber("AT" + suffix());
        row.setDegreeProgram("Computer Science");
        row.setStartDate(LocalDate.now());
        studentRepository.save(row);
        return account;
    }

    /** Seed the academic units the §5.8 membership check [H7] reads. */
    private void academicUnits(long universityId, int... programmeIds) {
        String tag = suffix();
        School school = new School();
        school.setSchoolId(96000 + (int) (Math.abs(universityId) % 100));
        school.setUniversityId((int) universityId);
        school.setSchoolName("School of Testing " + tag);
        schoolRepository.save(school);
        for (int programmeId : programmeIds) {
            Programme programme = new Programme();
            programme.setProgrammeId(programmeId);
            programme.setSchoolId(school.getSchoolId());
            programme.setUniversityId((int) universityId);
            programme.setProgrammeCode("BSC-" + programmeId);
            programme.setProgrammeName("BSc Testing " + programmeId);
            programme.setProgrammeLevel("UNDERGRADUATE");
            programme.setDurationYears(3);
            programmeRepository.save(programme);
        }
    }

    private long advert(Vacancy.Origin origin, Long companyId, String programmesCsv) {
        Vacancy advert = new Vacancy("Attach role " + suffix(),
                "A real role a student can be onboarded into", companyId, "Kampala", "None",
                Vacancy.Status.PUBLISHED.name(), LocalDate.now().plusDays(30), LocalDate.now());
        advert.setOrigin(origin);
        advert.setTargetProgrammeIds(programmesCsv);
        return vacancyRepository.save(advert).getId();
    }

    private void shareRow(long advertId, long universityId, String programmesCsv) {
        OpportunityShare row = new OpportunityShare();
        row.setVacancyId(advertId);
        row.setUniversityId(universityId);
        row.setStatus(OpportunityShare.Status.SHARED);
        row.setSharedBy(superAdmin().getId());
        row.setSharedAt(LocalDateTime.now());
        row.setNote("Shared with our students");
        row.setTargetProgrammeIds(programmesCsv);
        shareRepository.save(row);
    }

    private MockMultipartFile file(String name, String body) {
        return new MockMultipartFile("file", name, "text/plain", body.getBytes());
    }

    private RequestPostProcessor as(UserEntity actor) {
        return user(actor.getUsername())
                .authorities(new SimpleGrantedAuthority(actor.getRole().name()));
    }

    private org.springframework.test.web.servlet.ResultActions upload(UserEntity actor,
            long advertId, MockMultipartFile upload, String programmes, String years)
            throws Exception {
        var request = multipart("/api/opportunities/{id}/attachments", advertId)
                .file(upload).with(as(actor));
        if (programmes != null) {
            request = request.param("targetProgrammeIds", programmes);
        }
        if (years != null) {
            request = request.param("targetYearOfStudy", years);
        }
        return mockMvc.perform(request);
    }

    private long uploadOk(UserEntity actor, long advertId, MockMultipartFile upload,
            String programmes) throws Exception {
        String body = upload(actor, advertId, upload, programmes, null)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private long attachmentRow(long advertId) {
        return attachmentRepository.findByVacancyIdOrderByUploadedAtDesc(advertId).get(0).getId();
    }

    // --- Owner / super admin / session scoping -----------------------------

    @Test
    void theOwningCompanyCanAttachListDownloadAndDeleteItsOwnAdvertsFiles() throws Exception {
        UserEntity owner = companyUser();
        long advertId = advert(Vacancy.Origin.COMPANY, owner.getCompanyId(), null);

        String body = upload(owner, advertId, file("offer-letter.txt", "secret bytes"), null, null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalFileName").value("offer-letter.txt"))
                // [H14]: the on-disk name never reaches a client, not even the uploader's.
                .andExpect(jsonPath("$.fileName").doesNotExist())
                .andExpect(jsonPath("$.storagePath").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        long attachmentId = ((Number) JsonPath.read(body, "$.id")).longValue();
        String storedName = attachmentRepository.findById(attachmentId).orElseThrow().getFileName();
        assertThat(storedName).isNotEqualTo("offer-letter.txt");
        assertThat(Files.exists(Path.of(uploadDir).resolve(storedName))).isTrue();

        String listBody = mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId)
                        .with(as(owner)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<Object>>read(listBody, "$[*].id"))
                .as("list body: %s", listBody)
                .extracting(x -> ((Number) x).longValue())
                .containsExactly(attachmentId);
        assertThat(listBody).doesNotContain("fileName\"")
                .doesNotContain("storagePath");

        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", attachmentId)
                        .with(as(owner)))
                .andExpect(status().isOk())
                .andExpect(content().string("secret bytes"))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("offer-letter.txt")));

        mockMvc.perform(delete("/api/opportunities/{id}/attachments/{attachmentId}",
                        advertId, attachmentId).with(as(owner)))
                .andExpect(status().isNoContent());
        assertThat(attachmentRepository.findById(attachmentId)).isEmpty();
        assertThat(Files.exists(Path.of(uploadDir).resolve(storedName))).isFalse();
        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId).with(as(owner)))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));
    }

    @Test
    void theSuperAdminCanAttachToAnyAdvert() throws Exception {
        UserEntity owner = companyUser();
        long advertId = advert(Vacancy.Origin.COMPANY, owner.getCompanyId(), null);

        String body = upload(superAdmin(), advertId, file("brochure.pdf", "pdf bytes"), null, null)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long attachmentId = ((Number) JsonPath.read(body, "$.id")).longValue();

        // The super admin has no university, so the row is advert-level.
        assertThat(attachmentRepository.findById(attachmentId).orElseThrow().getUniversityId())
                .isNull();
        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId)
                        .with(as(superAdmin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void aLinkedSupervisorsFileIsScopedToTheirSessionUniversityAndIgnoresTheForm()
            throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null, null);
        shareRow(advertId, uniA, null);
        UserEntity sup = supervisor(uniA);

        // The form carries a forged universityId — the endpoint has no such parameter.
        String body = mockMvc.perform(multipart("/api/opportunities/{id}/attachments", advertId)
                        .file(file("timetable.txt", "week 1"))
                        .param("universityId", "9999999")
                        .with(as(sup)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long attachmentId = ((Number) JsonPath.read(body, "$.id")).longValue();

        OpportunityAttachment row = attachmentRepository.findById(attachmentId).orElseThrow();
        assertThat(row.getUniversityId()).isEqualTo(uniA);
        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", attachmentId)
                        .with(as(sup)))
                .andExpect(status().isOk())
                .andExpect(content().string("week 1"));
    }

    // --- The student audience [H13] ----------------------------------------

    @Test
    void aTargetedStudentAtTheSharingUniversityListsAndDownloadsTheFile() throws Exception {
        long uniA = university();
        academicUnits(uniA, PROGRAMME_P1);
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null, null);
        shareRow(advertId, uniA, null);
        UserEntity sup = supervisor(uniA);
        long attachmentId = uploadOk(sup, advertId,
                file("offer-letter.txt", "targeted bytes"), Integer.toString(PROGRAMME_P1));
        UserEntity viewer = student(uniA, PROGRAMME_P1, 3);

        String body = mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId)
                        .with(as(viewer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].originalFileName").value("offer-letter.txt"))
                .andExpect(jsonPath("$[0].contentType").value("text/plain"))
                // The metadata shape is exactly §6.6's five fields — nothing on disk.
                .andExpect(jsonPath("$[0].fileName").doesNotExist())
                .andExpect(jsonPath("$[0].storagePath").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertThat(((Number) JsonPath.read(body, "$[0].id")).longValue()).isEqualTo(attachmentId);

        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", attachmentId)
                        .with(as(viewer)))
                .andExpect(status().isOk())
                .andExpect(content().string("targeted bytes"));
    }

    @Test
    void anUntargetedStudentIsNotFoundForAFileTargetedAtAnotherProgramme() throws Exception {
        long uniA = university();
        academicUnits(uniA, PROGRAMME_P1);
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null, null);
        shareRow(advertId, uniA, null);
        UserEntity sup = supervisor(uniA);
        long attachmentId = uploadOk(sup, advertId,
                file("committee-only.txt", "committee bytes"), Integer.toString(PROGRAMME_P1));
        UserEntity outsider = student(uniA, PROGRAMME_P2, 2);

        // The file simply is not in their listing — and by id it is a 404 [H13].
        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId).with(as(outsider)))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));
        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", attachmentId)
                        .with(as(outsider)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aStudentOutsideTheSharesTargetingGetsNotFoundOnTheWholeRead() throws Exception {
        long uniA = university();
        academicUnits(uniA, PROGRAMME_P1, PROGRAMME_P2);
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null, null);
        shareRow(advertId, uniA, Integer.toString(PROGRAMME_P1));
        UserEntity sup = supervisor(uniA);
        long attachmentId = uploadOk(sup, advertId, file("shared.txt", "shared bytes"), null);
        UserEntity narrowedOut = student(uniA, PROGRAMME_P2, 2);

        // The share never put this advert in their feed → the whole read is 404,
        // exactly as S6.4's by-id read answers [H2][H13].
        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId)
                        .with(as(narrowedOut)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", attachmentId)
                        .with(as(narrowedOut)))
                .andExpect(status().isNotFound());
    }

    @Test
    void anotherUniversitysStudentIsNotFound() throws Exception {
        long uniA = university();
        long uniB = university();
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null, null);
        shareRow(advertId, uniA, null);
        UserEntity sup = supervisor(uniA);
        long attachmentId = uploadOk(sup, advertId, file("ours.txt", "ours bytes"), null);
        UserEntity outsider = student(uniB, PROGRAMME_P1, 3);

        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId).with(as(outsider)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", attachmentId)
                        .with(as(outsider)))
                .andExpect(status().isNotFound());
    }

    @Test
    void advertLevelFilesAreOmittedFromAStudentsListingAndUndownloadable() throws Exception {
        UserEntity owner = companyUser();
        long uniA = university();
        long advertId = advert(Vacancy.Origin.COMPANY, owner.getCompanyId(), null);
        long attachmentId = uploadOk(owner, advertId, file("internal.txt", "internal bytes"), null);
        shareRow(advertId, uniA, null);
        UserEntity viewer = student(uniA, PROGRAMME_P1, 3);

        // Advert-level (universityId IS NULL) files exist for the advertising
        // side only — a student never sees one, not even by guessing the id.
        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId).with(as(viewer)))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));
        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", attachmentId)
                        .with(as(viewer)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aStudentWithoutAStudentRecordIsRefused() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null, null);
        shareRow(advertId, uniA, null);
        UserEntity phantom = account("attphn", Role.STUDENT, null, uniA);

        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId).with(as(phantom)))
                .andExpect(status().isForbidden());
    }

    // --- The doors ----------------------------------------------------------

    @Test
    void theFourDoorsAreEnforced() throws Exception {
        UserEntity owner = companyUser();
        long advertId = advert(Vacancy.Origin.COMPANY, owner.getCompanyId(), null);
        UserEntity viewer = student(university(), PROGRAMME_P1, 3);

        upload(viewer, advertId, file("nope.txt", "x"), null, null)
                .andExpect(status().isForbidden());
        mockMvc.perform(multipart("/api/opportunities/{id}/attachments", advertId)
                        .file(file("nope.txt", "x")))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", 1L))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/opportunities/{id}/attachments/{attachmentId}",
                        advertId, 1L).with(as(viewer)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/opportunities/{id}/attachments/{attachmentId}",
                        advertId, 1L))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aPlainAdminCanReadEveryListingButCannotUploadOrDelete() throws Exception {
        UserEntity owner = companyUser();
        long advertId = advert(Vacancy.Origin.COMPANY, owner.getCompanyId(), null);
        long attachmentId = uploadOk(owner, advertId, file("readable.txt", "read bytes"), null);
        UserEntity admin = plainAdmin();

        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId).with(as(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        upload(admin, advertId, file("no-upload.txt", "x"), null, null)
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/opportunities/{id}/attachments/{attachmentId}",
                        advertId, attachmentId).with(as(admin)))
                .andExpect(status().isForbidden());
    }

    @Test
    void aSupervisorWithoutAUniversityIsRefusedRatherThanShownAnyonesFiles() throws Exception {
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null, null);
        UserEntity homeless = account("atthml", Role.SUPERVISOR, null, null);

        upload(homeless, advertId, file("nope.txt", "x"), null, null)
                .andExpect(status().isForbidden());
    }

    // --- Cross-tenant scope [H9] --------------------------------------------

    @Test
    void anotherUniversitysSupervisorCannotSeeMyUniversitysScopedFiles() throws Exception {
        long uniA = university();
        long uniB = university();
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null, null);
        shareRow(advertId, uniA, null);
        shareRow(advertId, uniB, null);
        long attachmentId = uploadOk(supervisor(uniA), advertId,
                file("uni-a-only.txt", "uni a bytes"), null);
        UserEntity rival = supervisor(uniB);

        // Both universities are linked (capacity UNIVERSITY) — but the row is
        // scoped to uni A, so it is simply absent from the rival's listing and
        // 404 by id, never 403 [H9].
        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId).with(as(rival)))
                .andExpect(status().isOk())
                .andExpect(content().string("[]"));
        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", attachmentId)
                        .with(as(rival)))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/opportunities/{id}/attachments/{attachmentId}",
                        advertId, attachmentId).with(as(rival)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aRivalCompanyCannotSeeOrTouchAnotherCompaniesFiles() throws Exception {
        UserEntity owner = companyUser();
        UserEntity rival = companyUser();
        long advertId = advert(Vacancy.Origin.COMPANY, owner.getCompanyId(), null);
        long attachmentId = uploadOk(owner, advertId, file("mine.txt", "mine bytes"), null);

        mockMvc.perform(get("/api/opportunities/{id}/attachments", advertId).with(as(rival)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", attachmentId)
                        .with(as(rival)))
                .andExpect(status().isNotFound());
        upload(rival, advertId, file("theirs.txt", "x"), null, null)
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/opportunities/{id}/attachments/{attachmentId}",
                        advertId, attachmentId).with(as(rival)))
                .andExpect(status().isNotFound());
    }

    @Test
    void anUnknownOrUnseenAdvertIsNotFound() throws Exception {
        UserEntity owner = companyUser();

        upload(owner, 999_999_999L, file("ghost.txt", "x"), null, null)
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/opportunities/{id}/attachments", 999_999_999L)
                        .with(as(owner)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aStudentCanNeverDeleteAFile() throws Exception {
        long uniA = university();
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null, null);
        shareRow(advertId, uniA, null);
        long attachmentId = uploadOk(supervisor(uniA), advertId,
                file("locked.txt", "locked bytes"), null);
        UserEntity viewer = student(uniA, PROGRAMME_P1, 3);

        mockMvc.perform(delete("/api/opportunities/{id}/attachments/{attachmentId}",
                        advertId, attachmentId).with(as(viewer)))
                .andExpect(status().isForbidden());
        assertThat(attachmentRepository.findById(attachmentId)).isPresent();
    }

    // --- Mechanics the plan calls out ---------------------------------------

    @Test
    void aPathTraversalInAStoredNameIsRefused() throws Exception {
        UserEntity owner = companyUser();
        long advertId = advert(Vacancy.Origin.COMPANY, owner.getCompanyId(), null);
        OpportunityAttachment poisoned = new OpportunityAttachment();
        poisoned.setVacancyId(advertId);
        poisoned.setFileName("../../evil-traversal.txt");
        poisoned.setOriginalFileName("evil.txt");
        poisoned.setContentType(MediaType.TEXT_PLAIN_VALUE);
        poisoned.setFileSize(4L);
        poisoned.setStoragePath("../../evil-traversal.txt");
        poisoned.setUploadedBy(owner.getId());
        poisoned.setUploadedAt(LocalDateTime.now());
        long attachmentId = attachmentRepository.saveAndFlush(poisoned).getId();

        // The storage root's own guard refuses before any byte is read [H14].
        mockMvc.perform(get("/api/opportunities/{attachmentId}/download", attachmentId)
                        .with(as(owner)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anEmptyUploadIsA400AndTouchesNoStorage() throws Exception {
        UserEntity owner = companyUser();
        long advertId = advert(Vacancy.Origin.COMPANY, owner.getCompanyId(), null);
        long blobsBefore = countBlobs();

        upload(owner, advertId, new MockMultipartFile("file", "empty.txt",
                        MediaType.TEXT_PLAIN_VALUE, new byte[0]), null, null)
                .andExpect(status().isBadRequest());

        assertThat(countBlobs()).isEqualTo(blobsBefore);
        assertThat(attachmentRepository.findByVacancyIdOrderByUploadedAtDesc(advertId)).isEmpty();
    }

    @Test
    void uploadTargetingMayNarrowTheAdvertsAudienceButNeverWidenIt() throws Exception {
        long uniA = university();
        academicUnits(uniA, PROGRAMME_P1, PROGRAMME_P2);
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null,
                Integer.toString(PROGRAMME_P1));
        shareRow(advertId, uniA, null);
        UserEntity sup = supervisor(uniA);

        // The offered programme, named back — a narrowing, so 201.
        upload(sup, advertId, file("narrow.txt", "x"), Integer.toString(PROGRAMME_P1), null)
                .andExpect(status().isCreated());
        // No targeting at all on a targeted advert = "everyone" = a widening → 400.
        upload(sup, advertId, file("wide-none.txt", "x"), null, null)
                .andExpect(status().isBadRequest());
        // Own programme, but one the advert never offered → still a widening → 400.
        upload(sup, advertId, file("wide-other.txt", "x"), Integer.toString(PROGRAMME_P2), null)
                .andExpect(status().isBadRequest());
        assertThat(attachmentRepository.findByVacancyIdOrderByUploadedAtDesc(advertId))
                .hasSize(1);
    }

    @Test
    void attachmentTargetingMustBelongToTheUploadersUniversity() throws Exception {
        long uniA = university();
        long uniB = university();
        academicUnits(uniA, PROGRAMME_P1);
        academicUnits(uniB, PROGRAMME_FOREIGN);
        long advertId = advert(Vacancy.Origin.UNIVERSITY, null, null);
        shareRow(advertId, uniA, null);
        UserEntity sup = supervisor(uniA);

        upload(sup, advertId, file("foreign.txt", "x"),
                        Integer.toString(PROGRAMME_FOREIGN), null)
                .andExpect(status().isBadRequest());
        assertThat(attachmentRepository.findByVacancyIdOrderByUploadedAtDesc(advertId)).isEmpty();
    }

    @Test
    void aFailedInsertDeletesTheBlobItHadAlreadyStored() throws Exception {
        UserEntity owner = companyUser();
        long advertId = advert(Vacancy.Origin.COMPANY, owner.getCompanyId(), null);
        long blobsBefore = countBlobs();
        // original_file_name is VARCHAR(255): this passes every pre-check, is
        // stored to disk, then fails to persist — the exact [H14] window.
        String tooLong = "x".repeat(300) + ".txt";

        upload(owner, advertId, file(tooLong, "orphan bytes"), null, null)
                .andExpect(status().is5xxServerError());

        assertThat(countBlobs()).isEqualTo(blobsBefore);
    }

    private long countBlobs() throws Exception {
        Path dir = Path.of(uploadDir);
        if (!Files.isDirectory(dir)) {
            return 0;
        }
        try (var stream = Files.list(dir)) {
            return stream.count();
        }
    }
}
