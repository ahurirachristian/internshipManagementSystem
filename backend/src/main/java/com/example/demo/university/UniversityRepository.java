package com.example.demo.university;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UniversityRepository extends JpaRepository<University, Integer> {
    List<University> findByFullNameContainingIgnoreCase(String keyword);

    List<University> findByShortFormStartingWithIgnoreCase(String prefix);

    Optional<University> findByShortFormIgnoreCase(String shortForm);

    Optional<University> findByFullNameIgnoreCase(String fullName);
}
