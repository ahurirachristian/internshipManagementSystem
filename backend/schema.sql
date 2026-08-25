-- AUTO-GENERATED MySQL DDL for Model B (regenerated M7, 2026-08-25).
-- Do not edit by hand; regenerate per docs/MIGRATION-MODELB-LOG.md.


    create table audit_logs (
        id bigint not null auto_increment,
        timestamp datetime(6) not null,
        action varchar(255) not null,
        details varchar(255),
        ip_address varchar(255),
        role varchar(255) not null,
        target_entity varchar(255) not null,
        username varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table company (
        created_at datetime(6),
        id bigint not null auto_increment,
        updated_at datetime(6),
        phone varchar(30),
        registration_number varchar(50),
        city varchar(100),
        country varchar(100),
        industry varchar(100),
        name varchar(200) not null,
        logo_url varchar(500),
        physical_address varchar(500),
        postal_address varchar(500),
        email varchar(255),
        website varchar(255),
        description TEXT,
        size enum ('Enterprise','Large','Medium','Small'),
        primary key (id)
    ) engine=InnoDB;

    create table company_departments (
        company_id bigint not null,
        id bigint not null auto_increment,
        head_contact varchar(30),
        department_name varchar(150) not null,
        head_email varchar(150),
        head_name varchar(150),
        primary key (id)
    ) engine=InnoDB;

    create table company_supervisors (
        is_primary bit,
        company_id bigint not null,
        department_id bigint,
        id bigint not null auto_increment,
        contact varchar(30),
        role varchar(50),
        email varchar(150),
        full_name varchar(150) not null,
        primary key (id)
    ) engine=InnoDB;

    create table countries (
        id bigint not null auto_increment,
        code varchar(255) not null,
        name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table day_diaries (
        date date not null,
        id bigint not null auto_increment,
        student_id bigint not null,
        status varchar(255) not null,
        accomplishments tinytext not null,
        daily_activities tinytext not null,
        knowledge_and_skills_gained tinytext not null,
        supervisor_feedback longtext,
        primary key (id)
    ) engine=InnoDB;

    create table departments (
        department_id integer not null,
        school_id integer not null,
        university_id integer not null,
        department_name varchar(255) not null,
        primary key (department_id)
    ) engine=InnoDB;

    create table evaluations (
        academic_report integer,
        attendance integer not null,
        logbook_quality integer,
        overall_grade integer,
        practical_work_ethics integer not null,
        presentation integer,
        punctuality integer not null,
        workplace_performance integer not null,
        id bigint not null auto_increment,
        placement_id bigint,
        student_id bigint not null,
        supervisor_user_id bigint,
        supervisor_type varchar(255) not null,
        supervisor_username varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table industrial_supervisors (
        company_id bigint not null,
        id bigint not null auto_increment,
        user_id bigint not null,
        department varchar(255),
        first_name varchar(255) not null,
        job_title varchar(255),
        last_name varchar(255) not null,
        phone_number varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table internship_companies (
        country_id integer not null,
        created_at datetime(6),
        id bigint not null auto_increment,
        university_id bigint,
        branch varchar(255),
        company_name varchar(255) not null,
        email varchar(255),
        physical_address varchar(255),
        postal_address varchar(255),
        website varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table placements (
        company_id bigint not null,
        company_supervisor_id bigint,
        id bigint not null auto_increment,
        student_id bigint not null,
        university_supervisor_id bigint,
        company_supervisor varchar(255) not null,
        university_supervisor varchar(255) not null,
        status enum ('ACTIVE','ASSIGNED','CANCELLED','COMPLETED','PENDING') not null,
        primary key (id)
    ) engine=InnoDB;

    create table programmes (
        department_id integer,
        duration_years integer not null,
        programme_id integer not null,
        school_id integer not null,
        university_id integer not null,
        programme_code varchar(255) not null,
        programme_level varchar(255) not null,
        programme_name varchar(255) not null,
        primary key (programme_id)
    ) engine=InnoDB;

    create table roles (
        id integer not null auto_increment,
        description varchar(255),
        name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table schools (
        parent_school_id integer,
        school_id integer not null,
        university_id integer not null,
        school_code varchar(255),
        school_name varchar(255) not null,
        type varchar(255),
        primary key (school_id)
    ) engine=InnoDB;

    create table student_profiles (
        academic_supervisor_id integer,
        course_id integer,
        end_date date,
        field_supervisor_id integer,
        start_date date,
        unit_id integer,
        id bigint not null auto_increment,
        academic_supervisor_contact varchar(20),
        academic_year varchar(20) not null,
        field_supervisor_contact varchar(20),
        mobile_no varchar(20),
        semester varchar(20) not null,
        year_of_study varchar(20) not null,
        intake varchar(50) not null,
        course_name varchar(100) not null,
        program varchar(100) not null,
        reg_no varchar(100) not null,
        student_no varchar(100) not null,
        academic_supervisor varchar(255) not null,
        email varchar(255) not null,
        field_supervisor varchar(255) not null,
        location varchar(255) not null,
        organisation varchar(255) not null,
        student_name varchar(255) not null,
        picture longblob,
        primary key (id)
    ) engine=InnoDB;

    create table students (
        department_id bigint,
        end_date date,
        programme_id bigint,
        school_id bigint,
        start_date date,
        year_of_study integer,
        id bigint not null auto_increment,
        ind_supervisor_id bigint,
        internship_company_id bigint,
        uni_supervisor_id bigint,
        university_id bigint not null,
        user_id bigint not null,
        academic_year varchar(255),
        degree_program varchar(255) not null,
        first_name varchar(255) not null,
        intake varchar(255),
        last_name varchar(255) not null,
        phone_number varchar(255),
        registration_number varchar(255) not null,
        semester varchar(255),
        student_number varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table universities (
        established_year integer,
        university_id integer not null auto_increment,
        short_form varchar(15) not null,
        country varchar(100),
        full_name varchar(200) not null,
        primary key (university_id)
    ) engine=InnoDB;

    create table university_supervisors (
        id bigint not null auto_increment,
        university_id bigint not null,
        user_id bigint not null,
        department varchar(255),
        first_name varchar(255) not null,
        last_name varchar(255) not null,
        phone_number varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table users (
        must_change_password bit not null,
        company_id bigint,
        id bigint not null auto_increment,
        university_id bigint,
        email varchar(255),
        password varchar(255) not null,
        password_reset_token varchar(255),
        provider varchar(255),
        provider_id varchar(255),
        username varchar(255) not null,
        role enum ('ADMIN','COMPANY','STUDENT','SUPERVISOR') not null,
        primary key (id)
    ) engine=InnoDB;

    create table vacancies (
        created_at date not null,
        deadline date not null,
        company_id bigint not null,
        id bigint not null auto_increment,
        location varchar(200),
        title varchar(200) not null,
        description varchar(1000) not null,
        requirements varchar(1000),
        status varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    alter table company 
       add constraint UK1qswdia3ddit32qc5uecnuuid unique (registration_number);

    alter table company 
       add constraint UKniu8sfil2gxywcru9ah3r4ec5 unique (name);

    alter table company_departments 
       add constraint UKirpkrv2m4rysm7regl4dvovbr unique (company_id, department_name);

    alter table countries 
       add constraint UK5dhgnik9p8t72kaktdb8kd8dt unique (code);

    alter table student_profiles 
       add constraint UKgslh3rhua94mjenfacepohb1w unique (reg_no);

    alter table student_profiles 
       add constraint UKm65527m0thexiucy5kbixakh7 unique (student_no);

    alter table universities 
       add constraint UK8rm9hirw37dnm3jan4j25xwag unique (short_form);

    alter table universities 
       add constraint UKfb0i5ospi4y8fv0amwucdu7gi unique (full_name);

    alter table users 
       add constraint UK6jdo1l976be85wv43w6x6e6x2 unique (provider_id);

    alter table users 
       add constraint UKr43af9ap4edm43mmtq01oddj6 unique (username);

    alter table company_departments 
       add constraint FK6rhnm5wmllq7sk1q60hmxqkos 
       foreign key (company_id) 
       references company (id);

    alter table company_supervisors 
       add constraint FKgaas40ummmidwf0fykm528jkx 
       foreign key (company_id) 
       references company (id);

    alter table company_supervisors 
       add constraint FK57llwub3qwyw6vn05jerqfis1 
       foreign key (department_id) 
       references company_departments (id);
