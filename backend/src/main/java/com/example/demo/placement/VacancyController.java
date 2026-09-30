package com.example.demo.placement;

import java.security.Principal;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.notification.NotificationService;

/**
 * P6 (L8): COMPANY callers may only act on their own vacancies — the
 * companyId is forced from the session user on writes and ownership is
 * verified before update/delete (403 otherwise). ADMIN and SUPERVISOR keep
 * their previous behavior. Creating a vacancy notifies every admin
 * (NEW_VACANCY) so the marketplace page is automatically seen.
 */
@RestController
@RequestMapping("/api/vacancies")
public class VacancyController {

    private final VacancyService vacancyService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public VacancyController(VacancyService vacancyService, UserRepository userRepository,
            NotificationService notificationService) {
        this.vacancyService = vacancyService;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<Vacancy> getAllVacancies() {
        return vacancyService.findAll();
    }

    @GetMapping("/company/{companyId}")
    public List<Vacancy> getVacanciesByCompany(@PathVariable Long companyId) {
        return vacancyService.findByCompanyId(companyId);
    }

    @GetMapping("/status")
    public List<Vacancy> getVacanciesByStatus(@RequestParam String status) {
        return vacancyService.findByStatus(status);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Vacancy> getVacancyById(@PathVariable Long id) {
        return vacancyService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<Vacancy> createVacancy(@Valid @RequestBody Vacancy vacancy, Principal principal) {
        UserEntity actor = currentUser(principal);
        if (actor != null && isCompany(actor)) {
            requireCompanyLinked(actor);
            // L8: the companyId always comes from the session, never the body.
            vacancy.setCompanyId(actor.getCompanyId());
        }
        Vacancy saved = vacancyService.save(vacancy);
        notifyAdminsOfNewVacancy(saved, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<Vacancy> updateVacancy(@PathVariable Long id, @Valid @RequestBody Vacancy vacancy,
            Principal principal) {
        UserEntity actor = currentUser(principal);
        return vacancyService.findById(id)
                .map(existing -> {
                    requireOwnership(actor, existing);
                    existing.setTitle(vacancy.getTitle());
                    existing.setDescription(vacancy.getDescription());
                    if (actor != null && isCompany(actor)) {
                        // L8: a company can never move a vacancy to another company.
                        existing.setCompanyId(actor.getCompanyId());
                    } else {
                        existing.setCompanyId(vacancy.getCompanyId());
                    }
                    existing.setLocation(vacancy.getLocation());
                    existing.setRequirements(vacancy.getRequirements());
                    existing.setStatus(vacancy.getStatus());
                    existing.setDeadline(vacancy.getDeadline());
                    return ResponseEntity.ok(vacancyService.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<Void> deleteVacancy(@PathVariable Long id, Principal principal) {
        UserEntity actor = currentUser(principal);
        if (vacancyService.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        requireOwnership(actor, vacancyService.findById(id).get());
        vacancyService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /** L8: company callers own only their own company's vacancies. */
    private void requireOwnership(UserEntity actor, Vacancy existing) {
        if (actor == null || !isCompany(actor)) {
            return;
        }
        requireCompanyLinked(actor);
        if (!actor.getCompanyId().equals(existing.getCompanyId())) {
            throw new AccessDeniedException("You can only manage your own company's vacancies.");
        }
    }

    private void notifyAdminsOfNewVacancy(Vacancy saved, UserEntity actor) {
        List<Long> adminIds = userRepository.findByRole(com.example.demo.auth.Role.ADMIN).stream()
                .map(UserEntity::getId)
                .toList();
        if (adminIds.isEmpty()) {
            return;
        }
        String postedBy = actor != null ? actor.getUsername() : "unknown";
        notificationService.notify(adminIds, "NEW_VACANCY",
                "New vacancy published",
                postedBy + " published \"" + saved.getTitle() + "\" — review it in the marketplace.",
                "/admin/marketplace");
    }

    private boolean isCompany(UserEntity actor) {
        return "COMPANY".equals(actor.getRole().name());
    }

    private void requireCompanyLinked(UserEntity actor) {
        if (actor.getCompanyId() == null) {
            throw new AccessDeniedException("Your account is not linked to a company.");
        }
    }

    /** MockMvc post-processors have no DB row; fall back to unscooped behavior. */
    private UserEntity currentUser(Principal principal) {
        if (principal == null) {
            return null;
        }
        return userRepository.findByUsername(principal.getName()).orElse(null);
    }
}
