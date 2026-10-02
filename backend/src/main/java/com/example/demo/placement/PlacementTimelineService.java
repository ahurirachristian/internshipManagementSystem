package com.example.demo.placement;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.stereotype.Service;

import com.example.demo.auth.UserEntity;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * PC8b (plan §PC8b): the three timeline queries — funnel-over-time, median
 * time-to-placement (createdAt → assignedAt), and active duration
 * (startedAt → completedAt).
 *
 * <p>Null-exclusion is the contract: a row with a NULL endpoint is skipped,
 * never coerced to epoch and never counted as a zero-length interval. A
 * placement that never left {@code ASSIGNED} therefore has no active
 * duration at all — it is excluded from the average instead of dragging it
 * toward zero (the exact corruption the plan's backfill policy exists to
 * prevent).
 *
 * <p>Scope mirrors the pipeline's guard: admins see everything, a company
 * sees only its own placements, a university supervisor sees their
 * university's (legacy rows with a NULL university_id fall back to the
 * student's university, same resolution as {@code requireLifecycleScope}).
 */
@Service
public class PlacementTimelineService {

    private final PlacementRepository placementRepository;
    private final StudentRepository studentRepository;

    public PlacementTimelineService(PlacementRepository placementRepository, StudentRepository studentRepository) {
        this.placementRepository = placementRepository;
        this.studentRepository = studentRepository;
    }

    /** Role-scoped entry point for {@code GET /api/placements/timeline}. */
    public PlacementTimelineDto timelineFor(UserEntity actor) {
        return compute(scopedPlacements(actor));
    }

    /**
     * The pure computation over an explicit placement set — public so tests
     * can hand-compute the expected aggregates against a fixture.
     */
    public PlacementTimelineDto compute(List<Placement> placements) {
        // Funnel-over-time: one bucket per calendar month, four event slots.
        Map<YearMonth, long[]> buckets = new TreeMap<>();
        for (Placement placement : placements) {
            bump(buckets, placement.getOfferedAt(), 0);
            bump(buckets, placement.getAssignedAt(), 1);
            bump(buckets, placement.getStartedAt(), 2);
            bump(buckets, placement.getCompletedAt(), 3);
        }
        List<PlacementTimelineDto.MonthFunnel> funnel = buckets.entrySet().stream()
                .map(e -> new PlacementTimelineDto.MonthFunnel(
                        e.getKey().toString(), e.getValue()[0], e.getValue()[1], e.getValue()[2], e.getValue()[3]))
                .toList();

        // Median time-to-placement: both endpoints required, nulls skipped.
        List<Double> timeToPlacement = placements.stream()
                .filter(p -> p.getCreatedAt() != null && p.getAssignedAt() != null)
                .map(p -> daysBetween(p.getCreatedAt(), p.getAssignedAt()))
                .sorted()
                .toList();
        Double median = timeToPlacement.isEmpty() ? null : median(timeToPlacement);

        // Active duration: both endpoints required — ASSIGNED-only rows are
        // excluded here, not averaged in as zero.
        List<Double> durations = placements.stream()
                .filter(p -> p.getStartedAt() != null && p.getCompletedAt() != null)
                .map(p -> daysBetween(p.getStartedAt(), p.getCompletedAt()))
                .toList();
        Double average = durations.isEmpty()
                ? null
                : durations.stream().mapToDouble(Double::doubleValue).average().orElseThrow();

        return new PlacementTimelineDto(funnel, median, timeToPlacement.size(), average, durations.size());
    }

    private List<Placement> scopedPlacements(UserEntity actor) {
        if (Boolean.TRUE.equals(actor.getSuperAdmin()) || "ADMIN".equals(actor.getRole().name())) {
            return placementRepository.findAll();
        }
        if (actor.getCompanyId() != null || "COMPANY".equals(actor.getRole().name())) {
            if (actor.getCompanyId() == null) {
                // Same shape as PlacementPipelineService.createOffer: a company
                // account without a linked company is a configuration error → 409.
                throw new IllegalStateException("Your account is not linked to a company.");
            }
            return placementRepository.findByCompanyId(actor.getCompanyId());
        }
        Long universityId = actor.getUniversityId();
        if (universityId == null) {
            // No scope resolvable → empty, never someone else's numbers.
            return List.of();
        }
        return placementRepository.findAll().stream()
                .filter(p -> inUniversity(p, universityId))
                .toList();
    }

    private boolean inUniversity(Placement placement, Long universityId) {
        if (placement.getUniversityId() != null) {
            return universityId.equals(placement.getUniversityId());
        }
        // Legacy rows carry no university_id: fall back to the student's.
        return studentRepository.findById(placement.getStudentId())
                .map(Student::getUniversityId)
                .map(universityId::equals)
                .orElse(false);
    }

    private static void bump(Map<YearMonth, long[]> buckets, LocalDateTime at, int slot) {
        if (at == null) {
            return;
        }
        buckets.computeIfAbsent(YearMonth.from(at), k -> new long[4])[slot]++;
    }

    private static double daysBetween(LocalDateTime start, LocalDateTime end) {
        // Nanosecond precision: a start→complete pair inside the same second
        // must still read as a positive duration, not 0.0 days.
        return Duration.between(start, end).toNanos() / 86_400_000_000_000.0;
    }

    /** Input must be sorted ascending (odd → middle value, even → mean of the pair). */
    private static Double median(List<Double> sorted) {
        int n = sorted.size();
        if (n % 2 == 1) {
            return sorted.get(n / 2);
        }
        return (sorted.get(n / 2 - 1) + sorted.get(n / 2)) / 2.0;
    }
}
