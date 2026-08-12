package com.example.demo.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.dto.CountryDto;
import com.example.demo.country.CountryService;

@RestController
@RequestMapping("/api/countries")
public class CountryController {

    private final CountryService countryService;

    public CountryController(CountryService countryService) {
        this.countryService = countryService;
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'SUPERVISOR', 'ADMIN', 'COMPANY')")
    public List<CountryDto> searchCountries(@RequestParam("q") String query) {
        return countryService.searchByName(query).stream()
                .map(country -> new CountryDto(country.getId(), country.getName()))
                .toList();
    }
}
