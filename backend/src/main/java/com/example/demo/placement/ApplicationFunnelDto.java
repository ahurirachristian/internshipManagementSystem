package com.example.demo.placement;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * PC9: funnel counts per lifecycle status for one scope.
 *
 * <p>{@code counts} is ZERO-FILLED over the full status vocabulary in
 * declaration order (same rule as PC6b's diary status aggregate): a status
 * with no rows must read as a real, measured zero — never be absent and make
 * a chart interpolate. {@code total} is the row count the counts must
 * reconcile with (the PC9 test sums the map and compares).
 */
public record ApplicationFunnelDto(Map<String, Long> counts, long total) {

    /** Zero-filled builder: every status present, unknown extras folded in. */
    public static ApplicationFunnelDto of(Map<Application.Status, Long> grouped, long total) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Application.Status status : Application.Status.values()) {
            counts.put(status.name(), grouped.getOrDefault(status, 0L));
        }
        return new ApplicationFunnelDto(counts, total);
    }
}
