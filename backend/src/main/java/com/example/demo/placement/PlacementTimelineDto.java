package com.example.demo.placement;

import java.util.List;

/**
 * PC8b: aggregates for the placement timeline queries (plan §PC8b):
 * funnel-over-time, median time-to-placement, and active duration.
 *
 * <p>A null aggregate means "no qualifying data" — never 0. Every query
 * EXCLUDES rows whose relevant timestamps are NULL instead of coercing them
 * to epoch, so an empty sample stays null rather than fabricating a zero
 * (backfill policy: "never invent a date").
 */
public record PlacementTimelineDto(
        List<MonthFunnel> funnel,
        Double medianTimeToPlacementDays,
        long timeToPlacementSample,
        Double averageActiveDurationDays,
        long activeDurationSample) {

    /**
     * Counts for one calendar month (ISO {@code yyyy-MM}). Months with no
     * events at all are omitted — the chart zero-fills display-side.
     */
    public record MonthFunnel(String month, long offered, long assigned, long started, long completed) {
    }
}
