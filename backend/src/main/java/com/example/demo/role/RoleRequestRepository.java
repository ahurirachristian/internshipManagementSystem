package com.example.demo.role;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoleRequestRepository extends JpaRepository<RoleRequest, Long> {

    List<RoleRequest> findByUserIdOrderByRequestedAtDesc(Long userId);

    List<RoleRequest> findByStatusOrderByRequestedAtAsc(String status);

    boolean existsByUserIdAndRequestedRoleAndStatus(Long userId, String requestedRole, String status);

    /** L18: row lock so two reviewers cannot approve the same request twice. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RoleRequest r where r.id = :id")
    Optional<RoleRequest> findByIdForUpdate(@Param("id") Long id);
}
