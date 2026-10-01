package com.example.demo.auth;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUsername(String username);

    Optional<UserEntity> findByEmail(String email);

    Optional<UserEntity> findByProviderId(String providerId);

    Optional<UserEntity> findByPasswordResetToken(String passwordResetToken);

    List<UserEntity> findByRole(Role role);

    /** PC7.1: the legacy field-supervisor shape — SUPERVISOR wearing only a company id. */
    List<UserEntity> findByRoleAndCompanyIdIsNotNullAndUniversityIdIsNull(Role role);

    /** PC7: field supervisors live in their own role but still feed assignment selects. */
    List<UserEntity> findByRoleIn(java.util.Collection<Role> roles);

    List<UserEntity> findBySuperAdminTrue();

    List<UserEntity> findByUniversityId(Long universityId);

    List<UserEntity> findByUniversityIdAndRole(Long universityId, Role role);

    List<UserEntity> findByCompanyId(Long companyId);
}
