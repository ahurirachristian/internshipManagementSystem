package com.example.demo.country;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CountryRepository extends JpaRepository<Country, Long> {
    Optional<Country> findByNameIgnoreCase(String name);

    Optional<Country> findByCodeIgnoreCase(String code);

    List<Country> findByNameStartingWithIgnoreCase(String prefix);

    List<Country> findByNameContainingIgnoreCase(String keyword);
}