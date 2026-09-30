package com.example.demo.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * PC3b: the endpoints the localStorage UI now depends on.
 *
 * Scope rules are inherited from PC3a, so these tests focus on the new
 * behaviors: download counting, real usage totals, share token lifecycle, and
 * public token access.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FileApiTest {

    private static final Long UNIVERSITY_A = 19L;
    private static final Long UNIVERSITY_B = 2L;
    private static final Long COMPANY_A = 1L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @BeforeEach
    void seed() throws Exception {
        documentRepository.deleteAll();
        // Real bytes on disk, since download/preview serve from storage.
        stored("alpha.txt", "alpha body", UNIVERSITY_A, null, "university");
        stored("beta.txt", "beta body", UNIVERSITY_B, null, "kyu");
        stored("gamma.txt", "gamma body", null, COMPANY_A, "airtel");
    }

    private Document stored(String name, String body, Long universityId, Long companyId, String uploadedBy)
            throws Exception {
        byte[] bytes = body.getBytes();
        Path dir = Path.of(uploadDir);
        Files.createDirectories(dir);
        Files.write(dir.resolve(name), bytes);

        Document doc = new Document();
        doc.setFileName(name);
        doc.setOriginalFileName(name);
        doc.setContentType(MediaType.TEXT_PLAIN_VALUE);
        doc.setFileSize((long) bytes.length);
        doc.setCategory("Weekly Reports");
        doc.setUploadedBy(uploadedBy);
        doc.setUploadDate(LocalDateTime.now());
        doc.setFilePath("/api/files/view/" + name);
        doc.setFileData(bytes);
        doc.setUniversityId(universityId);
        doc.setCompanyId(companyId);
        return documentRepository.saveAndFlush(doc);
    }

    @Test
    void downloadStreamsTheFileAndBumpsTheCount() throws Exception {
        Document doc = documentRepository.findByFileNameOrderByIdAsc("alpha.txt").orElseThrow();

        mockMvc.perform(get("/api/files/{id}/download", doc.getId()).with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("alpha.txt")));

        assertThat(documentRepository.findById(doc.getId()).orElseThrow().getDownloadCount()).isEqualTo(1L);
    }

    @Test
    void repeatedDownloadsAccumulate() throws Exception {
        Document doc = documentRepository.findByFileNameOrderByIdAsc("alpha.txt").orElseThrow();

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(get("/api/files/{id}/download", doc.getId()).with(user("university").roles("SUPERVISOR")))
                    .andExpect(status().isOk());
        }

        assertThat(documentRepository.findById(doc.getId()).orElseThrow().getDownloadCount()).isEqualTo(3L);
    }

    @Test
    void downloadingAnotherInstitutionsDocumentIsNotFound() throws Exception {
        Document theirs = documentRepository.findByFileNameOrderByIdAsc("beta.txt").orElseThrow();

        mockMvc.perform(get("/api/files/{id}/download", theirs.getId()).with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isNotFound());

        assertThat(documentRepository.findById(theirs.getId()).orElseThrow().getDownloadCount()).isZero();
    }

    @Test
    void previewIsAlsoScoped() throws Exception {
        mockMvc.perform(get("/api/files/view/alpha.txt").with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/files/view/beta.txt").with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isNotFound());
    }

    @Test
    void previewDoesNotCountAsADownload() throws Exception {
        Document doc = documentRepository.findByFileNameOrderByIdAsc("alpha.txt").orElseThrow();

        mockMvc.perform(get("/api/files/view/alpha.txt").with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isOk());

        assertThat(documentRepository.findById(doc.getId()).orElseThrow().getDownloadCount()).isZero();
    }

    @Test
    void usageCountsOnlyWhatTheCallerCanSee() throws Exception {
        mockMvc.perform(get("/api/files/usage").with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentCount").value(1))
                // "alpha body" is 10 bytes; the other two files must not be counted.
                .andExpect(jsonPath("$.totalBytes").value(10))
                .andExpect(jsonPath("$.totalDownloads").value(0));
    }

    @Test
    void usageForAdminAggregatesEveryInstitution() throws Exception {
        mockMvc.perform(get("/api/files/usage").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentCount").value(3))
                .andExpect(jsonPath("$.byCategory['Weekly Reports'].count").value(3));
    }

    @Test
    void shareCanBeEnabledAndRevoked() throws Exception {
        Document doc = documentRepository.findByFileNameOrderByIdAsc("alpha.txt").orElseThrow();

        mockMvc.perform(patch("/api/files/{id}/share", doc.getId())
                        .param("enabled", "true")
                        .with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shared").value(true));

        String token = documentRepository.findById(doc.getId()).orElseThrow().getShareToken();
        assertThat(token).isNotBlank();

        mockMvc.perform(patch("/api/files/{id}/share", doc.getId())
                        .param("enabled", "false")
                        .with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shared").value(false));

        assertThat(documentRepository.findById(doc.getId()).orElseThrow().getShareToken()).isNull();
    }

    @Test
    void regeneratingInvalidatesTheOldToken() throws Exception {
        Document doc = documentRepository.findByFileNameOrderByIdAsc("alpha.txt").orElseThrow();

        mockMvc.perform(patch("/api/files/{id}/share", doc.getId())
                .param("enabled", "true").with(user("university").roles("SUPERVISOR")));
        String first = documentRepository.findById(doc.getId()).orElseThrow().getShareToken();

        mockMvc.perform(patch("/api/files/{id}/share", doc.getId())
                .param("enabled", "true").with(user("university").roles("SUPERVISOR")));
        String second = documentRepository.findById(doc.getId()).orElseThrow().getShareToken();

        assertThat(second).isNotEqualTo(first);
        // The leaked link must stop working.
        mockMvc.perform(get("/api/files/share/{token}", first))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/files/share/{token}", second))
                .andExpect(status().isOk());
    }

    @Test
    void sharedFileIsPubliclyReadableWithoutAuthentication() throws Exception {
        Document doc = documentRepository.findByFileNameOrderByIdAsc("alpha.txt").orElseThrow();
        String token = "publictoken123";
        doc.setShareToken(token);
        documentRepository.saveAndFlush(doc);

        // No .with(user(...)): share links are meant to work for recipients who
        // have no IMS account.
        mockMvc.perform(get("/api/files/share/{token}", token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("alpha.txt")));
    }

    @Test
    void publicShareDoesNotBumpTheAuthenticatedDownloadCount() throws Exception {
        Document doc = documentRepository.findByFileNameOrderByIdAsc("alpha.txt").orElseThrow();
        doc.setShareToken("counttoken");
        documentRepository.saveAndFlush(doc);

        mockMvc.perform(get("/api/files/share/counttoken")).andExpect(status().isOk());

        assertThat(documentRepository.findById(doc.getId()).orElseThrow().getDownloadCount()).isZero();
    }

    @Test
    void anUnsharedDocumentHasNoWorkingPublicLink() throws Exception {
        mockMvc.perform(get("/api/files/share/{token}", "nonexistent"))
                .andExpect(status().isNotFound());
    }

    @Test
    void companyCannotShareAnotherInstitutionsDocument() throws Exception {
        Document theirs = documentRepository.findByFileNameOrderByIdAsc("beta.txt").orElseThrow();

        mockMvc.perform(patch("/api/files/{id}/share", theirs.getId())
                        .param("enabled", "true")
                        .with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isNotFound());
    }

    @Test
    void aCompanyCannotShareBecauseUploadAndShareAreAdminOrSupervisorOnly() throws Exception {
        Document theirs = documentRepository.findByFileNameOrderByIdAsc("gamma.txt").orElseThrow();

        mockMvc.perform(patch("/api/files/{id}/share", theirs.getId())
                        .param("enabled", "true")
                        .with(user("airtel").roles("COMPANY")))
                .andExpect(status().isForbidden());
    }

    @Test
    void uploadThenDownloadRoundTripsThroughRealStorage() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "roundtrip.txt", "text/plain", "round trip".getBytes());

        String body = mockMvc.perform(multipart("/api/files")
                        .file(file)
                        .param("category", "Weekly Reports")
                        .with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Document created = documentRepository.findAll().stream()
                .filter(doc -> "roundtrip.txt".equals(doc.getOriginalFileName()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Uploaded document was not persisted: " + body));
        long id = created.getId();

        mockMvc.perform(get("/api/files/{id}/download", id).with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(content().string("round trip"));

        assertThat(documentRepository.findById(id).orElseThrow().getDownloadCount()).isEqualTo(1L);
    }

    @Test
    void deleteRemovesTheRowAndItsBytes() throws Exception {
        Document doc = documentRepository.findByFileNameOrderByIdAsc("alpha.txt").orElseThrow();
        assertThat(Files.exists(Path.of(uploadDir).resolve("alpha.txt"))).isTrue();

        mockMvc.perform(delete("/api/files/{id}", doc.getId()).with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isNoContent());

        assertThat(documentRepository.findById(doc.getId())).isEmpty();
        assertThat(Files.exists(Path.of(uploadDir).resolve("alpha.txt"))).isFalse();
    }

    @Test
    void aFilenameCannotInjectExtraHeaders() throws Exception {
        Document doc = documentRepository.findByFileNameOrderByIdAsc("alpha.txt").orElseThrow();
        doc.setOriginalFileName("evil\"\r\nX-Injected: yes\r\n.txt");
        documentRepository.saveAndFlush(doc);

        mockMvc.perform(get("/api/files/{id}/download", doc.getId()).with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("X-Injected"));
    }
}
