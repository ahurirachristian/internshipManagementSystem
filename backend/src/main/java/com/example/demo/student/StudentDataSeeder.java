package com.example.demo.student;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import com.example.demo.auth.UserRepository;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;

/**
 * M8: Model-B students are the rows the university dashboard aggregates on.
 * This seeder creates the demo students for the Nkumba (university_id=19)
 * demo deployment so university-scoped stats/roster have meaningful dev data.
 * Students are linked to the real uni-19 IT programme (and its school) so the
 * school/programme analytics charts have structural data.
 */
@Component
@Order(33)
public class StudentDataSeeder implements CommandLineRunner {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final ProgrammeRepository programmeRepository;

    public StudentDataSeeder(StudentRepository studentRepository, UserRepository userRepository,
            ProgrammeRepository programmeRepository) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.programmeRepository = programmeRepository;
    }

    @Override
    public void run(String... args) {
        if (studentRepository.count() > 0) {
            return;
        }
        Programme it = programmeRepository.findByUniversityId(19).stream()
                .filter(p -> {
                    if (p.getProgrammeName() == null) {
                        return false;
                    }
                    String n = p.getProgrammeName().toLowerCase();
                    boolean bachelors = n.contains("bachelor") || n.contains("bsc")
                            || n.contains("b.tech") || n.contains("b.tech");
                    return bachelors && (n.contains("technology") || n.contains("comput")
                            || n.contains("information systems") || n.contains("software"));
                })
                .findFirst().orElse(null);
        Long programmeId = it != null ? it.getProgrammeId().longValue() : null;
        Long schoolId = it != null ? it.getSchoolId().longValue() : null;
        Long departmentId = it != null && it.getDepartmentId() != null
                ? it.getDepartmentId().longValue() : null;

        student("2400101003", "Kasagga", "Fred", "REG-2026-001", 3, 1L, "Male",
                programmeId, schoolId, departmentId);
        student("STU-2026-001", "Alex", "Johnson", "REG-2026-002", 2, 1L, "Male",
                programmeId, schoolId, departmentId);
        student("STU-2026-002", "Sarah", "Owen", "REG-2026-003", 2, 1L, "Female",
                programmeId, schoolId, departmentId);
    }

    private void student(String username, String firstName, String lastName, String regNo, int year,
            Long companyId, String gender, Long programmeId, Long schoolId, Long departmentId) {
        userRepository.findByUsername(username).ifPresent(user -> {
            Student s = new Student();
            s.setUserId(user.getId());
            s.setUniversityId(19L);
            s.setInternshipCompanyId(companyId);
            s.setFirstName(firstName);
            s.setLastName(lastName);
            s.setRegistrationNumber(regNo);
            s.setStudentNumber(username);
            s.setYearOfStudy(year);
            s.setDegreeProgram("BSc Information Technology");
            s.setGender(gender);
            s.setProgrammeId(programmeId);
            s.setSchoolId(schoolId);
            s.setDepartmentId(departmentId);
            studentRepository.save(s);
        });
    }
}
