package com.example.demo.university;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UniversityRepository extends JpaRepository<University, Long> {
    List<University> findByNameStartingWithIgnoreCase(String prefix);
}
