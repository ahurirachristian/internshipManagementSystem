package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/**
 * Phase 1 baseline (opportunity plan §8.2, step S1.3).
 *
 * <p>The share row is the hop a student actually experiences, so it is the row
 * where a subtle mistake becomes a privacy problem rather than a display glitch.
 * Three things are pinned here that nothing else would catch.
 *
 * <p><b>The feed filter.</b> {@link #theStudentFeedOnlyEverReturnsLiveShares()} is the
 * one that matters. {@code findByUniversityIdAndStatusOrderBySharedAtDesc} is the
 * only query the student feed uses, and a {@code CLOSED} share leaking out of it
 * means an advert a university deliberately withdrew keeps sitting in front of
 * students. This asserts the status is part of the query, not left to the caller.
 *
 * <p><b>The narrowing invariant.</b> The targeting columns are duplicated onto the
 * share so a university can narrow the audience on the way down. That only works if
 * the share keeps its own copy rather than reading the advert's — hence
 * {@link #targetingOnAShareIsIndependentOfTheAdvertItNarrows()}. The comparison
 * itself ("may this share widen beyond its offer?") belongs to S6.3; this test
 * only establishes that both sides of that comparison are readable.
 *
 * <p><b>Null offerId means something.</b> {@code offerId} is null when the university
 * sourced the advert itself (R5) or approved a supervisor's submission (R6). That is
 * not a missing value, it is the record that no super admin was involved — so
 * {@link #aSelfSourcedShareHasNoOffer()} pins it, because "fill in the foreign key
 * to satisfy a NOT NULL someone added later" would quietly assert super-admin
 * involvement that never happened.
 */
@SpringBootTest
@Transactional
class OpportunityShareRepositoryTest {

    @Autowired
    private OpportunityShareRepository shareRepository;

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private EntityManager entityManager;

    private Long vacancyId() {
        return vacancyRepository.save(new Vacancy("A shared role", "A description of the role",
                42L, "Kampala", "Some requirements", "OPEN",
                LocalDate.now().plusMonths(2), LocalDate.now())).getId();
    }

    /**
     * Leaves {@code status} at its {@code SHARED} default rather than setting it: a
     * share's status is decided by the transition service, not by whoever creates
     * the row, and an explicit null would only trip NOT NULL.
     */
    private OpportunityShare share(Long vacancyId, long universityId) {
        OpportunityShare share = new OpportunityShare();
        share.setVacancyId(vacancyId);
        share.setUniversityId(universityId);
        share.setSharedBy(1L);
        return share;
    }

    private OpportunityShare share(Long vacancyId, long universityId, String status) {
        OpportunityShare share = share(vacancyId, universityId);
        share.setStatus(status);
        return share;
    }

    // --- Defaults -------------------------------------------------------------

    @Test
    void aNewShareIsLiveAndStamped() {
        OpportunityShare saved = shareRepository.save(share(vacancyId(), 10L));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(OpportunityShare.SHARED);
        assertThat(saved.getSharedAt()).isNotNull();
    }

    @Test
    void aNewShareIsNotClosedAndHasNoOffer() {
        OpportunityShare saved = shareRepository.save(share(vacancyId(), 10L));

        assertThat(saved.getOfferId()).isNull();
        assertThat(saved.getClosedAt()).isNull();
        assertThat(saved.getClosedBy()).isNull();
    }

    @Test
    void aNewShareCarriesNoTargetingOfItsOwn() {
        // Absent targeting on the share must stay absent rather than defaulting to a
        // wildcard: "not narrowed" and "narrowed to everything" are different claims,
        // and S6.3 has to be able to tell them apart.
        OpportunityShare saved = shareRepository.save(share(vacancyId(), 10L));

        assertThat(saved.getTargetProgrammeIds()).isNull();
        assertThat(saved.getTargetDepartmentIds()).isNull();
        assertThat(saved.getTargetYearOfStudy()).isNull();
    }

    // --- The feed filter -------------------------------------------------------

