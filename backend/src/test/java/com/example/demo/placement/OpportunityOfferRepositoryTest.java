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
 * Phase 1 baseline (opportunity plan §8.2, step S1.2).
 *
 * <p>The offer row is the super-admin-to-university hop, and the only part of it
 * with real teeth is the uniqueness rule. {@code (vacancy_id, university_id)}
 * means a super admin who double-clicks "offer", or two super admins working at
 * once, cannot create two live offers to the same university for the same advert
 * — which would put the advert in that university's inbox twice and leave two
 * independently answerable copies of the same question.
 *
 * <p>{@link #theSchemaRejectsASecondOfferToTheSameUniversity()} is the assertion
 * that matters, and it has to be proven against the database rather than against
 * {@code existsByVacancyIdAndUniversityId}. The service at S5.1 will check first
 * and return a 409, but a check-then-insert is a race: without the constraint
 * underneath it, two concurrent requests both see "no existing offer" and both
 * insert. This test deliberately skips the repository helper and saves directly,
 * so it fails if the constraint is ever dropped.
 */
@SpringBootTest
@Transactional
class OpportunityOfferRepositoryTest {

    @Autowired
    private OpportunityOfferRepository offerRepository;

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private EntityManager entityManager;

    private Long vacancyId() {
        Vacancy vacancy = new Vacancy("An offered role", "A description of the role",
                42L, "Kampala", "Some requirements", "OPEN",
                LocalDate.now().plusMonths(2), LocalDate.now());
        return vacancyRepository.save(vacancy).getId();
    }

    /**
     * Leaves {@code status} at its field default rather than setting it. A
     * {@code setStatus(null)} would overwrite {@code status = OFFERED} with null
     * and hit a NOT NULL violation, which is the entity behaving correctly — the
     * status of an offer is decided by the transition service, never by a caller
     * that has not decided yet.
     */
    private OpportunityOffer offer(Long vacancyId, long universityId) {
        OpportunityOffer offer = new OpportunityOffer();
        offer.setVacancyId(vacancyId);
        offer.setUniversityId(universityId);
        offer.setOfferedBy(1L);
        return offer;
    }

    private OpportunityOffer offer(Long vacancyId, long universityId, String status) {
        OpportunityOffer offer = offer(vacancyId, universityId);
        offer.setStatus(status);
        return offer;
    }

    // --- Defaults -------------------------------------------------------------

    @Test
    void aNewOfferIsOfferedAndStamped() {
        OpportunityOffer saved = offerRepository.save(offer(vacancyId(), 10L));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(OpportunityOffer.OFFERED);
        assertThat(saved.getOfferedAt()).isNotNull();
    }

    @Test
    void aNewOfferHasNoResponseYet() {
        // responded_* being null is how the inbox tells "still awaiting an answer"
        // from "answered", so it must not be defaulted to anything.
        OpportunityOffer saved = offerRepository.save(offer(vacancyId(), 10L));

        assertThat(saved.getRespondedBy()).isNull();
        assertThat(saved.getRespondedAt()).isNull();
        assertThat(saved.getResponseNote()).isNull();
    }

    @Test
    void theSchemaRejectsASecondOfferToTheSameUniversity() {
        // Saved directly, deliberately bypassing existsByVacancyIdAndUniversityId,
        // so only the unique constraint can catch this.
        Long vacancyId = vacancyId();
        offerRepository.saveAndFlush(offer(vacancyId, 10L));

        assertThatThrownBy(() -> {
            offerRepository.saveAndFlush(offer(vacancyId, 10L));
        }).isInstanceOf(DataIntegrityViolationException.class);

        // The rejected insert poisons the Hibernate session, which then refuses to
        // flush again ("entry has a null identifier"). Clearing recovers it, and the
        // count is what proves the duplicate was refused rather than merely reported.
        entityManager.clear();
        assertThat(offerRepository.count()).isEqualTo(1);
    }

    @Test
    void theSameAdvertMayBeOfferedToManyUniversities() {
        // The other direction, and the one that keeps R3 a broadcast rather than a
        // single hand-off: the constraint must not collapse into "one advert, one
        // university".
        Long vacancyId = vacancyId();
        offerRepository.saveAndFlush(offer(vacancyId, 10L));
        offerRepository.saveAndFlush(offer(vacancyId, 11L));
        offerRepository.saveAndFlush(offer(vacancyId, 12L));

        assertThat(offerRepository.findByVacancyId(vacancyId)).hasSize(3);
    }

    @Test
    void theSameUniversityMayHoldOffersForDifferentAdverts() {
        offerRepository.saveAndFlush(offer(vacancyId(), 10L));
        offerRepository.saveAndFlush(offer(vacancyId(), 10L));

        assertThat(offerRepository.findByUniversityIdOrderByOfferedAtDesc(10L)).hasSize(2);
    }

    // --- Round trip -----------------------------------------------------------

    @Test
    void everyColumnRoundTrips() {
        OpportunityOffer row = offer(vacancyId(), 10L, OpportunityOffer.ACCEPTED);
        row.setNote("Strong programme in software engineering.");
        row.setRespondedBy(99L);
        row.setRespondedAt(LocalDateTime.now().withNano(0));
        row.setResponseNote("We will run it next intake.");

        Long id = offerRepository.saveAndFlush(row).getId();
        entityManager.clear();
        OpportunityOffer reloaded = offerRepository.findById(id).orElseThrow();

        assertThat(reloaded.getVacancyId()).isEqualTo(row.getVacancyId());
        assertThat(reloaded.getUniversityId()).isEqualTo(10L);
        assertThat(reloaded.getStatus()).isEqualTo(OpportunityOffer.ACCEPTED);
        assertThat(reloaded.getNote()).isEqualTo("Strong programme in software engineering.");
        assertThat(reloaded.getOfferedBy()).isEqualTo(1L);
        assertThat(reloaded.getOfferedAt()).isNotNull();
        assertThat(reloaded.getRespondedBy()).isEqualTo(99L);
        assertThat(reloaded.getRespondedAt()).isNotNull();
        assertThat(reloaded.getResponseNote()).isEqualTo("We will run it next intake.");
    }

    @Test
    void aUniversitySeesOnlyItsOwnOffers() {
        offerRepository.saveAndFlush(offer(vacancyId(), 10L));
        offerRepository.saveAndFlush(offer(vacancyId(), 11L));

        // The query the S5.2 inbox depends on: [H9] lives or dies here, since a
        // finder that ignored universityId would hand one university another's
        // adverts.
        List<OpportunityOffer> mine = offerRepository.findByUniversityIdOrderByOfferedAtDesc(10L);
        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).getUniversityId()).isEqualTo(10L);
    }

    @Test
    void offersCanBeFilteredByVacancyAndStatus() {
        Long vacancyId = vacancyId();
        offerRepository.saveAndFlush(offer(vacancyId, 10L, OpportunityOffer.OFFERED));
        offerRepository.saveAndFlush(offer(vacancyId, 11L, OpportunityOffer.ACCEPTED));

        // S5.1 refuses to offer a non-PUBLISHED advert, and S6.1 gates sharing on
        // ACCEPTED — both need to separate these two.
        assertThat(offerRepository.findByVacancyIdAndStatus(vacancyId, OpportunityOffer.OFFERED))
                .hasSize(1);
        assertThat(offerRepository.findByVacancyIdAndStatus(vacancyId, OpportunityOffer.ACCEPTED))
                .hasSize(1);
        assertThat(offerRepository.findByVacancyIdAndStatus(vacancyId, OpportunityOffer.DECLINED))
                .isEmpty();
    }

    @Test
    void existenceIsAnswerableForTheDuplicateOfferCheck() {
        Long vacancyId = vacancyId();
        assertThat(offerRepository.existsByVacancyIdAndUniversityId(vacancyId, 10L)).isFalse();

        offerRepository.saveAndFlush(offer(vacancyId, 10L));

        assertThat(offerRepository.existsByVacancyIdAndUniversityId(vacancyId, 10L)).isTrue();
        assertThat(offerRepository.existsByVacancyIdAndUniversityId(vacancyId, 11L)).isFalse();
    }

    @Test
    void aLookupByVacancyAndUniversityFindsTheOffer() {
        Long vacancyId = vacancyId();
        offerRepository.saveAndFlush(offer(vacancyId, 10L));

        assertThat(offerRepository.findByVacancyIdAndUniversityId(vacancyId, 10L)).isPresent();
        assertThat(offerRepository.findByVacancyIdAndUniversityId(vacancyId, 11L)).isEmpty();
    }
}
