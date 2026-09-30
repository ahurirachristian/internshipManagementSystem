package com.example.demo.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * L7: the /api/files surface previously accepted any authenticated caller for
 * uploads and deletes, resolved caller-supplied names without a containment
 * check, and stored a hardcoded "current-user" as the uploader. These tests pin
 * the closed behaviour.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FileAccessScopeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private FileStorageService fileStorageService;

    private static MockMultipartFile upload(String name) {
        return new MockMultipartFile("file", name, "text/plain", "hello".getBytes());
    }

    @Test
    void filesRequireLogin() throws Exception {
        mockMvc.perform(get("/api/files"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void studentCannotUpload() throws Exception {
        mockMvc.perform(multipart("/api/files").file(upload("notes.txt"))
                        .param("category", "Weekly Reports")
                        .with(SecurityMockMvcRequestPostProcessors.user("2400101003").roles("STUDENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    void companyCannotUpload() throws Exception {
        mockMvc.perform(multipart("/api/files").file(upload("notes.txt"))
                        .param("category", "Weekly Reports")
                        .with(SecurityMockMvcRequestPostProcessors.user("airtel").roles("COMPANY")))
                .andExpect(status().isForbidden());
    }

    @Test
    void supervisorCanUploadAndTheRealUploaderIsRecorded() throws Exception {
        mockMvc.perform(multipart("/api/files").file(upload("report.txt"))
                        .param("category", "Weekly Reports")
                        .with(SecurityMockMvcRequestPostProcessors.user("kyu").roles("SUPERVISOR")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.uploadedBy").value("kyu"));
    }

    @Test
    void adminCanDeleteButStudentCannot() throws Exception {
        Document doc = new Document();
        doc.setFileName("scope-test.txt");
        doc.setOriginalFileName("scope-test.txt");
        doc.setContentType("text/plain");
        doc.setFileSize(5L);
        doc.setCategory("Weekly Reports");
        doc.setUploadedBy("kyu");
        doc.setUploadDate(java.time.LocalDateTime.now());
        doc.setFilePath("/api/files/view/scope-test.txt");
        doc.setFileData("hello".getBytes());
        Document saved = documentRepository.saveAndFlush(doc);

        mockMvc.perform(delete("/api/files/{id}", saved.getId())
                        .with(SecurityMockMvcRequestPostProcessors.user("2400101003").roles("STUDENT")))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/files/{id}", saved.getId())
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isNoContent());
    }

    @Test
    void traversalOutsideTheStorageRootIsRejected() {
        Path root = fileStorageService.getStorageLocation();
        assertThatThrownBy(() -> fileStorageService.loadFile("../../etc/passwd"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> fileStorageService.loadFile("subdir/../../escape.txt"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> fileStorageService.loadFile(""))
                .isInstanceOf(IllegalArgumentException.class);
        // A plain name still resolves, and stays inside the root.
        assertThat(fileStorageService.loadFile("report.txt").startsWith(root)).isTrue();
    }

    @Test
    void traversalRequestReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/files/view/{name}", "..%2F..%2Fetc%2Fpasswd")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingFileReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/files/view/{name}", "definitely-not-here.txt")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    void storedFileLandsInsideTheConfiguredDirectory() throws Exception {
        mockMvc.perform(multipart("/api/files").file(upload("inside.txt"))
                        .param("category", "Evaluation Forms")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isCreated());

        Document stored = documentRepository.findAll().stream()
                .filter(d -> "inside.txt".equals(d.getOriginalFileName()))
                .findFirst()
                .orElseThrow();
        assertThat(fileStorageService.getStorageLocation().resolve(stored.getFileName()))
                .exists();
        assertThat(Files.isRegularFile(
                fileStorageService.getStorageLocation().resolve(stored.getFileName()))).isTrue();
    }
}
