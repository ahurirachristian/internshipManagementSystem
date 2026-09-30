package com.example.demo.document;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByCategory(String category);

    Optional<Document> findByShareToken(String shareToken);

    Optional<Document> findByFileNameOrderByIdAsc(String fileName);

    List<Document> findByUniversityId(Long universityId);

    List<Document> findByCompanyId(Long companyId);

    long countByUniversityId(Long universityId);

    long countByCompanyId(Long companyId);

    /**
     * Every document the given actor is allowed to see: their own institution's
     * rows, plus their own uploads, plus unscoped rows for an ADMIN. Written as
     * one query so the filter cannot drift from the authorization check.
     */
    @Query("SELECT d FROM Document d WHERE "
            + "(:admin = true) OR "
            + "(:universityId IS NOT NULL AND d.universityId = :universityId) OR "
            + "(:companyId IS NOT NULL AND d.companyId = :companyId) OR "
            + "(d.uploadedBy = :username)")
    List<Document> findVisibleTo(@Param("admin") boolean admin,
            @Param("universityId") Long universityId,
            @Param("companyId") Long companyId,
            @Param("username") String username);

    @Query("SELECT d FROM Document d WHERE d.id = :id AND ("
            + "(:admin = true) OR "
            + "(:universityId IS NOT NULL AND d.universityId = :universityId) OR "
            + "(:companyId IS NOT NULL AND d.companyId = :companyId) OR "
            + "(d.uploadedBy = :username))")
    Optional<Document> findVisibleById(@Param("id") Long id,
            @Param("admin") boolean admin,
            @Param("universityId") Long universityId,
            @Param("companyId") Long companyId,
            @Param("username") String username);

    /**
     * Same predicate as {@link #findVisibleById}, but for the filename-keyed
     * preview endpoint. Kept as a query so preview stays O(1) instead of
     * loading every visible row to test one name.
     */
    @Query("SELECT d FROM Document d WHERE d.fileName = :fileName AND ("
            + "(:admin = true) OR "
            + "(:universityId IS NOT NULL AND d.universityId = :universityId) OR "
            + "(:companyId IS NOT NULL AND d.companyId = :companyId) OR "
            + "(d.uploadedBy = :username))")
    Optional<Document> findVisibleByFileName(@Param("fileName") String fileName,
            @Param("admin") boolean admin,
            @Param("universityId") Long universityId,
            @Param("companyId") Long companyId,
            @Param("username") String username);

    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM Document d WHERE d.universityId = :universityId")
    long totalBytesForUniversity(@Param("universityId") Long universityId);

    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM Document d WHERE d.companyId = :companyId")
    long totalBytesForCompany(@Param("companyId") Long companyId);
}
