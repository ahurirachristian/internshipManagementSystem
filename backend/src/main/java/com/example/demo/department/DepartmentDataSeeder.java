package com.example.demo.department;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * M1 catalog (ADR-002): Nkumba is flat by design -> zero department rows.
 * Kyambogo & Makerere departments imported verbatim from developer branch.
 */
@Component
@Order(24)
public class DepartmentDataSeeder implements CommandLineRunner {

    private final DepartmentRepository repository;

    public DepartmentDataSeeder(DepartmentRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }
        Department e;
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(1);
        e.setSchoolId(1);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Civil and Environmental Engineering\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(2);
        e.setSchoolId(1);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Mechanical and Production Engineering\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(3);
        e.setSchoolId(1);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Electrical and Electronics Engineering\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(4);
        e.setSchoolId(1);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Bio-Medical and Mechatronics Engineering\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(5);
        e.setSchoolId(1);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Mining, Chemical and Petroleum Engineering\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(6);
        e.setSchoolId(2);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Biological Science\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(7);
        e.setSchoolId(2);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Physics\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(8);
        e.setSchoolId(2);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Chemistry\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(9);
        e.setSchoolId(2);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Mathematics and Statistics\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(10);
        e.setSchoolId(2);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Food Science Technology\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(11);
        e.setSchoolId(2);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Sports Science\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(12);
        e.setSchoolId(3);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Agriculture Production\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(13);
        e.setSchoolId(3);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Soil Science and Irrigation Management\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(14);
        e.setSchoolId(3);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Agricultural Education and Agriculture Economics\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(15);
        e.setSchoolId(3);
        e.setUniversityId(2);
        e.setDepartmentName("\"University Farm\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(16);
        e.setSchoolId(4);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Hearing Impairment and Sign Language Interpretation Studies\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(17);
        e.setSchoolId(4);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Visual Impairment Studies\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(18);
        e.setSchoolId(4);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Community and Disability Studies\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(19);
        e.setSchoolId(4);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Adult, Community and Life-Long Learning\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(20);
        e.setSchoolId(4);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Intellectual and Development Difficulties\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(21);
        e.setSchoolId(5);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Languages and Communication Studies\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(22);
        e.setSchoolId(5);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Religious Studies and Philosophy\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(23);
        e.setSchoolId(5);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Literature and Film Studies\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(24);
        e.setSchoolId(5);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Performing Arts\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(25);
        e.setSchoolId(5);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of History, Archeology and Heritage\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(26);
        e.setSchoolId(5);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Geography\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(27);
        e.setSchoolId(6);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Economics\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(28);
        e.setSchoolId(6);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Development Studies\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(29);
        e.setSchoolId(6);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Political Science and Public Administration\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(30);
        e.setSchoolId(6);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Social Work and Social Administration\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(31);
        e.setSchoolId(6);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Sociology, Anthropology and Population Studies\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(32);
        e.setSchoolId(6);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Psychology\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(33);
        e.setSchoolId(7);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Foundations and Educational Psychology\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(34);
        e.setSchoolId(7);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Technical Teacher and Instructor Education\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(35);
        e.setSchoolId(7);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Teacher Education and Extension\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(36);
        e.setSchoolId(7);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Education Planning and Management\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(37);
        e.setSchoolId(7);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Early Childhood and Pre-Primary Education\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(38);
        e.setSchoolId(7);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Curriculum, Pedagogy and Educational Media\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(39);
        e.setSchoolId(8);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Fine Art\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(40);
        e.setSchoolId(8);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Industrial and Commercial Art\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(41);
        e.setSchoolId(8);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Visual Communication\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(42);
        e.setSchoolId(9);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Finance, Accounting and Micro-finance\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(43);
        e.setSchoolId(9);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Management and Administrative Sciences\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(44);
        e.setSchoolId(9);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Business Administration and Entrepreneurship\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(45);
        e.setSchoolId(9);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Procurement and Supply Chain Management\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(46);
        e.setSchoolId(10);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Quantity Surveying and Property Valuation\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(47);
        e.setSchoolId(10);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Architecture\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(48);
        e.setSchoolId(10);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Geo-informatics\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(49);
        e.setSchoolId(11);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Computer Science\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(50);
        e.setSchoolId(11);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Networks, Data Science and Artificial Intelligence\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(51);
        e.setSchoolId(11);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Library and Information Science\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(52);
        e.setSchoolId(12);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Family Life and Consumer Studies\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(53);
        e.setSchoolId(12);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Hotel and Institutional Catering\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(54);
        e.setSchoolId(12);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Cosmetology and Fashion\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(55);
        e.setSchoolId(12);
        e.setUniversityId(2);
        e.setDepartmentName("\"Department of Nutritional Science and Dietetics\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(56);
        e.setSchoolId(13);
        e.setUniversityId(2);
        e.setDepartmentName("\"Centre for Distance Education\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(57);
        e.setSchoolId(13);
        e.setUniversityId(2);
        e.setDepartmentName("\"Centre for E-Learning\"");
        repository.save(e);
        // Kyambogo University (2)
        e = new Department();
        e.setDepartmentId(58);
        e.setSchoolId(13);
        e.setUniversityId(2);
        e.setDepartmentName("\"Learning Centres\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(59);
        e.setSchoolId(15);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Medicine\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(60);
        e.setSchoolId(15);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Surgery\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(61);
        e.setSchoolId(15);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Obstetrics and Gynaecology\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(62);
        e.setSchoolId(15);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Paediatrics and Child Health\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(63);
        e.setSchoolId(16);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Epidemiology and Biostatistics\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(64);
        e.setSchoolId(16);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Community Health and Behavioral Sciences\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(65);
        e.setSchoolId(16);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Disease Control and Environmental Health\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(66);
        e.setSchoolId(17);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Human Anatomy\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(67);
        e.setSchoolId(17);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Physiology\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(68);
        e.setSchoolId(18);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Nursing\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(69);
        e.setSchoolId(18);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Pharmacy\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(70);
        e.setSchoolId(19);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Agricultural Production\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(71);
        e.setSchoolId(20);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Forestry, Bio-Resources and Tourism\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(72);
        e.setSchoolId(20);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Environmental Management\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(73);
        e.setSchoolId(21);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Food Technology and Human Nutrition\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(74);
        e.setSchoolId(22);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Civil and Environmental Engineering\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(75);
        e.setSchoolId(22);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Electrical and Computer Engineering\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(76);
        e.setSchoolId(22);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Mechanical Engineering\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(77);
        e.setSchoolId(23);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Architecture and Physical Planning\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(78);
        e.setSchoolId(23);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Construction Economics and Management\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(79);
        e.setSchoolId(24);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Fine Art\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(80);
        e.setSchoolId(24);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Visual Communication Design\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(81);
        e.setSchoolId(25);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Performing Arts and Film\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(82);
        e.setSchoolId(25);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Philosophy\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(83);
        e.setSchoolId(26);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Languages\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(84);
        e.setSchoolId(26);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Journalism and Communication\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(85);
        e.setSchoolId(27);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Sociology and Anthropology\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(86);
        e.setSchoolId(27);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Political Science and Public Administration\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(87);
        e.setSchoolId(27);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Social Work and Social Administration\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(88);
        e.setSchoolId(28);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Mental Health and Community Psychology\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(89);
        e.setSchoolId(30);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Economic Theory and Analysis\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(90);
        e.setSchoolId(31);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Accounting and Finance\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(91);
        e.setSchoolId(31);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Marketing and Management\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(92);
        e.setSchoolId(32);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Planning and Applied Statistics\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(93);
        e.setSchoolId(33);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Computer Science\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(94);
        e.setSchoolId(33);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Information Technology\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(95);
        e.setSchoolId(33);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Information Systems\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(96);
        e.setSchoolId(34);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Library and Information Science\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(97);
        e.setSchoolId(34);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Records and Archives Management\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(98);
        e.setSchoolId(35);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Humanities and Language Education\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(99);
        e.setSchoolId(35);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Science, Technical and Vocational Education\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(100);
        e.setSchoolId(36);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Adult and Community Education\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(101);
        e.setSchoolId(38);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Physics\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(102);
        e.setSchoolId(38);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Chemistry\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(103);
        e.setSchoolId(38);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Mathematics\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(104);
        e.setSchoolId(39);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Zoology, Entomology and Fisheries Sciences\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(105);
        e.setSchoolId(39);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Plant Sciences, Microbiology and Biotechnology\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(106);
        e.setSchoolId(40);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Veterinary Clinical Studies\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(107);
        e.setSchoolId(41);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Biosecurity, Ecosystems and Veterinary Public Health\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(108);
        e.setSchoolId(42);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Law and Jurisprudence\"");
        repository.save(e);
        // Makerere University (1)
        e = new Department();
        e.setDepartmentId(109);
        e.setSchoolId(43);
        e.setUniversityId(1);
        e.setDepartmentName("\"Department of Gender and Development Studies\"");
        repository.save(e);
    }
}
