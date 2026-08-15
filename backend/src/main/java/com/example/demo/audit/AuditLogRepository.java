package com.example.demo.audit;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByActionAndTargetEntity(String action, String targetEntity);

    List<AuditLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT a FROM AuditLog a WHERE (:action IS NULL OR a.action = :action) AND (:target IS NULL OR a.targetEntity = :target) AND a.timestamp BETWEEN :start AND :end")
    List<AuditLog> search(@Param("action") String action, @Param("target") String target, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
