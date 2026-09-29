package com.example.demo.student;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentSettingRepository extends JpaRepository<StudentSetting, Long> {
    StudentSetting findByStudentId(Long studentId);
}
