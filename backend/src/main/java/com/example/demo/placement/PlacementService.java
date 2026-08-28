package com.example.demo.placement;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PlacementService {

    private final PlacementRepository placementRepository;

    public PlacementService(PlacementRepository placementRepository) {
        this.placementRepository = placementRepository;
    }

    public List<Placement> findAll() {
        return placementRepository.findAll();
    }

    public Page<Placement> findAll(Pageable pageable) {
        return placementRepository.findAll(pageable);
    }

    public Placement findById(Long id) {
        return placementRepository.findById(id).orElse(null);
    }

    public Placement create(Placement placement) {
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
