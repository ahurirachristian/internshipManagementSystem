package com.example.demo.school;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SchoolRepository extends JpaRepository<School, Integer> {
    List<School> findByUniversityId(Integer universityId);
    List<School> findByParentSchoolId(Integer parentSchoolId);
}
