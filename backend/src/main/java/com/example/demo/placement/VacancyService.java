package com.example.demo.placement;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class VacancyService {

    private final VacancyRepository vacancyRepository;

    public VacancyService(VacancyRepository vacancyRepository) {
        this.vacancyRepository = vacancyRepository;
    }

    public List<Vacancy> findAll() {
        return vacancyRepository.findAll();
    }

    public Optional<Vacancy> findById(Long id) {
        return vacancyRepository.findById(id);
    }

    public List<Vacancy> findByCompanyId(Long companyId) {
        return vacancyRepository.findByCompanyId(companyId);
    }

    public List<Vacancy> findByStatus(String status) {
        return vacancyRepository.findByStatus(status);
    }

    public List<Vacancy> findOpenByCompanyId(Long companyId) {
        return vacancyRepository.findByCompanyIdAndStatus(companyId, "OPEN");
    }

    public Vacancy save(Vacancy vacancy) {
        if (vacancy.getCreatedAt() == null) {
            vacancy.setCreatedAt(LocalDate.now());
        }
        return vacancyRepository.save(vacancy);
    }

    public void deleteById(Long id) {
        vacancyRepository.deleteById(id);
    }
}
