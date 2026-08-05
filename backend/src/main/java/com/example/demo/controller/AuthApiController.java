package com.example.demo.controller;

import java.security.Principal;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthApiController {

    @GetMapping("/me")
    public Map<String, Object> me(Principal principal) {
        return Map.of("username", principal.getName());
    }
}