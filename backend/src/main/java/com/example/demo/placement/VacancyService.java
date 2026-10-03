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

    /**
     * Filters by status, accepting the legacy {@code "OPEN"}.
     *
     * <p>An unrecognised value is now a 400 rather than an empty list. Previously the
     * query matched a column that held nothing and returned {@code []}, which reads
     * exactly like "there are no adverts in that state" — the one answer a caller
     * cannot distinguish from a typo in their own request.
     */
    public List<Vacancy> findByStatus(String status) {
        return vacancyRepository.findByStatus(Vacancy.Status.parse(status));
    }

    /**
     * {@link Vacancy.Status#PUBLISHED}, not the literal {@code "OPEN"}.
     *
     * <p>This is the change the enum forces into the open. The column stores
     * {@code PUBLISHED} — the S1.6 migration rewrote the legacy {@code "OPEN"} rows —
     * so a query still asking for {@code "OPEN"} would silently match nothing and
     * every caller would see an empty dashboard rather than an error.
     */
    public List<Vacancy> findOpenByCompanyId(Long companyId) {
        return vacancyRepository.findByCompanyIdAndStatus(companyId, Vacancy.Status.PUBLISHED);
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
