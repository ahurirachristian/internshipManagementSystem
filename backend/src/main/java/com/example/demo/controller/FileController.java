package com.example.demo.controller;

import com.example.demo.document.Document;
import com.example.demo.document.DocumentRepository;
import com.example.demo.document.FileStorageService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
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

    private final DocumentRepository documentRepository;
    private final FileStorageService fileStorageService;

    public FileController(DocumentRepository documentRepository, FileStorageService fileStorageService) {
        this.documentRepository = documentRepository;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping
    public List<Map<String, Object>> getAllFiles() {
        return documentRepository.findAll().stream()
                .map(doc -> {
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
                    return map;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/view/{fileName}")
    public ResponseEntity<Resource> viewFile(@PathVariable String fileName) throws IOException {
        Path filePath = fileStorageService.loadFile(fileName);
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

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("category") String category) {
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
            document.setUploadedBy("current-user");
            document.setUploadDate(LocalDateTime.now());
            document.setFilePath(fileDownloadUri);
            document.setFileData(file.getBytes());

            Document saved = documentRepository.save(document);
            Map<String, Object> body = new java.util.HashMap<>();
            body.put("id", saved.getId());
            body.put("fileName", saved.getFileName());
            body.put("originalFileName", saved.getOriginalFileName());
            body.put("contentType", saved.getContentType());
            body.put("fileSize", saved.getFileSize());
            body.put("category", saved.getCategory());
            body.put("uploadedBy", saved.getUploadedBy());
            body.put("uploadDate", saved.getUploadDate() != null ? saved.getUploadDate().toString() : null);
            body.put("filePath", saved.getFilePath());
            return ResponseEntity.status(HttpStatus.CREATED).body(body);
        } catch (IOException ex) {
            Map<String, String> errorBody = new java.util.HashMap<>();
            errorBody.put("error", "Could not upload file: " + ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorBody);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long id) {
        Document document = documentRepository.findById(id).orElse(null);
        if (document == null) {
            return ResponseEntity.notFound().build();
        }
        fileStorageService.deleteFile(document.getFileName());
        documentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
