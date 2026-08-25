package com.example.demo.school;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * M1 catalog (ADR-002 / MIGRATION_PLAN.md R4+R5): Nkumba (ours) +
 * Kyambogo & Makerere slices imported verbatim from developer branch.
 * Makerere imports FLAT: no college grouping is invented; when a real
 * college tree is supplied, encode it via parentSchoolId.
 */
@Component
@Order(23)
public class SchoolDataSeeder implements CommandLineRunner {

    private final SchoolRepository repository;

    public SchoolDataSeeder(SchoolRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }
        School e;
        // Nkumba University (19)
        e = new School();
        e.setSchoolId(901);
        e.setSchoolCode("NU-SEDU");
        e.setUniversityId(19);
        e.setSchoolName("School of Education");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Nkumba University (19)
        e = new School();
        e.setSchoolId(902);
        e.setSchoolCode("NU-SCI");
        e.setUniversityId(19);
        e.setSchoolName("School of Computing and Informatics");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Nkumba University (19)
        e = new School();
        e.setSchoolId(903);
        e.setSchoolCode("NU-SLAW");
        e.setUniversityId(19);
        e.setSchoolName("School of Law");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Nkumba University (19)
        e = new School();
        e.setSchoolId(904);
        e.setSchoolCode("NU-SOSS");
        e.setUniversityId(19);
        e.setSchoolName("School of Social Sciences");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Nkumba University (19)
        e = new School();
        e.setSchoolId(905);
        e.setSchoolCode("NU-SCOS");
        e.setUniversityId(19);
        e.setSchoolName("School of Sciences");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Nkumba University (19)
        e = new School();
        e.setSchoolId(906);
        e.setSchoolCode("NU-SBA");
        e.setUniversityId(19);
        e.setSchoolName("School of Business Administration");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Nkumba University (19)
        e = new School();
        e.setSchoolId(907);
        e.setSchoolCode("NU-SCIAD");
        e.setUniversityId(19);
        e.setSchoolName("School of Commercial Industrial Art and Design");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Nkumba University (19)
        e = new School();
        e.setSchoolId(908);
        e.setSchoolCode("NU-DPGSR");
        e.setUniversityId(19);
        e.setSchoolName("Directorate of Postgraduate Studies and Research");
        e.setParentSchoolId(null);
        e.setType("DIRECTORATE");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(1);
        e.setSchoolCode("\"FOENG\"");
        e.setUniversityId(2);
        e.setSchoolName("\"Faculty of Engineering\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(2);
        e.setSchoolCode("\"FOSCI\"");
        e.setUniversityId(2);
        e.setSchoolName("\"Faculty of Science\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(3);
        e.setSchoolCode("\"FOAGR\"");
        e.setUniversityId(2);
        e.setSchoolName("\"Faculty of Agriculture\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(4);
        e.setSchoolCode("\"FSNR\"");
        e.setUniversityId(2);
        e.setSchoolName("\"Faculty of Special Needs & Rehabilitation\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(5);
        e.setSchoolCode("\"FAH\"");
        e.setUniversityId(2);
        e.setSchoolName("\"Faculty of Arts and Humanities\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(6);
        e.setSchoolCode("\"FSS\"");
        e.setUniversityId(2);
        e.setSchoolName("\"Faculty of Social Sciences\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(7);
        e.setSchoolCode("\"SOE\"");
        e.setUniversityId(2);
        e.setSchoolName("\"School of Education\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(8);
        e.setSchoolCode("\"SAID\"");
        e.setUniversityId(2);
        e.setSchoolName("\"School of Art and Industrial Design\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(9);
        e.setSchoolCode("\"SOME\"");
        e.setUniversityId(2);
        e.setSchoolName("\"School of Management & Entrepreneurship\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(10);
        e.setSchoolCode("\"SOFBE\"");
        e.setUniversityId(2);
        e.setSchoolName("\"School of Built Environment\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(11);
        e.setSchoolCode("\"SCIS\"");
        e.setUniversityId(2);
        e.setSchoolName("\"School of Computing and Information Science\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(12);
        e.setSchoolCode("\"SOVS\"");
        e.setUniversityId(2);
        e.setSchoolName("\"School of Vocational Studies\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(13);
        e.setSchoolCode("\"IDAEL\"");
        e.setUniversityId(2);
        e.setSchoolName("\"Institute of Distance Education, E-Learning & Learning Centres\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Kyambogo University (2)
        e = new School();
        e.setSchoolId(14);
        e.setSchoolCode("\"DRGT\"");
        e.setUniversityId(2);
        e.setSchoolName("\"Directorate of Research & Graduate Training\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(15);
        e.setSchoolCode("\"SOM\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Medicine\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(16);
        e.setSchoolCode("\"SOPH\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Public Health\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(17);
        e.setSchoolCode("\"SOBS\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Biomedical Sciences\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(18);
        e.setSchoolCode("\"SOHS\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Health Sciences\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(19);
        e.setSchoolCode("\"SOAS\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Agricultural Sciences\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(20);
        e.setSchoolCode("\"SFES\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Forestry, Environmental and Geographical Sciences\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(21);
        e.setSchoolCode("\"SFTNB\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Food Technology, Nutrition and Bio-Engineering\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(22);
        e.setSchoolCode("\"SOE_MAK\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Engineering\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(23);
        e.setSchoolCode("\"SBE_MAK\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Built Environment\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(24);
        e.setSchoolCode("\"MGIFA\"");
        e.setUniversityId(1);
        e.setSchoolName("\"Margaret Trowell School of Industrial and Fine Arts\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(25);
        e.setSchoolCode("\"SLPA\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Liberal and Performing Arts\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(26);
        e.setSchoolCode("\"SLLC\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Languages, Literature and Communication\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(27);
        e.setSchoolCode("\"SSS\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Social Sciences\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(28);
        e.setSchoolCode("\"SOP\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Psychology\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(29);
        e.setSchoolCode("\"MISR\"");
        e.setUniversityId(1);
        e.setSchoolName("\"Makerere Institute of Social Research\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(30);
        e.setSchoolCode("\"SOECON\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Economics\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(31);
        e.setSchoolCode("\"SOBUS\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Business\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(32);
        e.setSchoolCode("\"SOSP\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Statistics and Planning\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(33);
        e.setSchoolCode("\"SCIT\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Computing and Informatics Technology\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(34);
        e.setSchoolCode("\"EASLIS\"");
        e.setUniversityId(1);
        e.setSchoolName("\"East African School of Library and Information Science\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(35);
        e.setSchoolCode("\"SOE_CEES\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Education\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(36);
        e.setSchoolCode("\"SODLL\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Distance and Lifelong Learning\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(37);
        e.setSchoolCode("\"SOHES\"");
        e.setUniversityId(1);
        e.setSchoolName("\"East African School of Higher Education Studies and Development\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(38);
        e.setSchoolCode("\"SPAS\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Physical Sciences\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(39);
        e.setSchoolCode("\"SBS\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Biological Sciences\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(40);
        e.setSchoolCode("\"SVR\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Veterinary Medicine and Animal Resources\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(41);
        e.setSchoolCode("\"SBB\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Biosecurity, Biotechnical and Laboratory Sciences\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(42);
        e.setSchoolCode("\"SOL\"");
        e.setUniversityId(1);
        e.setSchoolName("\"School of Law\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
        // Makerere University (1)
        e = new School();
        e.setSchoolId(43);
        e.setSchoolCode("\"IGDS\"");
        e.setUniversityId(1);
        e.setSchoolName("\"Institute of Gender and Development Studies\"");
        e.setParentSchoolId(null);
        e.setType("SCHOOL");
        repository.save(e);
    }
}
