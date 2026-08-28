package com.example.demo.placement;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.student.StudentRepository;

@Service
@Transactional
public class PlacementService {

    private final PlacementRepository placementRepository;
    private final StudentRepository studentRepository;

    public PlacementService(PlacementRepository placementRepository, StudentRepository studentRepository) {
        this.placementRepository = placementRepository;
        this.studentRepository = studentRepository;
    }

    public List<Placement> findAll() {
        return placementRepository.findAll();
    }

    public Placement findById(Long id) {
        return placementRepository.findById(id).orElse(null);
    }

    public Placement create(Placement placement) {
        if (placement.getUniversityId() == null && placement.getStudentId() != null) {
            studentRepository.findById(placement.getStudentId())
                    .ifPresent(s -> placement.setUniversityId(s.getUniversityId()));
        }
        return placementRepository.save(placement);
    }

    public Placement update(Long id, Placement placement) {
        Placement existing = placementRepository.findById(id).orElse(null);
        if (existing == null) return null;
        existing.setStudentId(placement.getStudentId());
        existing.setCompanyId(placement.getCompanyId());
        existing.setUniversitySupervisor(placement.getUniversitySupervisor());
        existing.setCompanySupervisor(placement.getCompanySupervisor());
        existing.setStatus(placement.getStatus());
        return placementRepository.save(existing);
    }

    public void delete(Long id) {
        placementRepository.deleteById(id);
    }
}
