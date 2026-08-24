package com.example.demo.auth;

import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(9)
public class StudentProfileDataSeeder implements CommandLineRunner {

    private final StudentProfileRepository studentProfileRepository;

    public StudentProfileDataSeeder(StudentProfileRepository studentProfileRepository) {
        this.studentProfileRepository = studentProfileRepository;
    }

    @Override
    public void run(String... args) {
        if (studentProfileRepository.count() == 0) {
            // Kasagga Fred
            StudentProfile p1 = new StudentProfile();
            p1.setStudentName("Kasagga Fred");
            p1.setStudentNo("2400101003");
            p1.setRegNo("2024/AUG/BCS/B23628S/DAY");
            p1.setIntake("AUG/2024");
            p1.setProgram("BSCCS");
            p1.setCourseName("Internship");
            p1.setMobileNo("0757402058");
            p1.setEmail("kasaggafred999@gmail.com");
            p1.setYearOfStudy("2026");
            p1.setAcademicYear("Two");
            p1.setSemester("Two");
            p1.setOrganisation("MicroVest");
            p1.setLocation("National ICT Innovation Hub, Nakawa");
            p1.setAcademicSupervisor("Ssemaganda Shuraim");
            p1.setAcademicSupervisorContact("075887005");
            p1.setFieldSupervisor("Nangai Zackaria");
            p1.setFieldSupervisorContact("0784723705");
            p1.setStartDate(LocalDate.of(2026, 7, 13));
            p1.setEndDate(LocalDate.of(2026, 9, 13));
            p1.setUnitId(2);
            p1.setCourseId(19);
            p1.setAcademicSupervisorId(1);
            p1.setFieldSupervisorId(2);
            studentProfileRepository.save(p1);

            // Alex Johnson
            StudentProfile p2 = new StudentProfile();
            p2.setStudentName("Alex Johnson");
            p2.setStudentNo("STU-2026-001");
            p2.setRegNo("REG-1001");
            p2.setIntake("AUG/2024");
            p2.setProgram("BSCCS");
            p2.setCourseName("Internship");
            p2.setMobileNo("+1 555 123 4567");
            p2.setEmail("alex.johnson@example.com");
            p2.setYearOfStudy("2026");
            p2.setAcademicYear("Three");
            p2.setSemester("Two");
            p2.setOrganisation("Airtel Uganda");
            p2.setLocation("Kampala");
            p2.setAcademicSupervisor("university");
            p2.setAcademicSupervisorContact("0700000000");
            p2.setFieldSupervisor("John Doe");
            p2.setFieldSupervisorContact("0700000000");
            p2.setStartDate(LocalDate.of(2026, 7, 13));
            p2.setEndDate(LocalDate.of(2026, 9, 13));
            p2.setUnitId(2);
            p2.setCourseId(27);
            p2.setAcademicSupervisorId(1);
            p2.setFieldSupervisorId(2);
            studentProfileRepository.save(p2);

            // Sarah Owen
            StudentProfile p3 = new StudentProfile();
            p3.setStudentName("Sarah Owen");
            p3.setStudentNo("STU-2026-002");
            p3.setRegNo("REG-1002");
            p3.setIntake("AUG/2024");
            p3.setProgram("BSE");
            p3.setCourseName("Internship");
            p3.setMobileNo("+256 700 111 222");
            p3.setEmail("sarah.owen@example.com");
            p3.setYearOfStudy("2026");
            p3.setAcademicYear("Four");
            p3.setSemester("Two");
            p3.setOrganisation("Airtel Uganda");
            p3.setLocation("Kampala");
            p3.setAcademicSupervisor("university");
            p3.setAcademicSupervisorContact("0700000000");
            p3.setFieldSupervisor("John Doe");
            p3.setFieldSupervisorContact("0700000000");
            p3.setStartDate(LocalDate.of(2026, 7, 13));
            p3.setEndDate(LocalDate.of(2026, 9, 13));
            p3.setUnitId(6);
            p3.setCourseId(47);
            p3.setAcademicSupervisorId(1);
            p3.setFieldSupervisorId(2);
            studentProfileRepository.save(p3);
        }
    }
}
