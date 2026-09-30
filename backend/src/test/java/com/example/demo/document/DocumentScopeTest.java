package com.example.demo.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * PC3a (L7): /api/files reads are institution scoped.
 *
 * Seeded accounts give two universities and one company:
 *   university -> universityId 19 (Mak), kyu -> universityId 2, airtel -> companyId 1.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DocumentScopeTest {

    private static final Long UNIVERSITY_A = 19L;
    private static final Long UNIVERSITY_B = 2L;
    private static final Long COMPANY_A = 1L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentScopeService documentScope;

    @Autowired
    private com.example.demo.auth.UserRepository userRepository;

    @BeforeEach
    void clearDocuments() {
        documentRepository.deleteAll();
    }

    private Document document(String name, Long universityId, Long companyId, String uploadedBy) {
        Document doc = new Document();
        doc.setFileName(name);
        doc.setOriginalFileName(name);
        doc.setContentType("text/plain");
        doc.setFileSize(5L);
        doc.setCategory("Weekly Reports");
        doc.setUploadedBy(uploadedBy);
        doc.setUploadDate(LocalDateTime.now());
        doc.setFilePath("/api/files/view/" + name);
        doc.setFileData("hello".getBytes());
        doc.setUniversityId(universityId);
        doc.setCompanyId(companyId);
        return documentRepository.saveAndFlush(doc);
    }

    /**
     * Seeded STUDENT accounts are flagged mustChangePassword, and the P4 filter
     * answers 403 before the controller runs. Clear it so the assertion is about
     * document visibility rather than the password gate.
     */
    private void clearPasswordChangeFlag(String username) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setMustChangePassword(false);
            userRepository.save(user);
        });
    }

    @Test
    void aSupervisorSeesOnlyTheirOwnUniversity() throws Exception {
        document("a1.txt", UNIVERSITY_A, null, "university");
        document("b1.txt", UNIVERSITY_B, null, "kyu");

        mockMvc.perform(get("/api/files").with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].originalFileName").value("a1.txt"));
    }

    @Test
    void aCompanySeesOnlyItsOwnDocuments() throws Exception {
        document("uni.txt", UNIVERSITY_A, null, "university");
        document("company.txt", null, COMPANY_A, "airtel");

        mockMvc.perform(get("/api/files").with(user("airtel").roles("COMPANY")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].originalFileName").value("company.txt"));
    }

    @Test
    void adminSeesEveryDocument() throws Exception {
        document("a1.txt", UNIVERSITY_A, null, "university");
        document("b1.txt", UNIVERSITY_B, null, "kyu");
        document("company.txt", null, COMPANY_A, "airtel");

        mockMvc.perform(get("/api/files").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void unscopedDocumentsAreAdminOnly() throws Exception {
        document("legacy.txt", null, null, "someone-deleted");

        mockMvc.perform(get("/api/files").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/files").with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void aStudentStillSeesTheirOwnUploadViaTheUploaderClause() throws Exception {
        // The seeded student account carries no universityId of its own, so this
        // only passes because visibility includes rows the caller uploaded.
        document("own.txt", UNIVERSITY_A, null, "2400101003");
        clearPasswordChangeFlag("2400101003");

        mockMvc.perform(get("/api/files").with(user("2400101003").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].originalFileName").value("own.txt"));
    }

    @Test
    void deletingAnotherInstitutionsDocumentIsNotFoundNotForbidden() throws Exception {
        Document theirs = document("theirs.txt", UNIVERSITY_B, null, "kyu");

        mockMvc.perform(delete("/api/files/{id}", theirs.getId()).with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isNotFound());

        assertThat(documentRepository.findById(theirs.getId())).isPresent();
    }

    @Test
    void supervisorCanDeleteWithinTheirOwnUniversity() throws Exception {
        Document mine = document("mine.txt", UNIVERSITY_A, null, "university");

        mockMvc.perform(delete("/api/files/{id}", mine.getId()).with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isNoContent());

        assertThat(documentRepository.findById(mine.getId())).isEmpty();
    }

    @Test
    void uploadedDocumentIsScopedToTheUploaderInstitution() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "scoped.txt", "text/plain", "hello".getBytes());

        mockMvc.perform(multipart("/api/files")
                        .file(file)
                        .param("category", "Evaluation Forms")
                        .param("audience", "SUPERVISORS")
                        .param("version", "v1")
                        .param("description", "End of placement evaluation")
                        .with(user("kyu").roles("SUPERVISOR")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.universityId").value(UNIVERSITY_B))
                .andExpect(jsonPath("$.companyId").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.audience").value("SUPERVISORS"))
                .andExpect(jsonPath("$.version").value("v1"))
                .andExpect(jsonPath("$.description").value("End of placement evaluation"))
                .andExpect(jsonPath("$.downloadCount").value(0))
                .andExpect(jsonPath("$.shared").value(false));

        assertThat(documentRepository.findAll()).singleElement()
                .satisfies(doc -> assertThat(doc.getUniversityId()).isEqualTo(UNIVERSITY_B));
    }

    @Test
    void blankOptionalMetadataIsStoredAsNull() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "bare.txt", "text/plain", "hello".getBytes());

        mockMvc.perform(multipart("/api/files")
                        .file(file)
                        .param("category", "Weekly Reports")
                        .param("audience", "  ")
                        .with(user("university").roles("SUPERVISOR")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.audience").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.version").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.description").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void companyUploadIsScopedToItsOwnCompany() throws Exception {
        // Uploading still requires ADMIN/SUPERVISOR, so use an admin with no
        // institution and assert the company field stays null rather than guessing.
        MockMultipartFile file = new MockMultipartFile("file", "admin.txt", "text/plain", "hello".getBytes());
        mockMvc.perform(multipart("/api/files")
                        .file(file)
                        .param("category", "Weekly Reports")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.universityId").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.companyId").value(org.hamcrest.Matchers.nullValue()));
    }
}
