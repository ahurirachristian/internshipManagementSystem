package com.example.demo.controller;

import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.service.AdminAnalyticsService;

/**
 * PC5: system-wide counts for the admin dashboard.
 *
 * <p>ADMIN-only because these figures are deliberately global — there is no
 * institution to scope them to. A SUPERVISOR hitting this gets 403 rather than a
 * 403-shaped payload, so the boundary is visible in tests.
 */
@RestController
@RequestMapping("/api/admin/analytics")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminAnalyticsController {

    private final AdminAnalyticsService adminAnalyticsService;

    public AdminAnalyticsController(AdminAnalyticsService adminAnalyticsService) {
        this.adminAnalyticsService = adminAnalyticsService;
    }

    @GetMapping("/students-per-university")
    public Map<String, Object> studentsPerUniversity() {
        return adminAnalyticsService.studentsPerUniversity();
    }

    /**
     * PC12 chart 5: placement coverage per university.
     *
     * <p>Global by definition — an admin's oversight question spans every
     * university, so there is no tenant to scope to and the ADMIN guard on this
     * controller is the only boundary.
     */
    @GetMapping("/placement-coverage")
    public Map<String, Object> placementCoverage() {
        return adminAnalyticsService.placementCoverage();
    }

    /**
     * PC12 chart 6: diary review backlog per university.
     *
     * <p>Global for the same reason as the rest of this controller — an admin's
     * oversight question spans every university, so the ADMIN authority is the
     * only boundary and there is nothing to scope to.
     */
    @GetMapping("/diary-backlog")
    public Map<String, Object> diaryBacklog() {
        return adminAnalyticsService.diaryBacklogByUniversity();
    }
}
