package com.example.internship_management.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "countries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Country {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "iso_code", nullable = false, unique = true, length = 3)
    private String isoCode;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
