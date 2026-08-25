package com.example.demo.academic;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(26)
public class AcademicUnitDataSeeder implements CommandLineRunner {

    private final AcademicUnitRepository repository;

    public AcademicUnitDataSeeder(AcademicUnitRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            // Nkumba University (university_id=19): 8 flat schools
            save(19, null, AcademicUnit.UnitType.School, "School of Education", "SEDU");
            save(19, null, AcademicUnit.UnitType.School, "School of Computing and Informatics", "SCI");
            save(19, null, AcademicUnit.UnitType.School, "School of Law", "SLAW");
            save(19, null, AcademicUnit.UnitType.School, "School of Social Sciences", "SOSS");
            save(19, null, AcademicUnit.UnitType.School, "School of Sciences", "SCOS");
            save(19, null, AcademicUnit.UnitType.School, "School of Business Administration", "SBA");
            save(19, null, AcademicUnit.UnitType.School, "School of Commercial Industrial Art and Design", "SCIAD");
            save(19, null, AcademicUnit.UnitType.Directorate, "Directorate of Postgraduate Studies and Research", "DPGSR");

            // Makerere University (university_id=1): 9 top-level colleges
            Integer chs = save(1, null, AcademicUnit.UnitType.College, "College of Health Sciences", "CHS");
            Integer cocis = save(1, null, AcademicUnit.UnitType.College, "College of Computing and Information Sciences", "COCIS");
            save(1, null, AcademicUnit.UnitType.College, "College of Business and Management Sciences", "CoBAMS");
            save(1, null, AcademicUnit.UnitType.College, "College of Education and External Studies", "CEES");
            save(1, null, AcademicUnit.UnitType.College, "College of Engineering, Design, Art and Technology", "CEDAT");
            save(1, null, AcademicUnit.UnitType.College, "College of Natural Sciences", "CoNAS");
            save(1, null, AcademicUnit.UnitType.College, "College of Humanities and Social Sciences", "CHUSS");
            save(1, null, AcademicUnit.UnitType.College, "College of Agricultural and Environmental Sciences", "CAES");
            save(1, null, AcademicUnit.UnitType.College, "College of Veterinary Medicine, Animal Resources and Bio-security", "CoVAB");

            // Makerere: 5 schools under CHS (parent = chs)
            save(1, chs, AcademicUnit.UnitType.School, "School of Medicine", "MUSM");
            save(1, chs, AcademicUnit.UnitType.School, "School of Public Health", "MUSPH");
            Integer makSbs = save(1, chs, AcademicUnit.UnitType.School, "School of Biomedical Sciences", "MakSBS");
            save(1, chs, AcademicUnit.UnitType.School, "School of Dentistry", "MUSD");
            save(1, chs, AcademicUnit.UnitType.School, "School of Health Sciences", "MUSHS");

            // Makerere: 3 departments under School of Biomedical Sciences
            save(1, makSbs, AcademicUnit.UnitType.Department, "Department of Anatomy", null);
            save(1, makSbs, AcademicUnit.UnitType.Department, "Department of Biochemistry", null);
            save(1, makSbs, AcademicUnit.UnitType.Department, "Department of Physiology", null);

            // Makerere: 1 department under COCIS
            save(1, cocis, AcademicUnit.UnitType.Department, "Department of Computer Science", null);
        }
    }

    private Integer save(Integer universityId, Integer parentUnitId, AcademicUnit.UnitType type, String name, String shortForm) {
        AcademicUnit unit = new AcademicUnit(universityId, parentUnitId, type, name, shortForm);
        return repository.save(unit).getUnitId();
    }
}