    @Test
    void theStudentFeedOnlyEverReturnsLiveShares() {
        Long vacancyId = vacancyId();
        // Two adverts, one university, both shares belonging to university 10 on
        // purpose. A withdrawn share at some other university would be filtered out by
        // universityId alone, so this test would look like it proved something about
        // status while proving nothing. Two adverts because the unique constraint
        // rightly forbids sharing one advert to a university twice.
        shareRepository.saveAndFlush(share(vacancyId(), 10L));

        OpportunityShare closed = shareRepository.saveAndFlush(share(vacancyId(), 10L));
        closed.setStatus(OpportunityShare.CLOSED);
        closed.setClosedAt(LocalDateTime.now().withNano(0));
        closed.setClosedBy(2L);
        shareRepository.flush();

        List<OpportunityShare> feed = shareRepository
                .findByUniversityIdAndStatusOrderBySharedAtDesc(10L, OpportunityShare.SHARED);

        // This university has one live advert and one withdrawn one. Exactly one is in
        // the feed. If this returns 2, a withdrawn advert is in a student's feed.
        assertThat(feed).hasSize(1);
        assertThat(feed.get(0).getStatus()).isEqualTo(OpportunityShare.SHARED);
    }

    @Test
    void theFeedOfOneUniversityNeverContainsAnothers() {
        // [H2] in miniature, and the reason the finder takes universityId at all.
        shareRepository.saveAndFlush(share(vacancyId(), 10L));
        shareRepository.saveAndFlush(share(vacancyId(), 11L));

        List<OpportunityShare> mine = shareRepository
                .findByUniversityIdAndStatusOrderBySharedAtDesc(10L, OpportunityShare.SHARED);

        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).getUniversityId()).isEqualTo(10L);
    }

    @Test
    void anUnfilteredListingStillExistsForUniversityDashboards() {
        // Deliberately status-free: a university supervisor's own view should still
        // list withdrawn shares, otherwise they lose the record of what they pulled.
        shareRepository.saveAndFlush(share(vacancyId(), 10L));
        OpportunityShare closed = shareRepository.saveAndFlush(share(vacancyId(), 11L));
        closed.setStatus(OpportunityShare.CLOSED);
        shareRepository.flush();

        assertThat(shareRepository.findByUniversityIdOrderBySharedAtDesc(10L)).hasSize(1);
    }

    // --- Uniqueness -----------------------------------------------------------

    @Test
    void theSchemaRejectsASecondShareOfTheSameAdvertToTheSameUniversity() {
        // Saved directly, bypassing existsByVacancyIdAndUniversityId, so only the
        // constraint can catch it. Two live shares would put one advert in one
        // university's student feed twice.
        Long vacancyId = vacancyId();
        shareRepository.saveAndFlush(share(vacancyId, 10L));

        assertThatThrownBy(() -> shareRepository.saveAndFlush(share(vacancyId, 10L)))
                .isInstanceOf(DataIntegrityViolationException.class);

        // A rejected insert poisons the Hibernate session; clearing recovers it.
        entityManager.clear();
        assertThat(shareRepository.count()).isEqualTo(1);
    }

    @Test
    void theSameAdvertMayBeSharedWithManyUniversities() {
        Long vacancyId = vacancyId();
        shareRepository.saveAndFlush(share(vacancyId, 10L));
        shareRepository.saveAndFlush(share(vacancyId, 11L));
        shareRepository.saveAndFlush(share(vacancyId, 12L));

        assertThat(shareRepository.findByVacancyId(vacancyId)).hasSize(3);
    }

    // --- Narrowing ------------------------------------------------------------

    @Test
    void targetingOnAShareIsIndependentOfTheAdvertItNarrows() {
        Long vacancyId = vacancyId();
        Vacancy advert = vacancyRepository.findById(vacancyId).orElseThrow();
        advert.setTargetProgrammeIds("1,2,3,4,5");
        advert.setTargetDepartmentIds("7,8");
        advert.setTargetYearOfStudy("2,3,4");
        vacancyRepository.saveAndFlush(advert);

        OpportunityShare narrowed = share(vacancyId, 10L);
        narrowed.setTargetProgrammeIds("3");
        narrowed.setTargetYearOfStudy("3");
        Long id = shareRepository.saveAndFlush(narrowed).getId();

        entityManager.clear();
        OpportunityShare reloaded = shareRepository.findById(id).orElseThrow();
        Vacancy reloadedAdvert = vacancyRepository.findById(vacancyId).orElseThrow();

        // Both sides survive independently, which is what lets S6.3 ask "is this
        // share wider than what it was offered?" at all.
        assertThat(reloaded.getTargetProgrammeIds()).isEqualTo("3");
        assertThat(reloaded.getTargetYearOfStudy()).isEqualTo("3");
        // Department ids were not narrowed, so the share leaves them unset rather than
        // copying the advert's — "not narrowed" is not "narrowed to everything".
        assertThat(reloaded.getTargetDepartmentIds()).isNull();
        assertThat(reloadedAdvert.getTargetProgrammeIds()).isEqualTo("1,2,3,4,5");
        assertThat(reloadedAdvert.getTargetDepartmentIds()).isEqualTo("7,8");
    }

    @Test
    void aSelfSourcedShareHasNoOffer() {
        // R5: the university found the advert itself, so there is no offer to
        // descend from. A fabricated offerId here would claim a super admin approved
        // something they never saw.
        OpportunityShare selfSourced = share(vacancyId(), 10L);
        selfSourced.setNote("Sourced from a partner NGO.");

        OpportunityShare reloaded = shareRepository.findById(
                shareRepository.saveAndFlush(selfSourced).getId()).orElseThrow();

        assertThat(reloaded.getOfferId()).isNull();
        assertThat(reloaded.getNote()).isEqualTo("Sourced from a partner NGO.");
    }

    @Test
    void aShareRemembersTheOfferThatAuthorisedIt() {
        Long offerId = 77L;
        OpportunityShare fromOffer = share(vacancyId(), 10L);
        fromOffer.setOfferId(offerId);

        Long id = shareRepository.saveAndFlush(fromOffer).getId();
        entityManager.clear();

        assertThat(shareRepository.findById(id).orElseThrow().getOfferId()).isEqualTo(offerId);
        assertThat(shareRepository.findByOfferId(offerId)).hasSize(1);
    }

    // --- Round trip -----------------------------------------------------------

    @Test
    void everyColumnRoundTrips() {
        OpportunityShare row = share(vacancyId(), 10L, OpportunityShare.CLOSED);
        row.setOfferId(5L);
        row.setNote("Shared to third years only.");
        row.setTargetProgrammeIds("11,12");
        row.setTargetDepartmentIds("21");
        row.setTargetYearOfStudy("3");
        row.setClosedAt(LocalDateTime.now().withNano(0));
        row.setClosedBy(42L);

        Long id = shareRepository.saveAndFlush(row).getId();
        entityManager.clear();
        OpportunityShare reloaded = shareRepository.findById(id).orElseThrow();

        assertThat(reloaded.getVacancyId()).isEqualTo(row.getVacancyId());
        assertThat(reloaded.getUniversityId()).isEqualTo(10L);
        assertThat(reloaded.getOfferId()).isEqualTo(5L);
        assertThat(reloaded.getStatus()).isEqualTo(OpportunityShare.CLOSED);
        assertThat(reloaded.getNote()).isEqualTo("Shared to third years only.");
        assertThat(reloaded.getSharedBy()).isEqualTo(1L);
        assertThat(reloaded.getSharedAt()).isNotNull();
        assertThat(reloaded.getTargetProgrammeIds()).isEqualTo("11,12");
        assertThat(reloaded.getTargetDepartmentIds()).isEqualTo("21");
        assertThat(reloaded.getTargetYearOfStudy()).isEqualTo("3");
        assertThat(reloaded.getClosedAt()).isNotNull();
        assertThat(reloaded.getClosedBy()).isEqualTo(42L);
    }

    @Test
    void existenceIsAnswerableForTheDuplicateShareCheck() {
        Long vacancyId = vacancyId();
        assertThat(shareRepository.existsByVacancyIdAndUniversityId(vacancyId, 10L)).isFalse();

        shareRepository.saveAndFlush(share(vacancyId, 10L));

        assertThat(shareRepository.existsByVacancyIdAndUniversityId(vacancyId, 10L)).isTrue();
        assertThat(shareRepository.existsByVacancyIdAndUniversityId(vacancyId, 11L)).isFalse();
    }

    @Test
    void aLookupByVacancyAndUniversityFindsTheShare() {
        Long vacancyId = vacancyId();
        shareRepository.saveAndFlush(share(vacancyId, 10L));

        assertThat(shareRepository.findByVacancyIdAndUniversityId(vacancyId, 10L)).isPresent();
        assertThat(shareRepository.findByVacancyIdAndUniversityId(vacancyId, 11L)).isEmpty();
    }
}
