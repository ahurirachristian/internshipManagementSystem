package com.example.demo.controller;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.auth.UserEntity;
import com.example.demo.service.UniversityService;

@RestController
@RequestMapping("/api/university")
public class UniversityApiController {

    private final UniversityService universityService;

    public UniversityApiController(UniversityService universityService) {
        this.universityService = universityService;
    }

}
