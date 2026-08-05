package com.example.demo.university;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class UniversityDataSeeder implements CommandLineRunner {

    private final UniversityRepository universityRepository;

    public UniversityDataSeeder(UniversityRepository universityRepository) {
        this.universityRepository = universityRepository;
    }

    @Override
    public void run(String... args) {
        if (universityRepository.count() == 0) {
            universityRepository.save(new University("Massachusetts Institute of Technology"));
            universityRepository.save(new University("Stanford University"));
            universityRepository.save(new University("Harvard University"));
            universityRepository.save(new University("University of California, Berkeley"));
            universityRepository.save(new University("California Institute of Technology"));
            universityRepository.save(new University("University of Oxford"));
            universityRepository.save(new University("University of Cambridge"));
            universityRepository.save(new University("Imperial College London"));
            universityRepository.save(new University("ETH Zurich"));
            universityRepository.save(new University("University of Toronto"));
        }
    }
}
