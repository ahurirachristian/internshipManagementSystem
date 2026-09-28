package com.example.demo.student;

<<<<<<< HEAD
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentSettingRepository extends JpaRepository<StudentSetting, Long> {
    Optional<StudentSetting> findByUsername(String username);
=======
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentSettingRepository extends JpaRepository<StudentSetting, Long> {
    StudentSetting findByStudentId(Long studentId);
>>>>>>> developer
}
