package com.example.demo.placement;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

import org.springframework.core.io.UrlResource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.auth.UserEntity;
import com.example.demo.document.FileStorageService;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * S6.7 (opportunity plan §5.11, §6.6) — the four advert-attachment endpoints:
 * upload, list, download, delete.
 *
 * <p><b>Blob storage is reused; authorization is not.</b> The bytes go through
 * {@link FileStorageService}, which stores under a server-generated UUID name
 * and refuses any resolved path escaping the storage root — that is what closes
 * path traversal [H14]. What is <i>not</i> reused is
 * {@code DocumentScopeService}: every question of who may see a file is asked
 * of {@link OpportunityAudienceResolver}, the S2.3 core that also decides who
 * may read the advert itself. <b>A file is never more visible than its
 * advert</b> [H13], and the per-file layers below only ever narrow that
 * audience further — never widen it:
 *
 * <ul>
 *   <li><b>advert-level rows</b> ({@code universityId IS NULL}) exist for the
 *       super admin and the advertising side; they are omitted from a student's
 *       listing entirely and 404 on download — a student never sees a file that
 *       was not shared with their university;</li>
 *   <li><b>university rows</b> are readable by their own university (plus the
 *       super admin and the owning company — the advertising side), and by
 *       matching students;</li>
 *   <li><b>a student</b> must clear three narrowing layers, each 404 on
 *       failure: the resolver's live-share + published gate, the <i>share's</i>
 *       targeting (the advert never reached their feed [H13]), and the
 *       <i>file's own</i> targeting columns.</li>
 * </ul>
 *
 * <p>Three more rules the plan states outright:
 *
 * <ol>
 *   <li>metadata reads answer with {@link OpportunityAttachmentItem} only —
 *       never {@code fileName}/{@code storagePath}, so the on-disk UUID never
 *       reaches a client that could try to guess a path [H14];</li>
 *   <li>{@code universityId} is forced from the session on upload, never read
 *       from the request [H7]: a supervisor's file is scoped to their own
 *       university's students, a company's or the super admin's is
 *       advert-level;</li>
 *   <li>a failed insert deletes the blob again — never orphan a file [H14].
 *       Everything cheap (scope, emptiness, targeting) is validated
 *       <i>before</i> the bytes touch disk, so only a persistence failure
 *       lands in the cleanup path.</li>
 * </ol>
 *
 * <p>Targeting on upload follows §5.8 exactly as the share endpoint does: ids
 * must belong to the uploader's own university [H7] and the resulting audience
 * may only narrow the advert's — never widen it (400 either way), and years of
 * study must be positive.
 */
@Service
@Transactional
public class OpportunityAttachmentService {

    private final OpportunityAttachmentRepository attachmentRepository;
    private final VacancyRepository vacancyRepository;
    private final OpportunityAudienceResolver audienceResolver;
    private final FileStorageService fileStorageService;
    private final StudentRepository studentRepository;
    private final OpportunityShareRepository shareRepository;
    private final ProgrammeRepository programmeRepository;

    public OpportunityAttachmentService(OpportunityAttachmentRepository attachmentRepository,
            VacancyRepository vacancyRepository, OpportunityAudienceResolver audienceResolver,
            FileStorageService fileStorageService, StudentRepository studentRepository,
            OpportunityShareRepository shareRepository, ProgrammeRepository programmeRepository) {
        this.attachmentRepository = attachmentRepository;
        this.vacancyRepository = vacancyRepository;
        this.audienceResolver = audienceResolver;
        this.fileStorageService = fileStorageService;
        this.studentRepository = studentRepository;
        this.shareRepository = shareRepository;
        this.programmeRepository = programmeRepository;
    }

    // --- S6.7 write: upload ------------------------------------------------

