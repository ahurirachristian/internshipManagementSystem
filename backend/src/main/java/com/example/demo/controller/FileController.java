package com.example.demo.controller;

import com.example.demo.auth.UserEntity;
import com.example.demo.document.Document;
import com.example.demo.document.DocumentRepository;
import com.example.demo.document.DocumentScopeService;
import com.example.demo.document.FileStorageService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/files")
@PreAuthorize("isAuthenticated()")
public class FileController {

    /**
     * L7: reads stay open to any authenticated user, but the frontend already
     * treats upload as an ADMIN/SUPERVISOR capability (FileManagement.jsx).
     * Enforcing it here closes the direct-API bypass.
     */
    private static final String CAN_UPLOAD = "hasAnyAuthority('ADMIN','SUPERVISOR')";

    private final DocumentRepository documentRepository;
    private final FileStorageService fileStorageService;
    private final DocumentScopeService documentScope;

    public FileController(DocumentRepository documentRepository, FileStorageService fileStorageService,
            DocumentScopeService documentScope) {
        this.documentRepository = documentRepository;
        this.fileStorageService = fileStorageService;
        this.documentScope = documentScope;
    }

    /**
     * PC3a (L7): the list is filtered to the caller's institution. Documents with
     * no resolvable institution stay ADMIN-only, so they are absent here for
     * everyone else rather than leaking into another tenant's list.
     */
    @GetMapping
    public List<Map<String, Object>> getAllFiles(Principal principal) {
        return documentScope.visibleTo(documentScope.current(principal)).stream()
                .map(FileController::toSummary)
                .collect(Collectors.toList());
    }

