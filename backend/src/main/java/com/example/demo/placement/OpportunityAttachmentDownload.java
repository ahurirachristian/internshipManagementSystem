package com.example.demo.placement;

import org.springframework.core.io.Resource;

/**
 * S6.7 (opportunity plan §6.6): what {@code GET /{attachmentId}/download}
 * streams — the bytes plus the name the download is saved under.
 *
 * <p>The name is {@code original_file_name}, the one the uploader's browser
 * supplied; the on-disk {@code file_name} (the storage UUID) takes no part in
 * the response, so a client never sees the name it would have to guess to
 * reach the storage root [H14].
 */
public record OpportunityAttachmentDownload(String originalFileName, String contentType,
        Resource resource) {
}
