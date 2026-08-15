package com.example.demo.university;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UniversityRepository extends JpaRepository<University, Long> {
    List<University> findByNameStartingWithIgnoreCase(String prefix);

    Optional<University> findByNameIgnoreCase(String name);
}
