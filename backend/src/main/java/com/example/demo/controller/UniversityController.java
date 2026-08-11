package com.example.demo.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.dto.UniversityDto;
import com.example.demo.service.UniversityService;

@RestController
@RequestMapping("/university")
public class UniversityController {

    private final UniversityService universityService;

    public UniversityController(UniversityService universityService) {
        this.universityService = universityService;
    }

    @GetMapping("/universities/search")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'SUPERVISOR', 'ADMIN')")
    @ResponseBody
    public List<UniversityDto> searchUniversities(
            @RequestParam("q") String query) {
        return universityService.searchByName(query).stream()
                .map(universityService::toDto)
                .toList();
    }
}