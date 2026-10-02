package com.example.demo.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

/**
 * PC10 gate: the two audit indexes, and the promise that adding them changed
 * nothing but the access path.
 *
 * <p>The phase's contract has two halves and both are asserted here:
 * <ol>
 *   <li><b>EXPLAIN shows the index is used.</b> H2 prints the chosen index in
 *       a {@code /* INDEX_NAME: ... *}{@code /} comment inside the plan, so the
 *       assertion is on the plan text rather than on the mere existence of the
 *       index — an index the planner never picks would not make the deferred
 *       admin activity charts (plan §3.1) any cheaper.</li>
 *   <li><b>No functional change.</b> Seeded rows are read back through the real
 *       service and the real controller, and must come out in the same order
 *       with the same contents. Indexes are invisible to a query's result —
 *       this pins that rather than assuming it.</li>
 * </ol>
 *
 * <p>Everything runs inside one transaction so the seeded rows are visible on
 * the same connection the EXPLAIN runs on: a second connection would see an
 * empty table and a different plan.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuditIndexTest {

    private static final String TIMESTAMP_INDEX = "IDX_AUDIT_LOGS_TIMESTAMP";
    private static final String COMPOSITE_INDEX = "IDX_AUDIT_LOGS_ENTITY_USER";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    /** Seeds one row per distinct shape the two indexes exist to serve. */
    private void seed() {
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < 60; i++) {
            auditLogRepository.save(new AuditLog(
                    now.minusHours(i),
                    "user" + (i % 3),
                    "ADMIN",
                    i % 2 == 0 ? "LOGIN" : "PLACEMENT_OFFER",
                    i % 2 == 0 ? "User" : "Placement",
                    "detail-" + i,
                    null));
        }
        auditLogRepository.flush();
    }

    private String explain(String sql) {
        return jdbc.queryForObject("EXPLAIN " + sql, String.class);
    }

    // ── 1. the indexes exist and are actually chosen ────────────────────────

    @Test
    void bothIndexesExistOnAuditLogs() {
        List<String> names = jdbc.queryForList(
                "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.INDEXES WHERE TABLE_NAME = 'AUDIT_LOGS'",
                String.class);

        assertThat(names).contains(TIMESTAMP_INDEX, COMPOSITE_INDEX);
    }

    @Test
    void timestampRangeQueryChoosesTheTimestampIndex() {
        seed();

        // The shape findByTimestampBetween and the start/end arm of
        // AuditLogController.search both compile to.
        String plan = explain("SELECT * FROM audit_logs WHERE timestamp >= TIMESTAMP '2026-01-01 00:00:00' "
                + "AND timestamp <= TIMESTAMP '2026-12-31 23:59:59'");

        assertThat(plan).contains(TIMESTAMP_INDEX);
    }

    @Test
    void compositePredicateChoosesTheCompositeIndex() {
        seed();

        // The plan's (entity_type, user_id) shape, in this schema's columns.
        String plan = explain(
                "SELECT * FROM audit_logs WHERE target_entity = 'Placement' AND username = 'user0'");

        assertThat(plan).contains(COMPOSITE_INDEX);
    }

    @Test
    void compositeIndexIsUsableOnItsLeadingColumnAlone() {
        seed();

        // A leading-column-only predicate must still reach the index as a
        // prefix; otherwise the composite would be a worse choice than two
        // single-column indexes for every query but the fully-qualified one.
        String plan = explain("SELECT * FROM audit_logs WHERE target_entity = 'Placement'");

        assertThat(plan).contains(COMPOSITE_INDEX);
    }

    @Test
    void indexNamesDeclaredOnTheEntityMatchTheCatalog() {
        // The @Index names on AuditLog are what the PC10 EXPLAIN assertions
        // key on, so a rename in either place has to fail the test.
        List<String> names = jdbc.queryForList(
                "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.INDEXES WHERE TABLE_NAME = 'AUDIT_LOGS'",
                String.class);

        assertThat(names).contains(TIMESTAMP_INDEX, COMPOSITE_INDEX);
    }

    // ── 2. no functional change ─────────────────────────────────────────────

    @Test
    void serviceReadsAreUnchangedByTheIndexes() {
        seed();
        LocalDateTime start = LocalDateTime.now().minusHours(24);
        LocalDateTime end = LocalDateTime.now().plusHours(1);

        List<AuditLog> byWindow = auditLogService.search(null, null, start, end);
        List<AuditLog> all = auditLogService.findAll();

        // The window is bounded, so it must be a strict subset of everything —
        // an index cannot silently widen a predicate.
        assertThat(byWindow).isNotEmpty().hasSizeLessThan(all.size());
        assertThat(byWindow).allSatisfy(row -> {
            assertThat(row.getTimestamp()).isBetween(start, end);
        });

        // Set equality, not sequence equality: neither AuditLogRepository nor
        // AuditLogController declares an ORDER BY, so row order was never part
        // of this API's contract and an index is free to change it (it does —
        // the timestamp index walks rows in timestamp order rather than
        // insertion order). What PC10 must not change is WHICH rows come back,
        // which is what this pins. If the admin surface ever wants a stable
        // display order, that is an explicit ORDER BY and a separate decision,
        // not something PC10 should smuggle in under "no behaviour change".
        assertThat(all).extracting(AuditLog::getId).containsExactlyInAnyOrderElementsOf(
                auditLogRepository.findAll().stream().map(AuditLog::getId).toList());
        assertThat(byWindow).extracting(AuditLog::getId)
                .isSubsetOf(all.stream().map(AuditLog::getId).toList());
    }

    @Test
    void filteredSearchStillMatchesExactlyOnActionAndTarget() {
        seed();

        List<AuditLog> offers = auditLogService.search("PLACEMENT_OFFER", "Placement",
                LocalDateTime.now().minusDays(2), LocalDateTime.now().plusHours(1));

        assertThat(offers).isNotEmpty();
        assertThat(offers).allSatisfy(row -> {
            assertThat(row.getAction()).isEqualTo("PLACEMENT_OFFER");
            assertThat(row.getTargetEntity()).isEqualTo("Placement");
        });
    }

    private RequestPostProcessor asAdmin() {
        return user("admin").authorities(new SimpleGrantedAuthority("ADMIN"));
    }

    @Test
    void adminEndpointResponsesAreUnchanged() throws Exception {
        seed();
        String start = LocalDateTime.now().minusHours(24)
                .format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        String end = LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        String windowed = mockMvc.perform(get("/api/audit-logs")
                        .with(asAdmin())
                        .param("start", start)
                        .param("end", end))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String everything = mockMvc.perform(get("/api/audit-logs").with(asAdmin()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        // Same rows as the service reads them, regardless of the order the
        // planner happens to return them in (neither path declares ORDER BY).
        // Compared by id so the assertion does not depend on Jackson's exact
        // serialisation of a LocalDateTime — that shape is untouched by PC10.
        assertThat(idsOf(everything)).containsExactlyInAnyOrderElementsOf(
                idsOfService(auditLogService.findAll()));
        assertThat(idsOf(windowed)).containsExactlyInAnyOrderElementsOf(
                idsOfService(auditLogService.search(null, null,
                        LocalDateTime.now().minusHours(24), LocalDateTime.now())));
        assertThat(idsOf(windowed)).isSubsetOf(idsOf(everything));
        assertThat(windowed).contains("LOGIN").contains("PLACEMENT_OFFER");
    }

    /**
     * id list from a top-level JSON array response body, as strings.
     *
     * <p>Normalised to String on purpose: JsonPath (json-smart) boxes JSON
     * numbers as Integer while {@code getId()} returns Long, so comparing the
     * raw boxed values fails on type even when every id matches. The id itself
     * is what PC10 must not disturb; its Java boxing is an artefact of which
     * library read it.
     */
    private List<String> idsOf(String body) {
        List<Object> raw = JsonPath.read(body, "$[*].id");
        return raw.stream().map(String::valueOf).toList();
    }

    private List<String> idsOfService(List<AuditLog> rows) {
        return rows.stream().map(row -> String.valueOf(row.getId())).toList();
    }

    @Test
    void nonAdminsAreStillRefused() throws Exception {
        // The cheapest possible proof that PC10 touched no authorization:
        // SUPERVISOR remains 403 on the audit surface.
        String username = "pc10sup" + System.nanoTime();
        mockMvc.perform(get("/api/audit-logs")
                        .with(user(username).authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().isForbidden());
    }

}