    /**
     * Inline preview. The stored name is a server-generated UUID, so this cannot
     * be authorized by id — resolve it through the caller's scope first and
     * answer 404 for anything they may not see.
     */
    @GetMapping("/view/{fileName}")
    public ResponseEntity<Resource> viewFile(@PathVariable String fileName, Principal principal) throws IOException {
        UserEntity actor = documentScope.current(principal);
        if (documentScope.findVisibleByFileName(actor, fileName).isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Path filePath;
        try {
            filePath = fileStorageService.loadFile(fileName);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(null);
        }
        if (!Files.isReadable(filePath)) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new UrlResource(filePath.toUri());

        String contentType = Files.probeContentType(filePath);
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    /**
     * PC3b: attachment download, which also records the download. Distinct from
     * /view so a preview does not inflate the count the UI shows.
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id, Principal principal) throws IOException {
        UserEntity actor = documentScope.current(principal);
        Optional<Document> visible = documentScope.findVisible(actor, id);
        if (visible.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Document doc = visible.get();

        Path filePath;
        try {
            filePath = fileStorageService.loadFile(doc.getFileName());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(null);
        }
        if (!Files.isReadable(filePath)) {
            return ResponseEntity.notFound().build();
        }

        doc.setDownloadCount((doc.getDownloadCount() == null ? 0L : doc.getDownloadCount()) + 1);
        documentRepository.save(doc);

        Resource resource = new UrlResource(filePath.toUri());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + sanitizeForHeader(doc.getOriginalFileName()) + "\"")
                .body(resource);
    }

    /** Real usage: only what the caller can actually see. Never a quota fiction. */
    @GetMapping("/usage")
    public Map<String, Object> usage(Principal principal) {
        UserEntity actor = documentScope.current(principal);
        List<Document> visible = documentScope.visibleTo(actor);
        long totalBytes = visible.stream()
                .mapToLong(doc -> doc.getFileSize() == null ? 0L : doc.getFileSize())
                .sum();
        long totalDownloads = visible.stream()
                .mapToLong(doc -> doc.getDownloadCount() == null ? 0L : doc.getDownloadCount())
                .sum();

        Map<String, Object> usage = new java.util.HashMap<>();
        usage.put("documentCount", visible.size());
        usage.put("totalBytes", totalBytes);
        usage.put("totalDownloads", totalDownloads);
        usage.put("byCategory", visible.stream()
                .collect(Collectors.groupingBy(Document::getCategory,
                        Collectors.collectingAndThen(Collectors.toList(), group -> {
                            Map<String, Object> entry = new java.util.HashMap<>();
                            long bytes = group.stream()
                                    .mapToLong(doc -> doc.getFileSize() == null ? 0L : doc.getFileSize())
                                    .sum();
                            entry.put("count", group.size());
                            entry.put("totalBytes", bytes);
                            return entry;
                        }))));
        return usage;
    }

    /**
     * PC3b: regenerate or revoke a share link. Regenerating invalidates the old
     * token, which is the point — a leaked link must be revocable.
     */
    @PatchMapping("/{id}/share")
    @PreAuthorize(CAN_UPLOAD)
    public ResponseEntity<?> updateShare(@PathVariable Long id,
            @RequestParam(value = "enabled", defaultValue = "true") boolean enabled,
            Principal principal) {
        UserEntity actor = documentScope.current(principal);
        Optional<Document> visible = documentScope.findVisible(actor, id);
        if (visible.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Document doc = visible.get();
        doc.setShareToken(enabled ? java.util.UUID.randomUUID().toString().replace("-", "") : null);
        Document saved = documentRepository.save(doc);
        return ResponseEntity.ok(Map.of("id", saved.getId(), "shared", saved.getShareToken() != null,
                "shareToken", saved.getShareToken() == null ? "" : saved.getShareToken()));
    }

    /**
     * PC3b: public, token-addressed access. No authentication by design — the
     * method-level permitAll overrides the class-level isAuthenticated().
     */
    @GetMapping("/share/{token}")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Resource> sharedFile(@PathVariable String token) throws IOException {
        Optional<Document> found = documentRepository.findByShareToken(token);
        if (found.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Document doc = found.get();

        Path filePath;
        try {
            filePath = fileStorageService.loadFile(doc.getFileName());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
        if (!Files.isReadable(filePath)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(filePath.toUri());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + sanitizeForHeader(doc.getOriginalFileName()) + "\"")
                .body(resource);
    }

    /** Strip CR/LF and quotes so a filename cannot inject extra headers. */
    private static String sanitizeForHeader(String name) {
        if (name == null || name.isBlank()) {
            return "download";
        }
        return name.replaceAll("[\\r\\n\"]", "_");
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(CAN_UPLOAD)
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("category") String category,
            @RequestParam(value = "audience", required = false) String audience,
            @RequestParam(value = "version", required = false) String version,
            @RequestParam(value = "description", required = false) String description,
            Principal principal) {
        UserEntity actor = documentScope.current(principal);
        try {
            String storedFileName = fileStorageService.storeFile(file);

            String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/files/view/")
                    .path(storedFileName)
                    .toUriString();

            Document document = new Document();
            document.setFileName(storedFileName);
            document.setOriginalFileName(file.getOriginalFilename());
            document.setContentType(file.getContentType());
            document.setFileSize(file.getSize());
            document.setCategory(category);
            document.setUploadedBy(actor.getUsername());
            document.setUploadDate(LocalDateTime.now());
            document.setFilePath(fileDownloadUri);
            document.setFileData(file.getBytes());
            document.setAudience(blankToNull(audience));
            document.setVersion(blankToNull(version));
            document.setDescription(blankToNull(description));
            // A document is scoped to the uploader's own institution so it is
            // immediately visible to that institution and to nobody else.
            document.setUniversityId(actor.getUniversityId());
            document.setCompanyId(actor.getCompanyId());

            Document saved = documentRepository.save(document);
            return ResponseEntity.status(HttpStatus.CREATED).body(toSummary(saved));
        } catch (IOException ex) {
            Map<String, String> errorBody = new java.util.HashMap<>();
            errorBody.put("error", "Could not upload file: " + ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorBody);
        }
    }

    /**
     * PC3a (L7): deletes are still ADMIN/SUPERVISOR-only, and now additionally
     * refuse rows outside the caller's institution. An out-of-scope id returns 404
     * rather than 403 so ids cannot be probed across tenants.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_UPLOAD)
    public ResponseEntity<Void> deleteFile(@PathVariable Long id, Principal principal) {
        UserEntity actor = documentScope.current(principal);
        Optional<Document> visible = documentScope.findVisible(actor, id);
        if (visible.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        fileStorageService.deleteFile(visible.get().getFileName());
        documentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private static Map<String, Object> toSummary(Document doc) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", doc.getId());
        map.put("fileName", doc.getFileName());
        map.put("originalFileName", doc.getOriginalFileName());
        map.put("contentType", doc.getContentType());
        map.put("fileSize", doc.getFileSize());
        map.put("category", doc.getCategory());
        map.put("uploadedBy", doc.getUploadedBy());
        map.put("uploadDate", doc.getUploadDate() != null ? doc.getUploadDate().toString() : null);
        map.put("filePath", doc.getFilePath());
        map.put("universityId", doc.getUniversityId());
        map.put("companyId", doc.getCompanyId());
        map.put("audience", doc.getAudience());
        map.put("version", doc.getVersion());
        map.put("description", doc.getDescription());
        map.put("downloadCount", doc.getDownloadCount());
        map.put("shared", doc.getShareToken() != null);
        return map;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
