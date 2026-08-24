package com.example.demo.controller;

import java.security.Principal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
import com.example.demo.academic.AcademicUnit;
import com.example.demo.academic.AcademicUnitRepository;
import com.example.demo.academic.Course;
import com.example.demo.academic.CourseRepository;
import com.example.demo.academic.Staff;
import com.example.demo.academic.StaffRepository;
import com.example.demo.academic.UnitCourse;
import com.example.demo.academic.UnitCourseRepository;
import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;

@RestController
@RequestMapping("/api/university")
@PreAuthorize("hasAuthority('SUPERVISOR')")
public class UniversityAcademicController {

    private static final List<String> COURSE_LEVELS = List.of(
            "Certificate", "Diploma", "Bachelors", "Masters", "PhD", "PGD", "Short Course");

    private final AcademicUnitRepository academicUnitRepository;
    private final CourseRepository courseRepository;
    private final StaffRepository staffRepository;
    private final UnitCourseRepository unitCourseRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public UniversityAcademicController(AcademicUnitRepository academicUnitRepository,
            CourseRepository courseRepository,
            StaffRepository staffRepository,
            UnitCourseRepository unitCourseRepository,
            StudentProfileRepository studentProfileRepository,
            UserRepository userRepository,
            AuditLogService auditLogService) {
        this.academicUnitRepository = academicUnitRepository;
        this.courseRepository = courseRepository;
        this.staffRepository = staffRepository;
        this.unitCourseRepository = unitCourseRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    // =================================================================
    // Academic Units
    // =================================================================

    @GetMapping("/academic-units")
    public List<AcademicUnit> getAcademicUnits(Principal principal) {
        return academicUnitRepository.findByUniversityId(requireOwnUniversity(principal));
    }

    @PostMapping("/academic-units")
    public ResponseEntity<?> createAcademicUnit(@RequestBody AcademicUnit request, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        try {
            AcademicUnit unit = new AcademicUnit();
            applyUnitFields(unit, request, universityId);
            AcademicUnit saved = academicUnitRepository.save(unit);
            audit(principal, "CREATE", "AcademicUnit", "Created unit: " + saved.getUnitName());
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/academic-units/{id}")
    public ResponseEntity<?> updateAcademicUnit(@PathVariable Integer id, @RequestBody AcademicUnit request,
            Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = academicUnitRepository.findById(id)
                .filter(unit -> unit.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            AcademicUnit unit = existing.get();
            applyUnitFields(unit, request, universityId);
            AcademicUnit saved = academicUnitRepository.save(unit);
            audit(principal, "UPDATE", "AcademicUnit", "Updated unit: " + saved.getUnitName());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/academic-units/{id}")
    public ResponseEntity<?> deleteAcademicUnit(@PathVariable Integer id, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = academicUnitRepository.findById(id)
                .filter(unit -> unit.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        AcademicUnit unit = existing.get();

        List<AcademicUnit> children = academicUnitRepository.findByParentUnitId(id);
        children.forEach(child -> child.setParentUnitId(null));
        academicUnitRepository.saveAll(children);

        List<Staff> staff = staffRepository.findByUnitId(id);
        staff.forEach(member -> member.setUnitId(null));
        staffRepository.saveAll(staff);

        List<StudentProfile> students = studentProfileRepository.findByUnitId(id);
        students.forEach(student -> student.setUnitId(null));
        studentProfileRepository.saveAll(students);

        unitCourseRepository.deleteAll(unitCourseRepository.findByUnitId(id));
        academicUnitRepository.delete(unit);
        audit(principal, "DELETE", "AcademicUnit",
                "Deleted unit: " + unit.getUnitName() + " (ID: " + id + ")");
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/academic-units/export/csv")
    public ResponseEntity<String> exportAcademicUnitsCsv(Principal principal) {
        String csv = academicUnitRepository.findByUniversityId(requireOwnUniversity(principal)).stream()
                .map(u -> String.join(",",
                        escape(u.getUnitId()),
                        escape(u.getParentUnitId()),
                        escape(u.getUnitType()),
                        escape(u.getUnitName()),
                        escape(u.getShortForm())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "UnitID,ParentUnitID,UnitType,UnitName,ShortForm\n" + csv;
        return csvResponse(body, "academic-units.csv");
    }

    private void applyUnitFields(AcademicUnit unit, AcademicUnit request, Integer universityId) {
        if (request.getUnitName() == null || request.getUnitName().isBlank()) {
            throw new IllegalArgumentException("Unit name is required.");
        }
        if (request.getUnitType() == null) {
            throw new IllegalArgumentException("Unit type is required.");
        }
        if (request.getParentUnitId() != null) {
            if (request.getParentUnitId().equals(unit.getUnitId())) {
                throw new IllegalArgumentException("A unit cannot be its own parent.");
            }
            AcademicUnit parent = academicUnitRepository.findById(request.getParentUnitId())
                    .filter(p -> p.getUniversityId().equals(universityId))
                    .orElseThrow(() -> new IllegalArgumentException("Parent unit not found in your university."));
            ensureNoCycle(unit, request.getParentUnitId());
        }
        unit.setUniversityId(universityId);
        unit.setParentUnitId(request.getParentUnitId());
        unit.setUnitType(request.getUnitType());
        unit.setUnitName(request.getUnitName().trim());
        unit.setShortForm(trimToNull(request.getShortForm()));
    }

    private void ensureNoCycle(AcademicUnit unit, Integer parentId) {
        Set<Integer> visited = new HashSet<>();
        visited.add(unit.getUnitId());
        Integer cursor = parentId;
        while (cursor != null) {
            if (!visited.add(cursor)) {
                throw new IllegalArgumentException("Circular parent relationship detected.");
            }
            AcademicUnit node = academicUnitRepository.findById(cursor)
                    .orElseThrow(() -> new IllegalArgumentException("Parent unit not found."));
            cursor = node.getParentUnitId();
        }
    }

    // =================================================================
    // Courses
    // =================================================================

    @GetMapping("/courses")
    public List<Course> getCourses(@RequestParam(required = false) String level, Principal principal) {
        List<Course> courses = courseRepository.findByUniversityId(requireOwnUniversity(principal));
        if (level != null && !level.isBlank()) {
            return courses.stream().filter(course -> level.equals(course.getLevel())).toList();
        }
        return courses;
    }

    @PostMapping("/courses")
    public ResponseEntity<?> createCourse(@RequestBody Course request, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        try {
            validateCourseFields(request);
            Course course = new Course();
            applyCourseFields(course, request, universityId);
            Course saved = courseRepository.save(course);
            audit(principal, "CREATE", "Course", "Created course: " + saved.getCourseName());
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/courses/{id}")
    public ResponseEntity<?> updateCourse(@PathVariable Integer id, @RequestBody Course request,
            Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = courseRepository.findById(id)
                .filter(course -> course.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            validateCourseFields(request);
            Course course = existing.get();
            applyCourseFields(course, request, universityId);
            Course saved = courseRepository.save(course);
            audit(principal, "UPDATE", "Course", "Updated course: " + saved.getCourseName());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable Integer id, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = courseRepository.findById(id)
                .filter(course -> course.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Course course = existing.get();

        List<StudentProfile> attachedStudents = studentProfileRepository.findByCourseId(id);
        if (!attachedStudents.isEmpty()) {
            throw new IllegalArgumentException(
                    "Cannot delete this course: " + attachedStudents.size()
                            + " student profile(s) still reference it. Detach the students first.");
        }
        unitCourseRepository.deleteAll(unitCourseRepository.findByCourseId(id));
        courseRepository.delete(course);
        audit(principal, "DELETE", "Course",
                "Deleted course: " + course.getCourseName() + " (ID: " + id + ")");
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/courses/export/csv")
    public ResponseEntity<String> exportCoursesCsv(Principal principal) {
        String csv = courseRepository.findByUniversityId(requireOwnUniversity(principal)).stream()
                .map(c -> String.join(",",
                        escape(c.getCourseId()),
                        escape(c.getCourseName()),
                        escape(c.getDuration()),
                        escape(c.getLevel())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "CourseID,CourseName,Duration,Level\n" + csv;
        return csvResponse(body, "courses.csv");
    }

    private void validateCourseFields(Course request) {
        if (request.getCourseName() == null || request.getCourseName().isBlank()) {
            throw new IllegalArgumentException("Course name is required.");
        }
        if (request.getDuration() == null || request.getDuration().isBlank()) {
            throw new IllegalArgumentException("Duration is required.");
        }
        if (request.getLevel() != null && !COURSE_LEVELS.contains(request.getLevel())) {
            throw new IllegalArgumentException("Level must be one of: " + String.join(", ", COURSE_LEVELS) + ".");
        }
    }

    private void applyCourseFields(Course course, Course request, Integer universityId) {
        course.setUniversityId(universityId);
        course.setCourseName(request.getCourseName().trim());
        course.setDuration(request.getDuration().trim());
        course.setLevel(trimToNull(request.getLevel()));
    }

    // =================================================================
    // Staff
    // =================================================================

    @GetMapping("/staff")
    public List<Staff> getStaff(@RequestParam(required = false) String role, Principal principal) {
        List<Staff> members = staffRepository.findByUniversityId(requireOwnUniversity(principal));
        if (role != null && !role.isBlank()) {
            return members.stream().filter(member -> role.equals(member.getRole())).toList();
        }
        return members;
    }

    @PostMapping("/staff")
    public ResponseEntity<?> createStaff(@RequestBody Staff request, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        try {
            Staff staff = new Staff();
            applyStaffFields(staff, request, universityId);
            Staff saved = staffRepository.save(staff);
            audit(principal, "CREATE", "Staff", "Created staff: " + saved.getFullName());
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/staff/{id}")
    public ResponseEntity<?> updateStaff(@PathVariable Integer id, @RequestBody Staff request,
            Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = staffRepository.findById(id)
                .filter(member -> member.getUniversityId() != null
                        && member.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            Staff staff = existing.get();
            applyStaffFields(staff, request, universityId);
            Staff saved = staffRepository.save(staff);
            audit(principal, "UPDATE", "Staff", "Updated staff: " + saved.getFullName());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/staff/{id}")
    public ResponseEntity<?> deleteStaff(@PathVariable Integer id, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = staffRepository.findById(id)
                .filter(member -> member.getUniversityId() != null
                        && member.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Staff staff = existing.get();

        List<StudentProfile> academicRefs = studentProfileRepository.findByAcademicSupervisorId(id);
        academicRefs.forEach(student -> student.setAcademicSupervisorId(null));
        studentProfileRepository.saveAll(academicRefs);

        List<StudentProfile> fieldRefs = studentProfileRepository.findByFieldSupervisorId(id);
        fieldRefs.forEach(student -> student.setFieldSupervisorId(null));
        studentProfileRepository.saveAll(fieldRefs);

        staffRepository.delete(staff);
        audit(principal, "DELETE", "Staff",
                "Deleted staff: " + staff.getFullName() + " (ID: " + id + ")");
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/staff/export/csv")
    public ResponseEntity<String> exportStaffCsv(Principal principal) {
        String csv = staffRepository.findByUniversityId(requireOwnUniversity(principal)).stream()
                .map(s -> String.join(",",
                        escape(s.getStaffId()),
                        escape(s.getUnitId()),
                        escape(s.getFullName()),
                        escape(s.getContact()),
                        escape(s.getEmail()),
                        escape(s.getRole())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "StaffID,UnitID,FullName,Contact,Email,Role\n" + csv;
        return csvResponse(body, "staff.csv");
    }

    private void applyStaffFields(Staff staff, Staff request, Integer universityId) {
        if (request.getFullName() == null || request.getFullName().isBlank()) {
            throw new IllegalArgumentException("Full name is required.");
        }
        if (request.getUnitId() != null) {
            boolean unitOwned = academicUnitRepository.findById(request.getUnitId())
                    .map(unit -> unit.getUniversityId().equals(universityId))
                    .orElse(false);
            if (!unitOwned) {
                throw new IllegalArgumentException("Academic unit not found in your university.");
            }
        }
        staff.setUniversityId(universityId);
        staff.setUnitId(request.getUnitId());
        staff.setFullName(request.getFullName().trim());
        staff.setContact(trimToNull(request.getContact()));
        staff.setEmail(trimToNull(request.getEmail()));
        staff.setRole(trimToNull(request.getRole()));
    }

    // =================================================================
    // Unit Courses (junction)
    // =================================================================

    @GetMapping("/unit-courses")
    public List<UnitCourse> getUnitCourses(Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        Set<Integer> unitIds = new HashSet<>();
        academicUnitRepository.findByUniversityId(universityId).forEach(unit -> unitIds.add(unit.getUnitId()));
        Set<Integer> courseIds = new HashSet<>();
        courseRepository.findByUniversityId(universityId).forEach(course -> courseIds.add(course.getCourseId()));
        return unitCourseRepository.findAll().stream()
                .filter(link -> unitIds.contains(link.getUnitId()) || courseIds.contains(link.getCourseId()))
                .toList();
    }

    @PostMapping("/unit-courses")
    public ResponseEntity<?> createUnitCourse(@RequestBody UnitCourse request, Principal principal) {
        try {
            validateUnitCoursePair(request.getUnitId(), request.getCourseId(),
                    requireOwnUniversity(principal), null);
            UnitCourse link = new UnitCourse(request.getUnitId(), request.getCourseId());
            UnitCourse saved = unitCourseRepository.save(link);
            audit(principal, "CREATE", "UnitCourse",
                    "Linked unit " + saved.getUnitId() + " to course " + saved.getCourseId());
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/unit-courses/{id}")
    public ResponseEntity<?> updateUnitCourse(@PathVariable Integer id, @RequestBody UnitCourse request,
            Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = unitCourseRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            validateUnitCoursePair(request.getUnitId(), request.getCourseId(), universityId, id);
            UnitCourse link = existing.get();
            link.setUnitId(request.getUnitId());
            link.setCourseId(request.getCourseId());
            UnitCourse saved = unitCourseRepository.save(link);
            audit(principal, "UPDATE", "UnitCourse",
                    "Updated link " + id + ": unit " + saved.getUnitId() + " -> course " + saved.getCourseId());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/unit-courses/{id}")
    public ResponseEntity<?> deleteUnitCourse(@PathVariable Integer id, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        Set<Integer> unitIds = new HashSet<>();
        academicUnitRepository.findByUniversityId(universityId).forEach(unit -> unitIds.add(unit.getUnitId()));
        var existing = unitCourseRepository.findById(id)
                .filter(link -> unitIds.contains(link.getUnitId()));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        UnitCourse link = existing.get();
        unitCourseRepository.delete(link);
        audit(principal, "DELETE", "UnitCourse",
                "Removed link " + id + " (unit " + link.getUnitId() + " / course "
                        + link.getCourseId() + ")");
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/unit-courses/export/csv")
    public ResponseEntity<String> exportUnitCoursesCsv(Principal principal) {
        String csv = getUnitCourses(principal).stream()
                .map(l -> String.join(",",
                        escape(l.getId()),
                        escape(l.getUnitId()),
                        escape(l.getCourseId())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "LinkID,UnitID,CourseID\n" + csv;
        return csvResponse(body, "unit-courses.csv");
    }

    private void validateUnitCoursePair(Integer unitId, Integer courseId, Integer universityId,
            Integer excludeLinkId) {
        if (unitId == null || courseId == null) {
            throw new IllegalArgumentException("Academic unit and course are required.");
        }
        AcademicUnit unit = academicUnitRepository.findById(unitId)
                .filter(u -> u.getUniversityId().equals(universityId))
                .orElseThrow(() -> new IllegalArgumentException("Academic unit not found in your university."));
        Course course = courseRepository.findById(courseId)
                .filter(c -> c.getUniversityId().equals(universityId))
                .orElseThrow(() -> new IllegalArgumentException("Course not found in your university."));
        unitCourseRepository.findByUnitIdAndCourseId(unitId, courseId)
                .filter(link -> !link.getId().equals(excludeLinkId))
                .ifPresent(link -> {
                    throw new IllegalArgumentException("This course is already linked to this unit.");
                });
    }

    // =================================================================
    // Helpers
    // =================================================================

    private Integer requireOwnUniversity(Principal principal) {
        UserEntity user = userRepository.findByUsername(principal.getName()).orElseThrow(
                () -> new IllegalArgumentException("Authenticated user not found."));
        if (user.getUniversityId() == null) {
            throw new IllegalArgumentException("Your account is not linked to a university.");
        }
        return user.getUniversityId().intValue();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void audit(Principal principal, String action, String targetEntity, String details) {
        auditLogService.log(principal != null ? principal.getName() : "system", "SUPERVISOR", action,
                targetEntity, details, null);
    }

    private ResponseEntity<String> csvResponse(String body, String fileName) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(body);
    }

    private String escape(Object value) {
        if (value == null) return "";
        String s = value.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = s.replace("\"", "\"\"");
            return "\"" + s + "\"";
        }
        return s;
    }
}
