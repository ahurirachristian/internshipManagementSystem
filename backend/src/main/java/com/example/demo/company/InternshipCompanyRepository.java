package com.example.demo.company;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InternshipCompanyRepository extends JpaRepository<InternshipCompany, Long> {
}
