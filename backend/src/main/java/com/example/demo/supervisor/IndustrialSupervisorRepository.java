package com.example.demo.supervisor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IndustrialSupervisorRepository extends JpaRepository<IndustrialSupervisor, Long> {
}
