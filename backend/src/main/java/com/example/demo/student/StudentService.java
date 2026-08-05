package com.example.demo.student;

import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class StudentService {

    private final StudentProfileRepository studentProfileRepository;

    public StudentService(StudentProfileRepository studentProfileRepository) {
        this.studentProfileRepository = studentProfileRepository;
    }

    public Optional<StudentProfile> findByUsername(String username) {
        return studentProfileRepository.findByUsername(username);
    }

    public StudentProfile save(StudentProfile profile) {
        return studentProfileRepository.save(profile);
    }
}
