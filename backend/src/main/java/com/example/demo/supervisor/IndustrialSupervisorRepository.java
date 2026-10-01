package com.example.demo.supervisor;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IndustrialSupervisorRepository extends JpaRepository<IndustrialSupervisor, Long> {

    /** PC4: the profile row behind a field-supervisor account. */
    Optional<IndustrialSupervisor> findByUserId(Long userId);
}
