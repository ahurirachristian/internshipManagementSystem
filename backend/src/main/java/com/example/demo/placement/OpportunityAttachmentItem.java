package com.example.demo.placement;

import java.time.LocalDateTime;

/**
 * S6.7 (opportunity plan §6.6): the metadata shape every attachment read
 * returns — {@code id}, {@code originalFileName}, {@code contentType},
 * {@code fileSize}, {@code uploadedAt} and nothing else.
 *
 * <p>Deliberately a record rather than the entity: {@link OpportunityAttachment}
 * carries {@code fileName} (the on-disk UUID) and {@code storagePath}, and
 * serialising the entity would hand both to any client that could then guess at
 * paths [H14]. The five fields below are the entire surface, so the omission is
 * structural — there is no getter here to leak through.
 */
public record OpportunityAttachmentItem(Long id, String originalFileName, String contentType,
        Long fileSize, LocalDateTime uploadedAt) {

    public static OpportunityAttachmentItem from(OpportunityAttachment row) {
        return new OpportunityAttachmentItem(row.getId(), row.getOriginalFileName(),
                row.getContentType(), row.getFileSize(), row.getUploadedAt());
    }
}
