package com.example.demo.company;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    List<Company> findByNameStartingWithIgnoreCase(String prefix);
    List<Company> findByLocationStartingWithIgnoreCase(String location);
    List<Company> findByNameContainingIgnoreCase(String keyword);
}