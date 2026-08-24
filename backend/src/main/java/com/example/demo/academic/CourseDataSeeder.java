package com.example.demo.academic;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(4)
public class CourseDataSeeder implements CommandLineRunner {

    private final CourseRepository repository;

    public CourseDataSeeder(CourseRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            // Nkumba University (university_id=19): 62 courses
            save(19, "Master Of Education Management And Planning", "2 Years", "Masters");
            save(19, "Ordinary Certificate in Early Childhood Care & Development Education", "1 Year", "Certificate");
            save(19, "Diploma In Education In Early Childhood Care And Development", "2 Years", "Diploma");
            save(19, "Diploma In Education (Secondary) - Science", "2 Years", "Diploma");
            save(19, "Diploma In Education (Secondary) - Arts", "2 Years", "Diploma");
            save(19, "Bachelor Of Education (Primary)", "3 Years", "Bachelors");
            save(19, "Bachelor Of Science With Education (Secondary)", "3 Years", "Bachelors");
            save(19, "Bachelor Of Arts With Education (Secondary)", "3 Years", "Bachelors");
            save(19, "Postgraduate Diploma In Education", "1 Year", "PGD");
            save(19, "Post Graduate Diploma In Educational Management And Planning", "1 Year", "PGD");
            save(19, "PhD in Education Management", "3 Years", "PhD");
            save(19, "Masters Of Science In Information Systems", "2 Years", "Masters");
            save(19, "Certificate in Computerised Accounting", "2 Weeks", "Certificate");
            save(19, "Data Management and Analysis", "2 Weeks", "Short Course");
            save(19, "Certificate in Computer Networking", "2 Weeks", "Certificate");
            save(19, "National Certificate in Information Communication Technology", "2 Years", "Certificate");
            save(19, "Diploma in Information Systems and Technology", "2 Years", "Diploma");
            save(19, "Bachelors of Science in Cybersecurity and Digital Forensics", "3 Years", "Bachelors");
            save(19, "Bachelors in Information Systems and Technology", "3 Years", "Bachelors");
            save(19, "Masters in Information Systems and Technology", "2 Years", "Masters");
            save(19, "Certificate In Python Programming", "1 Year", "Certificate");
            save(19, "Certificate in Graphics and Image Editing", "2 Months", "Certificate");
            save(19, "Diploma In Records And Information Management", "2 Years", "Diploma");
            save(19, "Diploma In Computer Science", "2 Years", "Diploma");
            save(19, "Bachelors Of Records And Information Management", "3 Years", "Bachelors");
            save(19, "Bachelor Of Office Management And Secretarial Studies", "3 Years", "Bachelors");
            save(19, "Bachelor Of Science In Computer Science (BSC)", "3 Years", "Bachelors");
            save(19, "Microsoft Office & Online Collaboration", "2 Weeks", "Short Course");
            save(19, "Bachelor of Criminal Justice (BCJ)", "3 Years", "Bachelors");
            save(19, "Diploma in Criminal Justice", "2 Years", "Diploma");
            save(19, "Bachelor of Laws", "4 Years", "Bachelors");
            save(19, "Bachelor Of Arts In Community Based Development", "3 Years", "Bachelors");
            save(19, "Bachelor Of Arts In Social Work And Social Administration", "3 Years", "Bachelors");
            save(19, "Bachelor Of Science in Journalism & Public Relations", "3 Years", "Bachelors");
            save(19, "PhD in Counselling Psychology", "3 Years", "PhD");
            save(19, "PhD in Public Administration and Management", "3 Years", "PhD");
            save(19, "Bachelor Of Science In Environment Management", "3 Years", "Bachelors");
            save(19, "PhD in Natural Resources Management", "3 Years", "PhD");
            save(19, "Bachelor of Science in Public Health", "3 Years", "Bachelors");
            save(19, "Diploma In Hotel Management And Institutional Catering", "2 Years", "Diploma");
            save(19, "Diploma In Tourism Operations Management", "2 Years", "Diploma");
            save(19, "Bachelor Of Science In Hotel Management And Institutional Catering", "3 Years", "Bachelors");
            save(19, "Bachelor Of Science In Tourism Operations Management", "3 Years", "Bachelors");
            save(19, "Diploma In Agribusiness", "2 Years", "Diploma");
            save(19, "Bachelor Of Science In Wildlife And Forestry Management", "3 Years", "Bachelors");
            save(19, "PhD in Public Health", "3 Years", "PhD");
            save(19, "Bachelor of Business Administration", "3 Years", "Bachelors");
            save(19, "Bachelor Of Procurement And Logistics Management", "3 Years", "Bachelors");
            save(19, "Bachelor Of Clearing And Forwarding Management", "3 Years", "Bachelors");
            save(19, "Bachelor Of Human Resource Management", "3 Years", "Bachelors");
            save(19, "Master Of Procurement And Logistics Management", "2 Years", "Masters");
            save(19, "Master Of Science In Human Resource Management", "2 Years", "Masters");
            save(19, "Master Of Business Administration", "2 Years", "Masters");
            save(19, "PhD in Business Administration", "3 Years", "PhD");
            save(19, "Bachelor of Fashion and Textiles Design", "3 Years", "Bachelors");
            save(19, "Bachelor Of Commercial Art", "3 Years", "Bachelors");
            save(19, "Diploma In Graphic Digital Design", "2 Years", "Diploma");
            save(19, "Diploma In Vocational Arts/Crafts And Design Studies", "2 Years", "Diploma");
            save(19, "PhD in Art and Design", "3 Years", "PhD");
            save(19, "Ph.D In Computing", "3 Years", "PhD");
            save(19, "PhD in Development Studies", "3 Years", "PhD");
            save(19, "Masters in Taxation Management", "2 Years", "Masters");

            // Makerere University (university_id=1): 2 courses
            save(1, "Bachelor of Science in Computer Science", "3 Years", "Bachelors");
            save(1, "Bachelor of Medicine and Bachelor of Surgery", "5 Years", "Bachelors");
        }
    }

    private void save(Integer universityId, String name, String duration, String level) {
        repository.save(new Course(universityId, name, duration, level));
    }
}