    /**
     * {@code POST /api/opportunities/{id}/attachments} — attach a file to an
     * advert.
     *
     * <p>Scope first, as everywhere: the advert must exist (404) and the caller
     * must be the super admin or the advertising side — the owning company
     * (its field supervisors included) or a university linked to the advert by
     * a relay row. Anyone else out of the audience is 404, never 403 [H3]; a
     * plain {@code ADMIN} who can read every advert still cannot attach to any
     * (403), because reading is not writing — the same Seeing≠Acting line the
     * transition engine draws.
     *
     * <p>Then the cheap checks, <i>then</i> the bytes: empty file and
     * §5.8 targeting are all validated before {@code storeFile} runs, so a
     * refused upload never even writes a blob. Only a persistence failure
     * after storage can reach the cleanup, where the stored file is deleted
     * before the exception propagates — an orphan file with no row is exactly
     * what [H14] forbids.
     *
     * <p>The response is the metadata record, not the entity: even the
     * uploader is not told the on-disk name.
     */
    public OpportunityAttachmentItem upload(UserEntity actor, Long vacancyId, MultipartFile file,
            String programmesCsv, String yearsCsv) {
        Vacancy advert = vacancyRepository.findById(vacancyId)
                .orElseThrow(() -> new NoSuchElementException("Opportunity not found."));
        requireAdvertisingSide(actor, advert);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A file is required.");
        }
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || originalFileName.isBlank()) {
            throw new IllegalArgumentException("A file is required.");
        }
        List<Integer> programmes = parseCsv(programmesCsv, "programme");
        List<Integer> years = parseCsv(yearsCsv, "year of study");
        for (Integer year : years) {
            if (year < 1) {
                throw new IllegalArgumentException("Years of study must be positive numbers.");
            }
        }
        if (!programmes.isEmpty() && actor.getUniversityId() != null) {
            requireOwnProgrammes(actor, programmes);
        }
        requireNoWidening("programme", programmes, advert.getTargetProgrammeIds());
        requireNoWidening("year of study", years, advert.getTargetYearOfStudy());

        String stored = fileStorageService.storeFile(file);
        try {
            OpportunityAttachment row = new OpportunityAttachment();
            row.setVacancyId(vacancyId);
            // L8/H7: the scope of the file comes from the session, never the request.
            row.setUniversityId(actor.getUniversityId());
            row.setTargetProgrammeIds(csvOrNull(programmes));
            row.setTargetYearOfStudy(csvOrNull(years));
            row.setFileName(stored);
            row.setOriginalFileName(originalFileName);
            row.setContentType(file.getContentType() == null
                    ? "application/octet-stream" : file.getContentType());
            row.setFileSize(file.getSize());
            row.setStoragePath(stored);
            row.setUploadedBy(actor.getId());
            row.setUploadedAt(LocalDateTime.now());
            OpportunityAttachment saved = attachmentRepository.saveAndFlush(row);
            return OpportunityAttachmentItem.from(saved);
        } catch (RuntimeException ex) {
            // [H14]: the row failed, so the blob must not outlive it.
            fileStorageService.deleteFile(stored);
            throw ex;
        }
    }

    /** Upload gate: super admin, or the advertising side — anyone else 404/403 by audience. */
    private void requireAdvertisingSide(UserEntity actor, Vacancy advert) {
        if (Boolean.TRUE.equals(actor.getSuperAdmin())) {
            return;
        }
        switch (audienceResolver.capacityOf(actor, advert)) {
            case ORIGINATOR, UNIVERSITY -> {
                return;
            }
            case MODERATOR -> throw new AccessDeniedException(
                    "Only a super admin or the advertising side can attach files to an advert.");
            default -> {
                if ("SUPERVISOR".equals(actor.getRole().name()) && actor.getUniversityId() == null) {
                    throw new AccessDeniedException("Your account is not linked to a university.");
                }
                throw new NoSuchElementException("Opportunity not found.");
            }
        }
    }

    // --- S6.7 read: list ---------------------------------------------------

    /**
     * {@code GET /api/opportunities/{id}/attachments} — the metadata listing.
     *
     * <p>The gate is the resolver: out of the advert's audience is 404 before
     * any row is looked at [H3]. What differs per audience is only <i>which
     * rows</i> survive:
     *
     * <ul>
     *   <li>the super admin and the owning company see every row;</li>
     *   <li>a linked university sees advert-level rows plus its own — another
     *       university's files are simply absent [H9];</li>
     *   <li>a student sees only their own university's rows that also clear
     *       the share's targeting and the file's own — and if the share never
     *       addresses them, the whole read is 404, matching the S6.4 by-id
     *       answer for an advert that never reached their feed.</li>
     * </ul>
     */
    public List<OpportunityAttachmentItem> list(UserEntity actor, Long vacancyId) {
        Vacancy advert = audienceResolver.requireVisible(actor, vacancyId);
        OpportunityAudienceResolver.Capacity capacity = audienceResolver.capacityOf(actor, advert);
        if (capacity == OpportunityAudienceResolver.Capacity.STUDENT
                && !shareAddressesViewer(actor, vacancyId)) {
            // The share exists (the resolver proved it) but its targeting narrows
            // this student out: the advert never reached their feed, so its files
            // answer 404 exactly as S6.4's by-id read does — not "empty" [H13].
            throw new NoSuchElementException("Opportunity not found.");
        }
        return attachmentRepository.findByVacancyIdOrderByUploadedAtDesc(vacancyId).stream()
                .filter(row -> addresses(actor, capacity, row))
                .map(OpportunityAttachmentItem::from)
                .toList();
    }

    // --- S6.7 read: download -----------------------------------------------

    /**
     * {@code GET /api/opportunities/{attachmentId}/download} — the bytes.
     *
     * <p>The attachment id alone decides which advert's audience to ask: the
     * resolver 404s anyone outside it, then {@link #addresses} applies the
     * per-file layers (student targeting, another university's rows), and only
     * then is the blob loaded. {@code loadFile} re-checks containment, so a
     * poisoned row whose {@code fileName} points outside the storage root is a
     * 400 from the traversal guard rather than a served file [H14]; a row whose
     * blob has vanished is a 404, not a 500.
     */
    public OpportunityAttachmentDownload download(UserEntity actor, Long attachmentId)
            throws java.net.MalformedURLException {
        OpportunityAttachment row = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new NoSuchElementException("Attachment not found."));
        Vacancy advert = audienceResolver.requireVisible(actor, row.getVacancyId());
        OpportunityAudienceResolver.Capacity capacity = audienceResolver.capacityOf(actor, advert);
        if (!addresses(actor, capacity, row)) {
            throw new NoSuchElementException("Attachment not found.");
        }
        if (capacity == OpportunityAudienceResolver.Capacity.STUDENT
                && !shareAddressesViewer(actor, row.getVacancyId())) {
            throw new NoSuchElementException("Attachment not found.");
        }
        Path path = fileStorageService.loadFile(row.getFileName());
        if (!Files.isReadable(path)) {
            throw new NoSuchElementException("Attachment not found.");
        }
        return new OpportunityAttachmentDownload(row.getOriginalFileName(), row.getContentType(),
                new UrlResource(path.toUri()));
    }

    // --- S6.7 write: delete ------------------------------------------------

    /**
     * {@code DELETE /api/opportunities/{id}/attachments/{attachmentId}} — row
     * and blob together.
     *
     * <p>The path's advert id anchors the attachment (an id replayed under
     * another advert's path does not exist — 404, the S5.2/S6.2 pattern), then
     * the resolver decides the advert's audience, then the per-file layers, and
     * only then the role question: <b>uploader, advertising side, or super
     * admin</b>. A student can never delete — refused at the door by the
     * authority gate, and by the role check here as well should that gate ever
     * change. A plain {@code ADMIN} can read every advert and still cannot
     * delete a file from any (403): reading is not writing.
     *
     * <p>The blob goes first, then the row — the same order
     * {@code FileController} uses, so a half-failure leaves a row whose download
     * 404s rather than a phantom row pointing at nothing.
     */
    public void delete(UserEntity actor, Long vacancyId, Long attachmentId) {
        OpportunityAttachment row = attachmentRepository
                .findByIdAndVacancyId(attachmentId, vacancyId)
                .orElseThrow(() -> new NoSuchElementException("Attachment not found."));
        Vacancy advert = vacancyRepository.findById(vacancyId)
                .orElseThrow(() -> new NoSuchElementException("Opportunity not found."));
        if (!audienceResolver.canSee(actor, advert)) {
            throw new NoSuchElementException("Attachment not found.");
        }
        OpportunityAudienceResolver.Capacity capacity = audienceResolver.capacityOf(actor, advert);
        if (!addresses(actor, capacity, row)) {
            throw new NoSuchElementException("Attachment not found.");
        }
        if (capacity == OpportunityAudienceResolver.Capacity.STUDENT
                && !shareAddressesViewer(actor, vacancyId)) {
            throw new NoSuchElementException("Attachment not found.");
        }
        boolean allowed = Boolean.TRUE.equals(actor.getSuperAdmin())
                || actor.getId().equals(row.getUploadedBy())
                || capacity == OpportunityAudienceResolver.Capacity.ORIGINATOR
                || capacity == OpportunityAudienceResolver.Capacity.UNIVERSITY;
        if (!allowed) {
            throw new AccessDeniedException(
                    "Only the uploader, the advertising side or a super admin can delete a file.");
        }
        fileStorageService.deleteFile(row.getFileName());
        attachmentRepository.delete(row);
    }

    // --- The per-file audience layers --------------------------------------

    /**
     * Does this <i>row</i> address this actor, given the advert capacity the
     * resolver just handed out? The one predicate list, download and delete all
     * share, so the three reads can never drift apart:
     *
     * <ul>
     *   <li>super admin / admin role and the owning company: every row on an
     *       advert they can see;</li>
     *   <li>a linked university: advert-level rows plus its own — a rival's
     *       files do not exist for it [H9];</li>
     *   <li>a student: their own university's rows only (advert-level rows are
     *       never a student's), each further narrowed by the file's own
     *       targeting columns [H13];</li>
     *   <li>out of audience: nothing (the resolver usually 404s first — this is
     *       the belt to its braces).</li>
     * </ul>
     */
    private boolean addresses(UserEntity actor, OpportunityAudienceResolver.Capacity capacity,
            OpportunityAttachment row) {
        switch (capacity) {
            case MODERATOR, ORIGINATOR:
                return true;
            case UNIVERSITY:
                return row.getUniversityId() == null
                        || row.getUniversityId().equals(actor.getUniversityId());
            case STUDENT: {
                if (!belongsToUniversity(row, actor.getUniversityId())) {
                    return false;
                }
                Student viewer = requireStudent(actor);
                return fileAddressesViewer(row, viewer);
            }
            default:
                return false;
        }
    }

    private boolean belongsToUniversity(OpportunityAttachment row, Long universityId) {
        return universityId != null && row.getUniversityId() != null
                && row.getUniversityId().equals(universityId);
    }

    /**
     * The viewer's {@code students} row — targeting questions are unanswerable
     * without it, and a student account that has none is refused (403) rather
     * than defaulted into any audience, mirroring S6.4's feed.
     */
    private Student requireStudent(UserEntity actor) {
        return studentRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new AccessDeniedException("Your account has no student record."));
    }

    /**
     * The share's own targeting against this student — the advert-level half of
     * [H13]: a file on a share narrowed to "year 3 only" never reaches a year 2
     * student, exactly as the S6.4 feed excludes them.
     */
    private boolean shareAddressesViewer(UserEntity actor, Long vacancyId) {
        Long universityId = actor.getUniversityId();
        if (universityId == null) {
            return false;
        }
        OpportunityShare share = shareRepository
                .findByVacancyIdAndUniversityId(vacancyId, universityId)
                .filter(row -> row.getStatus() == OpportunityShare.Status.SHARED)
                .orElseThrow(() -> new NoSuchElementException("Opportunity not found."));
        Student viewer = requireStudent(actor);
        return csvContains(share.getTargetProgrammeIds(), viewer.getProgrammeId())
                && csvContains(share.getTargetDepartmentIds(), viewer.getDepartmentId())
                && csvContains(share.getTargetYearOfStudy(),
                        viewer.getYearOfStudy() == null ? null : viewer.getYearOfStudy().longValue());
    }

    /** The file's own targeting columns against this student [§5.11]. */
    private boolean fileAddressesViewer(OpportunityAttachment row, Student viewer) {
        return csvContains(row.getTargetProgrammeIds(), viewer.getProgrammeId())
                && csvContains(row.getTargetYearOfStudy(),
                        viewer.getYearOfStudy() == null ? null : viewer.getYearOfStudy().longValue());
    }

    /** Blank column = everyone in the university; a populated one must contain the value. */
    private boolean csvContains(String csv, Long value) {
        if (csv == null || csv.isBlank()) {
            return true;
        }
        if (value == null) {
            return false;
        }
        for (String part : csv.split(",")) {
            if (part.trim().equals(Long.toString(value))) {
                return true;
            }
        }
        return false;
    }

    // --- §5.8 targeting validation on upload -------------------------------

    /** [H7]: targeting is an academic claim — only the session's own university may make one. */
    private void requireOwnProgrammes(UserEntity actor, List<Integer> programmes) {
        int universityId = actor.getUniversityId().intValue();
        Set<Integer> own = programmeRepository.findByUniversityId(universityId).stream()
                .map(Programme::getProgrammeId).collect(java.util.stream.Collectors.toSet());
        for (Integer id : programmes) {
            if (!own.contains(id)) {
                throw new IllegalArgumentException(
                        "Targeting programme " + id + " does not belong to your university.");
            }
        }
    }

    /**
     * §5.8 in one predicate, the share endpoint's rule verbatim: an advert with
     * no targeting offers everything, so anything goes; an advert that does
     * target accepts the same ids or fewer — an empty list ("everyone") and any
     * un-offered id are widenings → 400.
     */
    private void requireNoWidening(String noun, List<Integer> requested, String offeredCsv) {
        Set<Integer> offered = csvInts(offeredCsv);
        if (offered.isEmpty()) {
            return;
        }
        if (requested.isEmpty()) {
            throw new IllegalArgumentException("A file may narrow the offered audience, never widen it"
                    + " — name the " + noun + "s this file is for.");
        }
        if (!offered.containsAll(requested)) {
            throw new IllegalArgumentException("A file may narrow the offered audience, never widen it"
                    + " — the " + noun + " targeting is wider than what was offered.");
        }
    }

    private List<Integer> parseCsv(String csv, String noun) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        List<Integer> parsed = new ArrayList<>();
        for (String raw : csv.split(",")) {
            String value = raw.trim();
            if (value.isEmpty()) {
                continue;
            }
            try {
                parsed.add(Integer.parseInt(value));
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException(
                        "Targeting " + noun + " ids must be whole numbers.");
            }
        }
        return parsed;
    }

    /** Ids travel as comma-separated strings on both sides (§5.8, matching {@code Vacancy}). */
    private String csvOrNull(List<Integer> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return String.join(",", values.stream().map(String::valueOf).toList());
    }

    private Set<Integer> csvInts(String csv) {
        if (csv == null || csv.isBlank()) {
            return Set.of();
        }
        Set<Integer> parsed = new java.util.LinkedHashSet<>();
        for (String raw : csv.split(",")) {
            String value = raw.trim();
            if (value.isEmpty()) {
                continue;
            }
            try {
                parsed.add(Integer.parseInt(value));
            } catch (NumberFormatException ignored) {
                // Advert-side junk: no defensible subset relation, no claim.
            }
        }
        return parsed;
    }
}
