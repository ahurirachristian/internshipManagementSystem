package com.example.demo.controller;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.academic.AcademicUnit;
import com.example.demo.academic.AcademicUnitRepository;

@RestController
@RequestMapping("/api/academic-units")
@PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
public class AcademicUnitController {

    private final AcademicUnitRepository academicUnitRepository;

    public AcademicUnitController(AcademicUnitRepository academicUnitRepository) {
        this.academicUnitRepository = academicUnitRepository;
    }

    @GetMapping
    public ResponseEntity<List<AcademicUnit>> getUnits(@RequestParam Integer universityId) {
        return ResponseEntity.ok(academicUnitRepository.findByUniversityId(universityId));
    }
}
