package com.example.demo.supervisor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UniversitySupervisorRepository extends JpaRepository<UniversitySupervisor, Long> {

    Optional<UniversitySupervisor> findByUserId(Long userId);

    List<UniversitySupervisor> findByUniversityId(Long universityId);
}
