package com.example.demo.university;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(21)
public class UniversityDataSeeder implements CommandLineRunner {

    private final UniversityRepository universityRepository;

    public UniversityDataSeeder(UniversityRepository universityRepository) {
        this.universityRepository = universityRepository;
    }

    @Override
    public void run(String... args) {
        if (universityRepository.count() == 0) {
            saveAll();
        }
        fillMissingContactDetails();
    }

    /**
     * Phase 4 of the Chris port adds email/phone/physicalAddress/website to
     * universities. Fill them for the three demo-slice roots only, and only
     * where still blank, so existing databases are never overwritten.
     */
    private void fillMissingContactDetails() {
        setContactIfBlank("NU", "info@nku.ac.ug", "+256 414 260 434",
                "P.O. Box 75, Entebbe, Uganda", "https://www.nkumba.ac.ug");
        setContactIfBlank("KYU", "info@kyu.ac.ug", "+256 414 254 503",
                "P.O. Box 1, Kyambogo, Kampala, Uganda", "https://www.kyu.ac.ug");
        setContactIfBlank("MAK", "info@mak.ac.ug", "+256 414 530 001",
                "P.O. Box 7062, Kampala, Uganda", "https://www.mak.ac.ug");
    }

    private void setContactIfBlank(String shortForm, String email, String phone, String address, String website) {
        universityRepository.findAll().stream()
                .filter(u -> shortForm.equals(u.getShortForm()))
                .filter(u -> u.getEmail() == null)
                .findFirst()
                .ifPresent(u -> {
                    u.setEmail(email);
                    u.setPhone(phone);
                    u.setPhysicalAddress(address);
                    u.setWebsite(website);
                    universityRepository.save(u);
                });
    }

    private void saveAll() {
        universityRepository.save(new University("MAK", "Makerere University", "Uganda", 1922));
        universityRepository.save(new University("KYU", "Kyambogo University", "Uganda", 2003));
        universityRepository.save(new University("MUST", "Mbarara University of Science and Technology", "Uganda", 1989));
        universityRepository.save(new University("GU", "Gulu University", "Uganda", 2002));
        universityRepository.save(new University("BUS", "Busitema University", "Uganda", 2007));
        universityRepository.save(new University("KAB", "Kabale University", "Uganda", 2001));
        universityRepository.save(new University("LU", "Lira University", "Uganda", 2012));
        universityRepository.save(new University("MU", "Muni University", "Uganda", 2014));
        universityRepository.save(new University("SUN", "Soroti University", "Uganda", 2015));
        universityRepository.save(new University("MMU", "Mountains of the Moon University", "Uganda", 2015));
        universityRepository.save(new University("MUBS", "Makerere University Business School", "Uganda", 1997));
        universityRepository.save(new University("UMI", "Uganda Management Institute", "Uganda", 1989));
        universityRepository.save(new University("KIU", "Kampala International University", "Uganda", 2001));
        universityRepository.save(new University("UCU", "Uganda Christian University", "Uganda", 1997));
        universityRepository.save(new University("IUIU", "Islamic University in Uganda", "Uganda", 1994));
        universityRepository.save(new University("UMU", "Uganda Martyrs University", "Uganda", 1993));
        universityRepository.save(new University("NDEJJE", "Ndejje University", "Uganda", 1994));
        universityRepository.save(new University("BUGEMA", "Bugema University", "Uganda", 1994));
        universityRepository.save(new University("NU", "Nkumba University", "Uganda", 1994));
        universityRepository.save(new University("CUI", "Cavendish University Uganda", "Uganda", 2008));
        universityRepository.save(new University("VU", "Victoria University", "Uganda", 2010));
        universityRepository.save(new University("ISBAT", "ISBAT University", "Uganda", 2005));
        universityRepository.save(new University("IUEA", "International University of East Africa", "Uganda", 2010));
        universityRepository.save(new University("CIU", "Clarke International University", "Uganda", 2005));
        universityRepository.save(new University("BSU", "Bishop Stuart University", "Uganda", 2002));
        universityRepository.save(new University("MRU", "Muteesa I Royal University", "Uganda", 2007));
        universityRepository.save(new University("SLAU", "St. Lawrence University", "Uganda", 2005));
        universityRepository.save(new University("UTAMU", "Uganda Technology and Management University", "Uganda", 2013));
        universityRepository.save(new University("KCU", "King Ceasor University", "Uganda", 2015));
        universityRepository.save(new University("AFRU", "Africa Renewal University", "Uganda", 2006));
        universityRepository.save(new University("UNIK", "University of Kisubi", "Uganda", 2014));
        universityRepository.save(new University("MIU", "Metropolitan International University", "Uganda", 2013));
        universityRepository.save(new University("IU", "Ibanda University", "Uganda", 2014));
        universityRepository.save(new University("ARU", "African Rural University", "Uganda", 2004));
        universityRepository.save(new University("AWU", "Ankole Western University", "Uganda", 2015));
        universityRepository.save(new University("KUMI", "Kumi University", "Uganda", 2009));
        universityRepository.save(new University("LIU", "LivingStone International University", "Uganda", 2008));
        universityRepository.save(new University("UPU", "Uganda Pentecostal University", "Uganda", 2010));
        universityRepository.save(new University("USHG", "University of Sacred Heart Gulu", "Uganda", 2015));
        universityRepository.save(new University("TU", "Team University", "Uganda", 2016));
        universityRepository.save(new University("VUST", "Valley University of Science and Technology", "Uganda", 2016));
        universityRepository.save(new University("AUIU", "Avance International University", "Uganda", 2017));
        universityRepository.save(new University("ASUL", "All Saints University Lango", "Uganda", 2015));
        universityRepository.save(new University("AKU", "Aga Khan University Kampala", "Uganda", 2016));
        universityRepository.save(new University("ABU", "African Bible University", "Uganda", 2005));
        universityRepository.save(new University("GLRU", "Great Lakes Regional University", "Uganda", 2016));
        universityRepository.save(new University("RIU", "Rwenzori International University", "Uganda", 2016));
        universityRepository.save(new University("ROU", "Royal Open University", "Uganda", 2017));
        universityRepository.save(new University("NIU", "Nexus International University", "Uganda", 2018));
        universityRepository.save(new University("LWU", "Limkokwing University Uganda", "Uganda", 2014));
    }
}
