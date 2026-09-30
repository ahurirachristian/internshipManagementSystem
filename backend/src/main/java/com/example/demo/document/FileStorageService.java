package com.example.demo.document;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private final Path fileStorageLocation;

    public FileStorageService(
            @Value("${file.upload-dir:./uploads}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (IOException ex) {
            throw new RuntimeException("Could not create the upload directory.", ex);
        }
    }

    public Path getStorageLocation() {
        return this.fileStorageLocation;
    }

    public String storeFile(MultipartFile file) {
        String originalFileName = file.getOriginalFilename();
        String extension = "";
        if (originalFileName != null && originalFileName.lastIndexOf('.') != -1) {
            extension = originalFileName.substring(originalFileName.lastIndexOf('.'));
        }
        String storedFileName = UUID.randomUUID().toString() + extension;
        Path targetLocation = resolveInsideStorage(storedFileName);
        try {
            Files.copy(file.getInputStream(), targetLocation);
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + storedFileName + ". Please try again!", ex);
        }
        return storedFileName;
    }

    /**
     * L7: a caller-supplied name must never escape the storage root. Resolving
     * "../../etc/passwd" against the root yields a path outside it, so the
     * normalized result is rejected unless it is still contained by the root.
     */
    public Path loadFile(String fileName) {
        return resolveInsideStorage(fileName);
    }

    public boolean deleteFile(String fileName) {
        try {
            Path file = loadFile(fileName);
            return Files.deleteIfExists(file);
        } catch (IOException | IllegalArgumentException ex) {
            return false;
        }
    }

    private Path resolveInsideStorage(String fileName) {
        if (fileName == null || fileName.isBlank() || fileName.contains("\0")) {
            throw new IllegalArgumentException("Invalid file name.");
        }
        Path resolved = this.fileStorageLocation.resolve(fileName).normalize();
        if (!resolved.startsWith(this.fileStorageLocation)) {
            throw new IllegalArgumentException("Invalid file name.");
        }
        return resolved;
    }
}
