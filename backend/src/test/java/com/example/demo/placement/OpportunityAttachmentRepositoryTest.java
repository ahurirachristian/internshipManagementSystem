package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/**
 * Phase 1 baseline (opportunity plan §8.2, step S1.5b).
 *
 * <p>Schema half of the attachment work. The authorization half arrives at S6.7 with
 * the endpoints; what can be pinned here is that the table can express the two
 * audiences {@code documents} could not, and that the two names a file has stay
 * distinct.
 *
 * <p><b>Two audiences on one advert.</b> {@link #anAdvertLevelFileAndASharedFileCoexist()}
 * is the test that justifies this whole table. An advert-level row
 * ({@code universityId = null}) is for the super admin and the advertising side; a
 * targeted row is for one university's students. {@code documents} can hold either but
 * not both meaningfully — see the class javadoc — so if this table ever collapses to
 * one audience, that test is what notices.
 *
 * <p><b>The generated name is never the client's name.</b>
 * {@link #theStoredNameAndTheDisplayNameAreDifferentStrings()} pins that the two
 * columns are genuinely separate and that a round trip preserves both. The two halves
 * of [H14] split across steps: this is the schema half — keeping the names distinct so
 * there is somewhere safe to put a server-generated one — and {@code FileStorageService}
 * ({@code storeFile} issues the UUID, {@code loadFile} rejects any path resolving
 * outside the storage root) is the runtime half, proved at S6.7 when the upload
 * endpoint exists. A traversal payload is not storable in this table at all, since no
 * column is ever resolved as a path by anything here.
 */
@SpringBootTest
@Transactional
class OpportunityAttachmentRepositoryTest {

    @Autowired
    private OpportunityAttachmentRepository attachmentRepository;

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private EntityManager entityManager;

    private Long vacancyId() {
        return vacancyRepository.save(new Vacancy("An advert with paperwork", "A description of the role",
                42L, "Kampala", "Some requirements", "OPEN",
                LocalDate.now().plusMonths(2), LocalDate.now())).getId();
    }

    /** The generated name is what a caller-supplied one would be replaced with. */
    private OpportunityAttachment attachment(Long vacancyId, Long universityId, String generatedName) {
        OpportunityAttachment attachment = new OpportunityAttachment();
        attachment.setVacancyId(vacancyId);
        attachment.setUniversityId(universityId);
        attachment.setFileName(generatedName);
        attachment.setOriginalFileName("Company offer letter.pdf");
        attachment.setContentType("application/pdf");
        attachment.setFileSize(204800L);
        attachment.setStoragePath("uploads/" + generatedName);
        attachment.setUploadedBy(7L);
        return attachment;
    }

    // --- Defaults -------------------------------------------------------------

