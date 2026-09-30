package com.example.demo.course;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {

    List<Course> findByUniversityId(Long universityId);

    List<Course> findByUniversityIdAndProgrammeId(Long universityId, Long programmeId);

    List<Course> findByUniversityIdAndProgrammeIdAndYearOfStudy(Long universityId, Long programmeId,
            Integer yearOfStudy);

    boolean existsByUniversityIdAndCourseCodeIgnoreCase(Long universityId, String courseCode);
}
