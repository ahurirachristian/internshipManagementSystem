package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/**
 * Phase 1 baseline (opportunity plan §8.2, step S1.5).
 *
 * <p>The history table is the answer to "why is this advert in my feed", so it records
 * how a relay decision was reached rather than where the advert ended up. Two
 * properties are worth pinning, and one of them is unusual enough to look like a
 * defect.
 *
 * <p><b>The trail outlives the vocabulary.</b> {@code fromStatus} and {@code toStatus}
 * are {@code String}, copied from {@code PlacementStatusHistory}, and
 * {@link #aRetiredStatusStillReadsBack()} is the test that would fail if somebody
 * "tidied" these into an enum. A retired status name still has to render in the S8.2
 * history view; an enum cannot store a value it no longer defines, so the tidied
 * version would either refuse to insert the row and lose a real decision, or map an
 * old value onto a current one and quietly rewrite what happened.
 *
 * <p><b>The trail is append-only and ordered.</b>
 * {@link #theTrailReadsBackInTheOrderTheDecisionsHappened()} pins the ordering, because
 * a history view that sorts by insertion id instead of time would show a relay
 * backwards to anyone auditing it.
 */
@SpringBootTest
@Transactional
class OpportunityStatusHistoryRepositoryTest {

    @Autowired
    private OpportunityStatusHistoryRepository historyRepository;

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private EntityManager entityManager;

    private Long vacancyId() {
        return vacancyRepository.save(new Vacancy("An audited advert", "A description of the role",
                42L, "Kampala", "Some requirements", "OPEN",
                LocalDate.now().plusMonths(2), LocalDate.now())).getId();
    }

    private OpportunityStatusHistory entry(Long vacancyId, Long universityId, String relayType,
            String fromStatus, String toStatus, Long changedBy, LocalDateTime changedAt) {
        OpportunityStatusHistory entry = new OpportunityStatusHistory();
        entry.setVacancyId(vacancyId);
        entry.setUniversityId(universityId);
        entry.setRelayType(relayType);
        entry.setFromStatus(fromStatus);
        entry.setToStatus(toStatus);
        entry.setChangedBy(changedBy);
        // Only overwritten when a test needs a specific moment. Passing null through
        // to the setter would replace the default with null and trip NOT NULL — the
        // entity behaving correctly, since the stamp is not the caller's to clear.
        if (changedAt != null) {
            entry.setChangedAt(changedAt);
        }
        return entry;
    }

    // --- Defaults -------------------------------------------------------------