    @Test
    void aNewAttachmentIsStamped() {
        OpportunityAttachment saved = attachmentRepository
                .save(attachment(vacancyId(), 10L, "9f1c2b3a-0000-4000-8000-000000000001"));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getUploadedAt()).isNotNull();
    }

    @Test
    void aNewAttachmentCarriesNoTargetingOfItsOwn() {
        // Untargeted must stay unset rather than becoming a wildcard: "not narrowed"
        // and "narrowed to everybody" are different claims, and the audience resolver
        // has to tell them apart.
        OpportunityAttachment saved = attachmentRepository
                .save(attachment(vacancyId(), 10L, "9f1c2b3a-0000-4000-8000-000000000002"));

        assertThat(saved.getTargetProgrammeIds()).isNull();
        assertThat(saved.getTargetYearOfStudy()).isNull();
    }

    // --- The two audiences ----------------------------------------------------

    @Test
    void anAdvertLevelFileAndASharedFileCoexist() {
        // The capability documents could not express: one advert carrying a file for
        // the advertising side and a different file for one university's students.
        Long vacancyId = vacancyId();
        attachmentRepository.saveAndFlush(attachment(vacancyId, null,
                "9f1c2b3a-0000-4000-8000-000000000010"));
        attachmentRepository.saveAndFlush(attachment(vacancyId, 10L,
                "9f1c2b3a-0000-4000-8000-000000000011"));
        entityManager.clear();

        List<OpportunityAttachment> all =
                attachmentRepository.findByVacancyIdOrderByUploadedAtDesc(vacancyId);
        assertThat(all).hasSize(2);
        assertThat(all).filteredOn(row -> row.getUniversityId() == null).hasSize(1);
        assertThat(all).filteredOn(row -> row.getUniversityId() != null).hasSize(1);
    }

    @Test
    void aStudentsListingNeverIncludesAnAdvertLevelFile() {
        // The finder a student's request uses. Advert-level files belong to the
        // advertising side, so a student must not receive one here — the metadata
        // listing is what makes a file's existence visible even before a download.
        Long vacancyId = vacancyId();
        attachmentRepository.saveAndFlush(attachment(vacancyId, null,
                "9f1c2b3a-0000-4000-8000-000000000020"));
        attachmentRepository.saveAndFlush(attachment(vacancyId, 10L,
                "9f1c2b3a-0000-4000-8000-000000000021"));
        entityManager.clear();

        List<OpportunityAttachment> forStudent = attachmentRepository
                .findByVacancyIdAndUniversityIdOrderByUploadedAtDesc(vacancyId, 10L);

        assertThat(forStudent).hasSize(1);
        assertThat(forStudent.get(0).getUniversityId()).isEqualTo(10L);
    }

    @Test
    void aTargetedFileCanNarrowToProgrammesAndYears() {
        OpportunityAttachment targeted = attachment(vacancyId(), 10L,
                "9f1c2b3a-0000-4000-8000-000000000030");
        targeted.setTargetProgrammeIds("3,4");
        targeted.setTargetYearOfStudy("3");

        Long id = attachmentRepository.saveAndFlush(targeted).getId();
        entityManager.clear();
        OpportunityAttachment reloaded = attachmentRepository.findById(id).orElseThrow();

        assertThat(reloaded.getTargetProgrammeIds()).isEqualTo("3,4");
        assertThat(reloaded.getTargetYearOfStudy()).isEqualTo("3");
    }

    // --- Name handling [H14] --------------------------------------------------

    @Test
    void theStoredNameAndTheDisplayNameAreDifferentStrings() {
        OpportunityAttachment saved = attachmentRepository
                .save(attachment(vacancyId(), 10L, "9f1c2b3a-0000-4000-8000-000000000040"));

        assertThat(saved.getFileName()).isEqualTo("9f1c2b3a-0000-4000-8000-000000000040");
        assertThat(saved.getOriginalFileName()).isEqualTo("Company offer letter.pdf");
        assertThat(saved.getFileName()).isNotEqualTo(saved.getOriginalFileName());

        // Both survive the round trip independently, so nothing later can quietly
        // collapse them: a name that changed on the way to disk is a name that was
        // resolved.
        entityManager.clear();
        OpportunityAttachment reloaded = attachmentRepository
                .findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getFileName())
                .isEqualTo("9f1c2b3a-0000-4000-8000-000000000040");
        assertThat(reloaded.getOriginalFileName()).isEqualTo("Company offer letter.pdf");
    }

    @Test
    void aFileIsFindableByItsGeneratedName() {
        // The download path resolves by the generated name, so this is how the S6.7
        // endpoint reaches the blob without ever trusting originalFileName.
        String generated = "9f1c2b3a-0000-4000-8000-000000000050";
        attachmentRepository.saveAndFlush(attachment(vacancyId(), 10L, generated));

        assertThat(attachmentRepository.findByFileName(generated)).isPresent();
        assertThat(attachmentRepository.findByFileName("Company offer letter.pdf")).isEmpty();
    }

    // --- Lookup shape ---------------------------------------------------------

    @Test
    void aFileIsFoundByIdWithinItsOwnAdvertOnly() {
        Long vacancyId = vacancyId();
        Long id = attachmentRepository.saveAndFlush(attachment(vacancyId, 10L,
                "9f1c2b3a-0000-4000-8000-000000000060")).getId();
        entityManager.clear();

        assertThat(attachmentRepository.findByIdAndVacancyId(id, vacancyId)).isPresent();
        // A mismatched advert id must not resolve, or a caller could read a file's
        // metadata off an advert they have no claim to.
        assertThat(attachmentRepository.findByIdAndVacancyId(id, vacancyId + 1L)).isEmpty();
    }

    @Test
    void anAdvertHasNoAttachmentsWhenNoneWereUploaded() {
        assertThat(attachmentRepository.findByVacancyIdOrderByUploadedAtDesc(vacancyId())).isEmpty();
    }

    // --- Round trip -----------------------------------------------------------

    @Test
    void everyColumnRoundTrips() {
        OpportunityAttachment row = attachment(vacancyId(), 10L,
                "9f1c2b3a-0000-4000-8000-000000000070");
        row.setTargetProgrammeIds("11,12");
        row.setTargetYearOfStudy("2");
        row.setUploadedAt(LocalDateTime.now().withNano(0));

        Long id = attachmentRepository.saveAndFlush(row).getId();
        entityManager.clear();
        OpportunityAttachment reloaded = attachmentRepository.findById(id).orElseThrow();

        assertThat(reloaded.getVacancyId()).isEqualTo(row.getVacancyId());
        assertThat(reloaded.getUniversityId()).isEqualTo(10L);
        assertThat(reloaded.getTargetProgrammeIds()).isEqualTo("11,12");
        assertThat(reloaded.getTargetYearOfStudy()).isEqualTo("2");
        assertThat(reloaded.getFileName()).isEqualTo("9f1c2b3a-0000-4000-8000-000000000070");
        assertThat(reloaded.getOriginalFileName()).isEqualTo("Company offer letter.pdf");
        assertThat(reloaded.getContentType()).isEqualTo("application/pdf");
        assertThat(reloaded.getFileSize()).isEqualTo(204800L);
        assertThat(reloaded.getStoragePath())
                .isEqualTo("uploads/9f1c2b3a-0000-4000-8000-000000000070");
        assertThat(reloaded.getUploadedBy()).isEqualTo(7L);
        assertThat(reloaded.getUploadedAt()).isNotNull();
    }

    @Test
    void theUploaderCanBeIdentifiedOnAnAdvert() {
        Long vacancyId = vacancyId();
        attachmentRepository.saveAndFlush(attachment(vacancyId, 10L,
                "9f1c2b3a-0000-4000-8000-000000000080"));
        attachmentRepository.saveAndFlush(attachment(vacancyId, 10L,
                "9f1c2b3a-0000-4000-8000-000000000081"));

        assertThat(attachmentRepository.findByVacancyIdAndUploadedBy(vacancyId, 7L)).hasSize(2);
        assertThat(attachmentRepository.findByVacancyIdAndUploadedBy(vacancyId, 99L)).isEmpty();
    }
}
