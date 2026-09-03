package com.example.demo.student;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentSettingRepository extends JpaRepository<StudentSetting, Long> {
    Optional<StudentSetting> findByUsername(String username);
}
