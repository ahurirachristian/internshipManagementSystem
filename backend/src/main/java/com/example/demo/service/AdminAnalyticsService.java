package com.example.demo.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.placement.Placement;
import com.example.demo.placement.PlacementRepository;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

/**
 * PC5: admin-wide counts.
 *
 * <p>Everything here is system-wide by definition, so the only guard is the
 * controller's ADMIN authority — there is no tenant to scope to. The counts are
 * aggregated in the database rather than by loading every student row, so this
 * stays cheap as rosters grow.
 */
@Service
public class AdminAnalyticsService {

    private final StudentRepository studentRepository;
    private final UniversityRepository universityRepository;
    private final PlacementRepository placementRepository;
    private final DayDiaryRepository dayDiaryRepository;

    public AdminAnalyticsService(StudentRepository studentRepository,
            UniversityRepository universityRepository,
            PlacementRepository placementRepository,
            DayDiaryRepository dayDiaryRepository) {
        this.studentRepository = studentRepository;
        this.universityRepository = universityRepository;
        this.placementRepository = placementRepository;
        this.dayDiaryRepository = dayDiaryRepository;
    }

    /**
     * PC12: placement coverage per university, plus the placement-status mix.
     *
     * <p>The plan flags this chart as "current state only", and that caveat is
     * load-bearing rather than a footnote: {@code Placement.status} is the
     * status of the most recent record for a student, so a student whose earlier
     * placement was cancelled and who has not been re-offered reads here exactly
     * like a student who was never placed at all. The chart must not present
     * that as a clean cohort figure, so each row carries both the covered and
     * uncovered counts and this method's doc says plainly what "uncovered"
     * means.
     *
     * <p>Cancelled placements do not count as coverage: a cancelled placement is
     * not something the student can return to, so treating it as coverage would
     * hide the students who most need re-placing. A cancelled placement is still
     * reported in the status mix, which is additive over placement records.
     *
     * <p>All counts are aggregated in the database. Nothing here loads student or
     * placement rows to count them, so the endpoint stays flat as rosters grow.
     */
/**
 * PC12: diary review backlog per university.
 *
 * <p>Answers the plan's "where is the diary backlog concentrated", and is a
 * deviation from the column the plan names. See
 * {@link DayDiaryRepository#countDiaryBacklogGroupedByUniversity()} for why
 * grouping by {@code DayDiary.status} would be wrong: the column is legacy and
 * constant, and the canonical Reviewed / Awaiting review split comes from the
 * presence of a supervisor comment. The backlog therefore matches what each
 * supervisor already sees on their own tab, which is the only way an
 * institution-wide figure can be reconciled with the local one.
 *
 * <p>Universities with no diaries at all are omitted. A 0-day backlog for a
 * university that has not started filing is not the same finding as a cleared
 * backlog, and the chart says nothing about them rather than showing an
 * indistinguishable zero.
 */
@Transactional(readOnly = true)
public Map<String, Object> diaryBacklogByUniversity() {
    Map<Long, String> namesById = new LinkedHashMap<>();
    for (University university : universityRepository.findAll()) {
        namesById.put(university.getId().longValue(), university.getFullName());
    }

    List<Map<String, Object>> rows = new ArrayList<>();
    long unattributedEntries = 0;
    long totalAwaitingReview = 0;
    long totalReviewed = 0;

    for (Object[] row : dayDiaryRepository.countDiaryBacklogGroupedByUniversity()) {
        if (!(row[0] instanceof Number idNumber)) {
            // The join through Student cannot produce a null university, but if it
            // ever did the entries are counted rather than dropped.
            unattributedEntries += ((Number) row[2]).longValue();
            continue;
        }
        Long universityId = idNumber.longValue();
        long reviewed = ((Number) row[1]).longValue();
        long total = ((Number) row[2]).longValue();
        long awaiting = Math.max(0, total - reviewed);
        totalAwaitingReview += awaiting;
        totalReviewed += reviewed;

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("universityId", universityId);
        item.put("name", namesById.getOrDefault(universityId, "University " + universityId));
        item.put("total", total);
        item.put("reviewed", reviewed);
        item.put("awaitingReview", awaiting);
        item.put("reviewedPct", total == 0 ? 0L : Math.round(100.0 * reviewed / total));
        rows.add(item);
    }

    // Heaviest backlog first: the chart's purpose is locating the pressure.
    rows.sort(Comparator.comparingLong(r -> -((Number) r.get("awaitingReview")).longValue()));

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("byUniversity", rows);
    out.put("unattributedEntries", unattributedEntries);
    out.put("totalAwaitingReview", totalAwaitingReview);
    out.put("totalReviewed", totalReviewed);
    return out;
}

@Transactional(readOnly = true)
public Map<String, Object> placementCoverage() {
        Map<Long, String> namesById = new LinkedHashMap<>();
        List<University> universities = universityRepository.findAll();
        for (University university : universities) {
            namesById.put(university.getId().longValue(), university.getFullName());
        }

        Map<Long, Long> totalByUniversity = new LinkedHashMap<>();
        long unattributedStudents = 0;
        for (Object[] row : studentRepository.countGroupedByUniversity()) {
            if (!(row[0] instanceof Number idNumber)) {
                unattributedStudents += ((Number) row[1]).longValue();
                continue;
            }
            totalByUniversity.put(idNumber.longValue(), ((Number) row[1]).longValue());
        }

        Map<Long, Long> coveredByUniversity = new LinkedHashMap<>();
        for (Object[] row : placementRepository.countDistinctStudentsWithPlacementExcluding(
                Placement.Status.CANCELLED)) {
            if (row[0] instanceof Number idNumber) {
                coveredByUniversity.put(idNumber.longValue(), ((Number) row[1]).longValue());
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        long overCoveredTotal = 0;
        for (Map.Entry<Long, Long> entry : totalByUniversity.entrySet()) {
            Long universityId = entry.getKey();
            long total = entry.getValue();
            long covered = coveredByUniversity.getOrDefault(universityId, 0L);

            // Coverage can exceed the cohort if placements are attributed to a
            // university the student does not belong to. That is a data problem,
            // not a coverage win, so it is reported separately rather than being
            // allowed to produce a negative "needs placement" count.
            long overCovered = Math.max(0, covered - total);
            overCoveredTotal += overCovered;
            long uncovered = Math.max(0, total - covered);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("universityId", universityId);
            row.put("name", namesById.getOrDefault(universityId, "University " + universityId));
            row.put("totalStudents", total);
            row.put("coveredStudents", covered);
            row.put("uncoveredStudents", uncovered);
            row.put("overCoveredStudents", overCovered);
            row.put("coveragePct", total == 0 ? 0L
                    : Math.min(100L, Math.round(100.0 * covered / total)));
            rows.add(row);
        }

        // Most students still needing a placement first: that is the list an
        // admin acts on, and it is not the largest cohort.
        rows.sort(Comparator.comparingLong(r -> -((Number) r.get("uncoveredStudents")).longValue()));

        List<Map<String, Object>> byStatus = new ArrayList<>();
        long totalPlacements = 0;
        for (Object[] row : placementRepository.countGroupedByStatus()) {
            Placement.Status status = (Placement.Status) row[0];
            long count = ((Number) row[1]).longValue();
            totalPlacements += count;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("status", status.name());
            item.put("count", count);
            byStatus.add(item);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("byUniversity", rows);
        out.put("placementsByStatus", byStatus);
        out.put("unattributedStudents", unattributedStudents);
        out.put("overCoveredTotal", overCoveredTotal);
        out.put("totalStudents", totalByUniversity.values().stream().mapToLong(Long::longValue).sum()
                + unattributedStudents);
        out.put("totalPlacements", totalPlacements);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> studentsPerUniversity() {
        Map<Long, String> namesById = new LinkedHashMap<>();
        List<University> universities = universityRepository.findAll();
        for (University university : universities) {
            namesById.put(university.getId().longValue(), university.getFullName());
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        long unattributed = 0;
        for (Object[] row : studentRepository.countGroupedByUniversity()) {
            if (!(row[0] instanceof Number idNumber)) {
                // Students with no university are not silently dropped; they become
                // their own "Unassigned" bar so the totals still reconcile.
                unattributed += ((Number) row[1]).longValue();
                continue;
            }
            Long universityId = idNumber.longValue();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("universityId", universityId);
            item.put("name", namesById.getOrDefault(universityId, "University " + universityId));
            item.put("count", ((Number) row[1]).longValue());
            rows.add(item);
        }

        // Largest first: the bar's question is "which university dominates".
        rows.sort(Comparator.comparingLong(r -> -((Number) r.get("count")).longValue()));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("studentsPerUniversity", rows);
        out.put("unassignedCount", unattributed);
        out.put("totalStudents", rows.stream().mapToLong(r -> ((Number) r.get("count")).longValue()).sum() + unattributed);
        return out;
    }
}
