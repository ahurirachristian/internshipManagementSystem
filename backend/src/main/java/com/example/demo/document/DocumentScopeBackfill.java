package com.example.demo.document;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/**
 * PC3a: one-time backfill of the institution scope added to {@link Document}.
 *
 * Rows uploaded before scoping existed carry no university or company, and would
 * otherwise be ADMIN-only. Each such row is assigned the uploader's own scope by
 * looking up their account. Rows whose uploader cannot be resolved (deleted
 * accounts, or the historical literal "current-user") are left unscoped on
 * purpose rather than being guessed into the wrong institution.
 *
 * Idempotent: a second run finds nothing to do. The project uses ddl-auto=update
 * with no migration tool, so this runs on every boot but only writes when needed.
 */
@Component
@Order(45)
public class DocumentScopeBackfill implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DocumentScopeBackfill.class);

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    public DocumentScopeBackfill(DocumentRepository documentRepository, UserRepository userRepository) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        var unscoped = documentRepository.findAll().stream()
                .filter(Document::isUnscoped)
                .toList();
        if (unscoped.isEmpty()) {
            return;
        }

        int resolved = 0;
        int leftUnscoped = 0;
        for (Document document : unscoped) {
            UserEntity uploader = userRepository.findByUsername(document.getUploadedBy()).orElse(null);
            if (uploader == null) {
                leftUnscoped++;
                continue;
            }
            if (uploader.getUniversityId() != null) {
                document.setUniversityId(uploader.getUniversityId());
            } else if (uploader.getCompanyId() != null) {
                document.setCompanyId(uploader.getCompanyId());
            } else {
                // An unscoped account (e.g. a bare admin) cannot place the row.
                leftUnscoped++;
                continue;
            }
            documentRepository.save(document);
            resolved++;
        }
        log.info("Document scope backfill: {} of {} unscoped rows resolved to an institution; {} remain ADMIN-only.",
                resolved, unscoped.size(), leftUnscoped);
    }
}
