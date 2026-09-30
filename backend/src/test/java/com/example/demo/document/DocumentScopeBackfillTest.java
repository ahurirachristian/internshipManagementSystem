package com.example.demo.document;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/**
 * PC3a: the startup backfill must place pre-scope rows in the uploader's own
 * institution, and must leave alone anything it cannot resolve.
 */
@SpringBootTest
@Transactional
class DocumentScopeBackfillTest {

    @Autowired
    private DocumentScopeBackfill backfill;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void newColumnsDefaultSanelyForExistingRows() {
        Document doc = legacy("defaults.txt", "kyu");

        // ddl-auto=update adds these columns to existing rows as NULL; only
        // downloadCount must arrive already usable.
        assertThat(doc.getDownloadCount()).isZero();
        assertThat(doc.getShareToken()).isNull();
        assertThat(doc.getAudience()).isNull();
        assertThat(doc.getVersion()).isNull();
        assertThat(doc.getDescription()).isNull();
    }

    private Document legacy(String name, String uploadedBy) {
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
        return documentRepository.saveAndFlush(doc);
    }

    @Test
    void resolvesARowToTheUploadersUniversity() {
        Document doc = legacy("legacy-university.txt", "kyu");

        backfill.run();

        assertThat(documentRepository.findById(doc.getId())).get()
                .satisfies(resolved -> {
                    assertThat(resolved.getUniversityId()).isEqualTo(2L);
                    assertThat(resolved.getCompanyId()).isNull();
                });
    }

    @Test
    void resolvesARowToTheUploadersCompany() {
        Document doc = legacy("legacy-company.txt", "airtel");

        backfill.run();

        assertThat(documentRepository.findById(doc.getId())).get()
                .satisfies(resolved -> assertThat(resolved.getCompanyId()).isEqualTo(1L));
    }

    @Test
    void leavesRowsItCannotResolveUnscoped() {
        Document deletedUploader = legacy("legacy-ghost.txt", "no-such-user");
        Document institutionless = legacy("legacy-admin.txt", "admin");

        backfill.run();

        // Guessing here would put one tenant's file in another tenant's list.
        assertThat(documentRepository.findById(deletedUploader.getId())).get()
                .satisfies(resolved -> assertThat(resolved.isUnscoped()).isTrue());
        assertThat(documentRepository.findById(institutionless.getId())).get()
                .satisfies(resolved -> assertThat(resolved.isUnscoped()).isTrue());
    }

    @Test
    void doesNotTouchRowsThatAlreadyHaveAScope() {
        Document alreadyScoped = new Document();
        alreadyScoped.setFileName("scoped.txt");
        alreadyScoped.setOriginalFileName("scoped.txt");
        alreadyScoped.setContentType("text/plain");
        alreadyScoped.setFileSize(5L);
        alreadyScoped.setCategory("Weekly Reports");
        // Deliberately mismatched uploader: the backfill must not second-guess an
        // already-scoped row by overwriting it from uploadedBy.
        alreadyScoped.setUploadedBy("kyu");
        alreadyScoped.setUploadDate(LocalDateTime.now());
        alreadyScoped.setFilePath("/api/files/view/scoped.txt");
        alreadyScoped.setFileData("hello".getBytes());
        alreadyScoped.setUniversityId(19L);
        Document saved = documentRepository.saveAndFlush(alreadyScoped);

        backfill.run();

        assertThat(documentRepository.findById(saved.getId())).get()
                .satisfies(resolved -> assertThat(resolved.getUniversityId()).isEqualTo(19L));
    }

    @Test
    void isIdempotentAcrossRepeatedRuns() {
        Document doc = legacy("idempotent.txt", "kyu");

        backfill.run();
        backfill.run();

        assertThat(documentRepository.findById(doc.getId())).get()
                .satisfies(resolved -> {
                    assertThat(resolved.getUniversityId()).isEqualTo(2L);
                    assertThat(resolved.getCompanyId()).isNull();
                });
    }

    @Test
    void uploaderAccountIsUnchangedByTheBackfill() {
        Document doc = legacy("no-account-change.txt", "airtel");
        UserEntity before = userRepository.findByUsername("airtel").orElseThrow();

        backfill.run();

        assertThat(userRepository.findByUsername("airtel").orElseThrow().getCompanyId())
                .isEqualTo(before.getCompanyId());
        assertThat(documentRepository.findById(doc.getId())).isPresent();
    }
}
