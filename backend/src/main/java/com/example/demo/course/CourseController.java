package com.example.demo.course;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

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

import com.example.demo.auth.AuthorizationScopeService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

import java.security.Principal;

/**
 * P8 (R8): course-unit CRUD. ADMIN manages any university; a SUPERVISOR is
 * always scoped to their own university (L7) — cross-university targets are
 * 404 so tenants cannot be probed.
 */
@RestController
@RequestMapping("/api/courses")
@PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
public class CourseController {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final AuthorizationScopeService scopeService;

    public CourseController(CourseRepository courseRepository, UserRepository userRepository,
            AuthorizationScopeService scopeService) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.scopeService = scopeService;
    }

    @GetMapping
    public List<Course> list(@RequestParam(required = false) Long universityId,
            @RequestParam(required = false) Long programmeId, Principal principal) {
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        if (scopeService.isAdminLike(actor)) {
            if (programmeId != null) {
                return universityId != null
                        ? courseRepository.findByUniversityIdAndProgrammeId(universityId, programmeId)
                        : courseRepository.findAll().stream()
                                .filter(c -> programmeId.equals(c.getProgrammeId()))
                                .toList();
            }
            return universityId != null
                    ? courseRepository.findByUniversityId(universityId)
                    : courseRepository.findAll();
        }
        if (actor.getUniversityId() == null) {
            throw new AccessDeniedException("Your account is not linked to a university.");
        }
        // L7: a supervisor only ever sees their own university's units.
        if (programmeId != null) {
            return courseRepository.findByUniversityIdAndProgrammeId(actor.getUniversityId(), programmeId);
        }
        return courseRepository.findByUniversityId(actor.getUniversityId());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Principal principal) {
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        Long universityId = scopeService.isAdminLike(actor)
                ? longValue(body.get("universityId"))
                : actor.getUniversityId();
        if (universityId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "A university is required."));
        }
        Long programmeId = longValue(body.get("programmeId"));
        String code = text(body.get("courseCode"));
        String name = text(body.get("courseName"));
        if (programmeId == null || code.isEmpty() || name.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Programme, course code and course name are required."));
        }
        if (courseRepository.existsByUniversityIdAndCourseCodeIgnoreCase(universityId, code)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "A course with that code already exists in your university."));
        }
        Course course = new Course(universityId, programmeId, intValue(body.get("yearOfStudy")), code, name);
        return ResponseEntity.status(HttpStatus.CREATED).body(courseRepository.save(course));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body,
            Principal principal) {
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        Course course = requireScoped(actor, id);
        String code = text(body.get("courseCode"));
        String name = text(body.get("courseName"));
        if (code.isEmpty() || name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Course code and name are required."));
        }
        if (!code.equalsIgnoreCase(course.getCourseCode())
                && courseRepository.existsByUniversityIdAndCourseCodeIgnoreCase(course.getUniversityId(), code)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "A course with that code already exists in your university."));
        }
        course.setCourseCode(code);
        course.setCourseName(name);
        course.setProgrammeId(longValue(body.get("programmeId")) != null
                ? longValue(body.get("programmeId"))
                : course.getProgrammeId());
        course.setYearOfStudy(intValue(body.get("yearOfStudy")));
        return ResponseEntity.ok(courseRepository.save(course));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        requireScoped(actor, id);
        courseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /** L7: resolve the course, 404 across universities, 403 for admins' rows to supervisors. */
    private Course requireScoped(UserEntity actor, Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Course not found."));
        if (scopeService.isAdminLike(actor)) {
            return course;
        }
        if (actor.getUniversityId() == null || !actor.getUniversityId().equals(course.getUniversityId())) {
            throw new NoSuchElementException("Course not found.");
        }
        return course;
    }

    private String text(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private Long longValue(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.toString().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Integer intValue(Object value) {
        Long parsed = longValue(value);
        return parsed == null ? null : parsed.intValue();
    }
}
