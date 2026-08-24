package com.example.demo.academic;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AcademicUnitRepository extends JpaRepository<AcademicUnit, Integer> {
    List<AcademicUnit> findByUniversityId(Integer universityId);

    List<AcademicUnit> findByParentUnitId(Integer parentUnitId);

    List<AcademicUnit> findByUniversityIdAndParentUnitIdIsNull(Integer universityId);

    List<AcademicUnit> findByUnitType(AcademicUnit.UnitType unitType);

    Optional<AcademicUnit> findByUnitNameIgnoreCase(String unitName);

    List<AcademicUnit> findByUnitNameContainingIgnoreCase(String keyword);
}
