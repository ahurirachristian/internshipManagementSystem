package com.example.demo.document;

import java.security.Principal;
import java.util.Optional;
import org.springframework.stereotype.Service;
import com.example.demo.auth.AuthorizationScopeService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/**
 * PC3a (L7): resolves which documents a caller may see.
 *
 * Policy, agreed before implementation:
 * <ul>
 *   <li>ADMIN sees every document.</li>
 *   <li>Everyone else sees documents scoped to their own university or company,
 *       plus any document they uploaded themselves.</li>
 *   <li>A document with neither a university nor a company is unscoped and
 *       readable by ADMIN only. That is how pre-scope rows read until
 *       {@link DocumentScopeBackfill} resolves them.</li>
 * </ul>
 *
 * The visibility predicate lives in {@link DocumentRepository#findVisibleTo} so the
 * list and the single-document lookups cannot drift apart.
 */
@Service
public class DocumentScopeService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final AuthorizationScopeService authorization;

    public DocumentScopeService(DocumentRepository documentRepository, UserRepository userRepository,
            AuthorizationScopeService authorization) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.authorization = authorization;
    }

    public UserEntity current(Principal principal) {
        return userRepository.findByUsername(principal.getName()).orElseThrow();
    }

    public boolean isAdmin(UserEntity user) {
        return authorization.isAdminLike(user);
    }

    public java.util.List<Document> visibleTo(UserEntity actor) {
        return documentRepository.findVisibleTo(isAdmin(actor), actor.getUniversityId(),
                actor.getCompanyId(), actor.getUsername());
    }

    /**
     * Empty when the caller may not see the document. Callers must translate this
     * to 404, never 403, so document ids cannot be probed across institutions.
     */
    public Optional<Document> findVisible(UserEntity actor, Long id) {
        return documentRepository.findVisibleById(id, isAdmin(actor), actor.getUniversityId(),
                actor.getCompanyId(), actor.getUsername());
    }
}
