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

    List<UserEntity> findBySuperAdminTrue();

    List<UserEntity> findByUniversityId(Long universityId);

    List<UserEntity> findByUniversityIdAndRole(Long universityId, Role role);
}
