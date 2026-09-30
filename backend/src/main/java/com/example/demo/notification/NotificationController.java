package com.example.demo.notification;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.UserRepository;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Map<String, Object>> mine(@RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            Authentication authentication) {
        Long userId = currentUserId(authentication);
        return notificationService.findMine(userId, unreadOnly, page).stream()
                .map(n -> Map.<String, Object>of(
                        "id", n.getId(),
                        "type", n.getType(),
                        "title", n.getTitle(),
                        "body", n.getBody() == null ? "" : n.getBody(),
                        "link", n.getLink() == null ? "" : n.getLink(),
                        "read", n.isRead(),
                        "createdAt", n.getCreatedAt().toString()))
                .toList();
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Authentication authentication) {
        return Map.of("count", notificationService.unreadCount(currentUserId(authentication)));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id, Authentication authentication) {
        boolean ok = notificationService.markRead(currentUserId(authentication), id);
        return ok ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllRead(Authentication authentication) {
        notificationService.markAllRead(currentUserId(authentication));
        return ResponseEntity.noContent().build();
    }

    private Long currentUserId(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user has no account row"))
                .getId();
    }
}