    @Test
    void aNewEntryIsStampedNow() {
        OpportunityStatusHistory saved = historyRepository.save(
                entry(vacancyId(), null, null, null, "PUBLISHED", 1L, null));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getChangedAt()).isNotNull();
    }

    @Test
    void anAdvertLevelEntryCarriesNoUniversityAndNoRelay() {
        // null university + null relayType is how a row says "this was about the
        // advert itself". Collapsing either into a default would make an advert-level
        // verification look like it belonged to some university.
        OpportunityStatusHistory saved = historyRepository.save(
                entry(vacancyId(), null, null, "PENDING_REVIEW", "PUBLISHED", 1L, null));

        assertThat(saved.getUniversityId()).isNull();
        assertThat(saved.getRelayType()).isNull();
        assertThat(saved.getFromStatus()).isEqualTo("PENDING_REVIEW");
        assertThat(saved.getToStatus()).isEqualTo("PUBLISHED");
    }

    @Test
    void theFirstTransitionHasNoPredecessor() {
        // fromStatus null is meaningful, so it must not be defaulted to something like
        // "NEW" that the enum never defined.
        OpportunityStatusHistory saved = historyRepository.save(
                entry(vacancyId(), null, null, null, "PENDING_REVIEW", 1L, null));

        assertThat(saved.getFromStatus()).isNull();
        assertThat(saved.getToStatus()).isEqualTo("PENDING_REVIEW");
    }

    // --- The vocabulary test --------------------------------------------------

    @Test
    void aRetiredStatusStillReadsBack() {
        // Nothing in the current vocabulary says WITHDRAWN_BY_PARTNER. If these columns
        // were an enum, this row could not be written at all — and it is exactly the
        // kind of row the trail exists to keep. If this test starts failing after
        // S1.7, that is the enum creeping into the history table, not the test being
        // wrong.
        OpportunityStatusHistory entry = entry(vacancyId(), 10L,
                OpportunityStatusHistory.RELAY_OFFER, "OFFERED", "WITHDRAWN_BY_PARTNER",
                5L, LocalDateTime.now().withNano(0));

        Long id = historyRepository.saveAndFlush(entry).getId();
        entityManager.clear();
        OpportunityStatusHistory reloaded = historyRepository.findById(id).orElseThrow();

        assertThat(reloaded.getFromStatus()).isEqualTo("OFFERED");
        assertThat(reloaded.getToStatus()).isEqualTo("WITHDRAWN_BY_PARTNER");
    }

    // --- Ordering and scoping -------------------------------------------------

    @Test
    void theTrailReadsBackInTheOrderTheDecisionsHappened() {
        Long vacancyId = vacancyId();
        LocalDateTime base = LocalDateTime.now().withNano(0).minusDays(1);

        // Deliberately saved out of chronological order: verification, then the offer,
        // then the response. If the finder fell back to insertion order this would
        // come back reversed and read as a relay nobody made.
        historyRepository.saveAndFlush(entry(vacancyId, 10L,
                OpportunityStatusHistory.RELAY_OFFER, "OFFERED", "ACCEPTED", 4L, base.plusHours(2)));
        historyRepository.saveAndFlush(entry(vacancyId, null, null,
                "PENDING_REVIEW", "PUBLISHED", 1L, base));
        historyRepository.saveAndFlush(entry(vacancyId, 11L,
                OpportunityStatusHistory.RELAY_OFFER, "OFFERED", "DECLINED", 5L, base.plusHours(3)));
        entityManager.clear();

        List<OpportunityStatusHistory> trail =
                historyRepository.findByVacancyIdOrderByChangedAtAsc(vacancyId);

        assertThat(trail).hasSize(3);
        assertThat(trail.get(0).getToStatus()).isEqualTo("PUBLISHED");
        assertThat(trail.get(1).getToStatus()).isEqualTo("ACCEPTED");
        assertThat(trail.get(2).getToStatus()).isEqualTo("DECLINED");
    }

    @Test
    void oneAdvertKeepsEveryUniversitysInvolvementInASingleTrail() {
        // The chain, as §5.10 describes it: one advert, several universities, one
        // history. Splitting these per university would make "how did this get here"
        // unanswerable.
        Long vacancyId = vacancyId();
        historyRepository.saveAndFlush(entry(vacancyId, null, null, "PENDING_REVIEW", "PUBLISHED", 1L, null));
        historyRepository.saveAndFlush(entry(vacancyId, 10L,
                OpportunityStatusHistory.RELAY_OFFER, "OFFERED", "ACCEPTED", 2L, null));
        historyRepository.saveAndFlush(entry(vacancyId, 10L,
                OpportunityStatusHistory.RELAY_SHARE, "ACCEPTED", "SHARED", 3L, null));
        historyRepository.saveAndFlush(entry(vacancyId, 11L,
                OpportunityStatusHistory.RELAY_OFFER, "OFFERED", "DECLINED", 4L, null));
        entityManager.clear();

        assertThat(historyRepository.findByVacancyIdOrderByChangedAtAsc(vacancyId)).hasSize(4);
    }

    @Test
    void oneUniversitysInvolvementCanBeReadOnItsOwn() {
        Long vacancyId = vacancyId();
        historyRepository.saveAndFlush(entry(vacancyId, 10L,
                OpportunityStatusHistory.RELAY_OFFER, "OFFERED", "ACCEPTED", 2L, null));
        historyRepository.saveAndFlush(entry(vacancyId, 10L,
                OpportunityStatusHistory.RELAY_SHARE, "ACCEPTED", "SHARED", 3L, null));
        historyRepository.saveAndFlush(entry(vacancyId, 11L,
                OpportunityStatusHistory.RELAY_OFFER, "OFFERED", "DECLINED", 4L, null));
        entityManager.clear();

        // What a university sees about its own advert — [H9]'s read side.
        List<OpportunityStatusHistory> mine = historyRepository
                .findByVacancyIdAndUniversityIdOrderByChangedAtAsc(vacancyId, 10L);

        assertThat(mine).hasSize(2);
        assertThat(mine).allMatch(row -> row.getUniversityId().equals(10L));
    }

    @Test
    void oneRelayTypeCanBeIsolatedFromTheRest() {
        // Lets S8.2 answer "was this ever offered anywhere?" without walking the whole
        // trail, and keeps the offer history legible separately from the share history.
        Long vacancyId = vacancyId();
        historyRepository.saveAndFlush(entry(vacancyId, 10L,
                OpportunityStatusHistory.RELAY_OFFER, "OFFERED", "ACCEPTED", 2L, null));
        historyRepository.saveAndFlush(entry(vacancyId, 10L,
                OpportunityStatusHistory.RELAY_SHARE, "ACCEPTED", "SHARED", 3L, null));
        entityManager.clear();

        List<OpportunityStatusHistory> offers = historyRepository
                .findByVacancyIdAndRelayTypeOrderByChangedAtAsc(vacancyId,
                        OpportunityStatusHistory.RELAY_OFFER);

        assertThat(offers).hasSize(1);
        assertThat(offers.get(0).getToStatus()).isEqualTo("ACCEPTED");
    }

    @Test
    void anAdvertWithNoDecisionsHasAnEmptyTrail() {
        assertThat(historyRepository.findByVacancyIdOrderByChangedAtAsc(vacancyId())).isEmpty();
    }

    // --- Round trip -----------------------------------------------------------

    @Test
    void everyColumnRoundTrips() {
        OpportunityStatusHistory row = entry(vacancyId(), 10L,
                OpportunityStatusHistory.RELAY_SUBMISSION, "PENDING", "APPROVED",
                3L, LocalDateTime.now().withNano(0));

        Long id = historyRepository.saveAndFlush(row).getId();
        entityManager.clear();
        OpportunityStatusHistory reloaded = historyRepository.findById(id).orElseThrow();

        assertThat(reloaded.getVacancyId()).isEqualTo(row.getVacancyId());
        assertThat(reloaded.getUniversityId()).isEqualTo(10L);
        assertThat(reloaded.getRelayType()).isEqualTo(OpportunityStatusHistory.RELAY_SUBMISSION);
        assertThat(reloaded.getFromStatus()).isEqualTo("PENDING");
        assertThat(reloaded.getToStatus()).isEqualTo("APPROVED");
        assertThat(reloaded.getChangedAt()).isNotNull();
        assertThat(reloaded.getChangedBy()).isEqualTo(3L);
    }
}
