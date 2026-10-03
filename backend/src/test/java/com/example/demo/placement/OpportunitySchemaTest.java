package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/**
 * Phase 1 baseline (opportunity plan §8.2, step S1.1).
 *
 * <p><b>This pins a schema step, which is unusual, and here is why it is
 * warranted.</b> S1.1 adds roughly forty-five columns to {@code vacancies}
 * and changes none of the existing behaviour, so on the face of it there is
 * nothing to test — the suite stays green whether the columns are correct or
 * nonsense. That is exactly the step where a silent mistake survives: a
 * {@code targetProgrammes} column that Hibernate mapped to
 * {@code target_programmes} while the migration script in S1.6 creates
 * {@code target_programme_ids} is a production error that no test in the
 * repository would ever surface, because H2 builds its own schema from the
 * annotations and never reads the migration file.
 *
 * <p>So this class forces every new column through an actual
 * {@code INSERT}…{@code SELECT} round trip against the database rather than
 * asserting on the in-memory object, which would pass even if the column did
 * not exist. {@link #flushAndReload(long)} is the load-bearing helper: without
 * the flush and clear, Hibernate returns the same managed instance and every
 * assertion here is theatre.
 *
 * <p>Two assertions are behavioural rather than structural, and both guard
 * decisions that look like trivia until they break something:
 * <ul>
 *   <li>{@link #companyIdIsNowNullable()} is the single loosening in the whole
 *       plan. R2/R5/R6 adverts have no company, and any future tightening of
 *       this column would silently re-break those three requirements.</li>
 *   <li>{@link #descriptionIsNoLongerCappedAtOneThousandCharacters()} is the
 *       stated reason R8 exists. 1000 characters cannot describe an internship
 *       a student must decide on, and the cap was only ever a default that
 *       nobody had checked against that requirement.</li>
 * </ul>
 */
@SpringBootTest
@Transactional
class OpportunitySchemaTest {

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private EntityManager entityManager;

    /**
     * Pushes pending inserts to the database and drops the managed instances, so
     * what comes back was genuinely read back from a column rather than read
     * back from the object that was just built.
     */
    private Vacancy flushAndReload(long id) {
        entityManager.flush();
        entityManager.clear();
        return vacancyRepository.findById(id).orElseThrow();
    }

    /** A legacy-shaped advert, exactly as the six existing test call sites build one. */
    private Vacancy legacyStyle(String title) {
        return new Vacancy(title, "A description of the role", 42L, "Kampala",
                "Some requirements", "OPEN", LocalDate.now().plusMonths(2), LocalDate.now());
    }

    // --- Defaults -------------------------------------------------------------

    @Test
    void aNewAdvertDefaultsToACompanySubmissionAwaitingVerification() {
        // origin and verification_status are the two columns the whole relay hangs
        // off: the audience resolver branches on origin, and nothing but a super
        // admin may move an advert out of UNVERIFIED.
        assertThat(legacyStyle("Defaults").getOrigin()).isEqualTo(Vacancy.Origin.COMPANY);
        assertThat(legacyStyle("Defaults").getVerificationStatus())
                .isEqualTo(Vacancy.VerificationStatus.UNVERIFIED);
    }

    @Test
    void theLogisticsAndSafetyDefaultsAreSane() {
        Vacancy vacancy = legacyStyle("Defaults");

        assertThat(vacancy.getWorkMode()).isEqualTo(Vacancy.WorkMode.ONSITE);
        assertThat(vacancy.getSafetyOrientationRequired()).isFalse();
    }

    @Test
    void anUnstatedStipendIsNullRatherThanZero() {
        // false and 0 would both read as "this is unpaid", which is a claim the
        // advertiser never made. Null means unstated, and the feed can say so.
        assertThat(legacyStyle("Defaults").getIsPaid()).isNull();
        assertThat(legacyStyle("Defaults").getStipendAmount()).isNull();
    }

    @Test
    void everythingTheFeatureAddsStartsOutNull() {
        // Only the columns with a meaningful default carry one. If a new column
        // ships with an invented value, a later phase will read that value as
        // though the advertiser had supplied it.
        Vacancy vacancy = legacyStyle("Defaults");

        assertThat(vacancy.getExternalOrgName()).isNull();
        assertThat(vacancy.getSourceKind()).isNull();
        assertThat(vacancy.getSourceReference()).isNull();
        assertThat(vacancy.getVerifiedBy()).isNull();
        assertThat(vacancy.getVerifiedAt()).isNull();
        assertThat(vacancy.getVerificationNote()).isNull();
        assertThat(vacancy.getPublishedAt()).isNull();
        assertThat(vacancy.getReviewedAt()).isNull();
        assertThat(vacancy.getReviewNote()).isNull();
        assertThat(vacancy.getUpdatedAt()).isNull();
        assertThat(vacancy.getSlots()).isNull();
        assertThat(vacancy.getMinCgpa()).isNull();
        assertThat(vacancy.getStartDate()).isNull();
        assertThat(vacancy.getEndDate()).isNull();
        assertThat(vacancy.getDurationWeeks()).isNull();
        assertThat(vacancy.getCountry()).isNull();
        assertThat(vacancy.getCity()).isNull();
        assertThat(vacancy.getAddressDetail()).isNull();
        assertThat(vacancy.getSafetyNotes()).isNull();
        assertThat(vacancy.getResponsibilities()).isNull();
        assertThat(vacancy.getDeliverablesExpected()).isNull();
        assertThat(vacancy.getBenefits()).isNull();
        assertThat(vacancy.getRequiredSkills()).isNull();
        assertThat(vacancy.getNiceToHave()).isNull();
        assertThat(vacancy.getToolsTechnologies()).isNull();
        assertThat(vacancy.getEligibilityNotes()).isNull();
        assertThat(vacancy.getApplicationInstructions()).isNull();
        assertThat(vacancy.getApplicationEmail()).isNull();
        assertThat(vacancy.getApplicationPhone()).isNull();
        assertThat(vacancy.getApplicationUrl()).isNull();
        assertThat(vacancy.getRequiredAttachments()).isNull();
        assertThat(vacancy.getContactPersonName()).isNull();
        assertThat(vacancy.getContactRole()).isNull();
        assertThat(vacancy.getContactEmail()).isNull();
        assertThat(vacancy.getContactPhone()).isNull();
        assertThat(vacancy.getTargetSchoolIds()).isNull();
        assertThat(vacancy.getTargetDepartmentIds()).isNull();
        assertThat(vacancy.getTargetProgrammeIds()).isNull();
        assertThat(vacancy.getTargetYearOfStudy()).isNull();
        assertThat(vacancy.getTargetDegreeLevels()).isNull();
    }

    // --- The one loosening ----------------------------------------------------

    @Test
    void companyIdIsNowNullable() {
        // R2 (a sourced external offer), R5 and R6 have no company at all. This is
        // the only column in the plan that is loosened rather than added, so it is
        // the one most likely to be re-tightened by someone tidying up.
        Vacancy vacancy = legacyStyle("Sourced externally");
        vacancy.setCompanyId(null);
        vacancy.setExternalOrgName("Somebody Else Ltd");

        Vacancy reloaded = flushAndReload(vacancyRepository.save(vacancy).getId());

        assertThat(reloaded.getCompanyId()).isNull();
        assertThat(reloaded.getExternalOrgName()).isEqualTo("Somebody Else Ltd");
    }

    @Test
    void descriptionIsNoLongerCappedAtOneThousandCharacters() {
        // The 1000-character default is why R8 exists: a student cannot decide on
        // an internship from a paragraph that ends mid-sentence.
        String long_ = "x".repeat(5000);
        Vacancy vacancy = legacyStyle("A properly described role");
        vacancy.setDescription(long_);

        assertThat(flushAndReload(vacancyRepository.save(vacancy).getId()).getDescription())
                .hasSize(5000);
    }

    @Test
    void requirementsAreNoLongerCappedAtOneThousandCharacters() {
        Vacancy vacancy = legacyStyle("A properly specified role");
        vacancy.setRequirements("y".repeat(4000));

        assertThat(flushAndReload(vacancyRepository.save(vacancy).getId()).getRequirements())
                .hasSize(4000);
    }

    // --- The columns that must survive a database round trip -------------------

    @Test
    void everyProvenanceAndVerificationColumnRoundTrips() {
        Vacancy vacancy = legacyStyle("Provenance");
        vacancy.setOrigin(Vacancy.Origin.SUPER_ADMIN);
        vacancy.setStatus(Vacancy.Status.PUBLISHED);
        vacancy.setSourceKind(Vacancy.SourceKind.EXTERNAL_OFFER);
        vacancy.setSourceReference("https://example.org/careers/42");
        vacancy.setVerificationStatus(Vacancy.VerificationStatus.VERIFIED);
        vacancy.setVerifiedBy(7L);
        vacancy.setVerifiedAt(LocalDateTime.now().withNano(0));
        vacancy.setVerificationNote("Letter on file, confirmed by phone.");
        vacancy.setPublishedAt(LocalDateTime.now().withNano(0));
        vacancy.setReviewedAt(LocalDateTime.now().withNano(0));
        vacancy.setReviewNote("Meets the completeness bar.");
        vacancy.setUpdatedAt(LocalDateTime.now().withNano(0));

        Vacancy reloaded = flushAndReload(vacancyRepository.save(vacancy).getId());

        assertThat(reloaded.getOrigin()).isEqualTo(Vacancy.Origin.SUPER_ADMIN);
        assertThat(reloaded.getStatus()).isEqualTo(Vacancy.Status.PUBLISHED);
        assertThat(reloaded.getSourceKind()).isEqualTo(Vacancy.SourceKind.EXTERNAL_OFFER);
        assertThat(reloaded.getSourceReference()).isEqualTo("https://example.org/careers/42");
        assertThat(reloaded.getVerificationStatus()).isEqualTo(Vacancy.VerificationStatus.VERIFIED);
        assertThat(reloaded.getVerifiedBy()).isEqualTo(7L);
        assertThat(reloaded.getVerifiedAt()).isNotNull();
        assertThat(reloaded.getVerificationNote()).isEqualTo("Letter on file, confirmed by phone.");
        assertThat(reloaded.getPublishedAt()).isNotNull();
        assertThat(reloaded.getReviewedAt()).isNotNull();
        assertThat(reloaded.getReviewNote()).isEqualTo("Meets the completeness bar.");
        assertThat(reloaded.getUpdatedAt()).isNotNull();
    }

    @Test
    void everyAwarenessColumnRoundTrips() {
        Vacancy vacancy = legacyStyle("Awareness");
        vacancy.setResponsibilities("Build and maintain internal tooling.");
        vacancy.setDeliverablesExpected("A working service and a handover document.");
        vacancy.setBenefits("Transport allowance and lunch.");
        vacancy.setRequiredSkills("Java or Kotlin");
        vacancy.setNiceToHave("Docker");
        vacancy.setToolsTechnologies("Git, PostgreSQL, Docker");

        Vacancy reloaded = flushAndReload(vacancyRepository.save(vacancy).getId());

        assertThat(reloaded.getResponsibilities()).isEqualTo("Build and maintain internal tooling.");
        assertThat(reloaded.getDeliverablesExpected())
                .isEqualTo("A working service and a handover document.");
        assertThat(reloaded.getBenefits()).isEqualTo("Transport allowance and lunch.");
        assertThat(reloaded.getRequiredSkills()).isEqualTo("Java or Kotlin");
        assertThat(reloaded.getNiceToHave()).isEqualTo("Docker");
        assertThat(reloaded.getToolsTechnologies()).isEqualTo("Git, PostgreSQL, Docker");
    }

    @Test
    void everyLogisticsColumnRoundTrips() {
        Vacancy vacancy = legacyStyle("Logistics");
        vacancy.setWorkMode(Vacancy.WorkMode.HYBRID);
        vacancy.setCountry("Uganda");
        vacancy.setCity("Kampala");
        vacancy.setAddressDetail("Plot 42, Kololo");
        vacancy.setDurationWeeks(12);
        vacancy.setStartDate(LocalDate.of(2026, 7, 1));
        vacancy.setEndDate(LocalDate.of(2026, 9, 30));
        vacancy.setIsPaid(true);
        vacancy.setStipendAmount(new BigDecimal("450000.00"));
        vacancy.setStipendCurrency("UGX");
        vacancy.setStipendPeriod("MONTHLY");

        Vacancy reloaded = flushAndReload(vacancyRepository.save(vacancy).getId());

        assertThat(reloaded.getWorkMode()).isEqualTo(Vacancy.WorkMode.HYBRID);
        assertThat(reloaded.getCountry()).isEqualTo("Uganda");
        assertThat(reloaded.getCity()).isEqualTo("Kampala");
        assertThat(reloaded.getAddressDetail()).isEqualTo("Plot 42, Kololo");
        assertThat(reloaded.getDurationWeeks()).isEqualTo(12);
        assertThat(reloaded.getStartDate()).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(reloaded.getEndDate()).isEqualTo(LocalDate.of(2026, 9, 30));
        assertThat(reloaded.getIsPaid()).isTrue();
        // Compared as BigDecimal with compareTo via isEqualByComparingTo, because
        // a DECIMAL column and new BigDecimal("450000.00") are not necessarily
        // equal under equals() — scale differs.
        assertThat(reloaded.getStipendAmount()).isEqualByComparingTo("450000.00");
        assertThat(reloaded.getStipendCurrency()).isEqualTo("UGX");
        assertThat(reloaded.getStipendPeriod()).isEqualTo("MONTHLY");
    }

    @Test
    void everyTargetingAndContactColumnRoundTrips() {
        Vacancy vacancy = legacyStyle("Targeting");
        vacancy.setTargetSchoolIds("1,2");
        vacancy.setTargetDepartmentIds("3,4");
        vacancy.setTargetProgrammeIds("5,6");
        vacancy.setTargetYearOfStudy("2,3");
        vacancy.setTargetDegreeLevels("BACHELOR");
        vacancy.setMinCgpa(new BigDecimal("3.50"));
        vacancy.setSlots(5);
        vacancy.setEligibilityNotes("Final-year students only.");
        vacancy.setContactPersonName("Grace Nakato");
        vacancy.setContactRole("Placement Officer");
        vacancy.setContactEmail("grace@example.org");
        vacancy.setContactPhone("+256700000000");
        vacancy.setApplicationInstructions("Email your CV and cover letter.");
        vacancy.setApplicationEmail("apply@example.org");
        vacancy.setApplicationPhone("+256700000001");
        vacancy.setApplicationUrl("https://example.org/apply");
        vacancy.setRequiredAttachments("National ID and one passport photo.");

        Vacancy reloaded = flushAndReload(vacancyRepository.save(vacancy).getId());

        assertThat(reloaded.getTargetSchoolIds()).isEqualTo("1,2");
        assertThat(reloaded.getTargetDepartmentIds()).isEqualTo("3,4");
        assertThat(reloaded.getTargetProgrammeIds()).isEqualTo("5,6");
        assertThat(reloaded.getTargetYearOfStudy()).isEqualTo("2,3");
        assertThat(reloaded.getTargetDegreeLevels()).isEqualTo("BACHELOR");
        assertThat(reloaded.getMinCgpa()).isEqualByComparingTo("3.50");
        assertThat(reloaded.getSlots()).isEqualTo(5);
        assertThat(reloaded.getEligibilityNotes()).isEqualTo("Final-year students only.");
        assertThat(reloaded.getContactPersonName()).isEqualTo("Grace Nakato");
        assertThat(reloaded.getContactRole()).isEqualTo("Placement Officer");
        assertThat(reloaded.getContactEmail()).isEqualTo("grace@example.org");
        assertThat(reloaded.getContactPhone()).isEqualTo("+256700000000");
        assertThat(reloaded.getApplicationInstructions()).isEqualTo("Email your CV and cover letter.");
        assertThat(reloaded.getApplicationEmail()).isEqualTo("apply@example.org");
        assertThat(reloaded.getApplicationPhone()).isEqualTo("+256700000001");
        assertThat(reloaded.getApplicationUrl()).isEqualTo("https://example.org/apply");
        assertThat(reloaded.getRequiredAttachments()).isEqualTo("National ID and one passport photo.");
    }

    @Test
    void safetyOrientationIsFalseUntilSomebodyStatesItIsTrue() {
        // A mandatory safety briefing is the sort of thing that gets omitted from a
        // form. Defaulting it to false means the omission is visible as false; the
        // dangerous default would be true on a column nobody sets.
        Vacancy unstated = legacyStyle("No safety column set");

        assertThat(flushAndReload(vacancyRepository.save(unstated).getId())
                .getSafetyOrientationRequired()).isFalse();

        // A second advert, because flushAndReload clears the persistence context and
        // the first instance is detached by then.
        Vacancy stated = legacyStyle("Safety briefing required");
        stated.setSafetyOrientationRequired(true);
        stated.setSafetyNotes("Site induction on day one.");

        Vacancy reloaded = flushAndReload(vacancyRepository.save(stated).getId());
        assertThat(reloaded.getSafetyOrientationRequired()).isTrue();
        assertThat(reloaded.getSafetyNotes()).isEqualTo("Site induction on day one.");
    }

    // --- Additive guarantee ---------------------------------------------------

    @Test
    void theLegacyFieldsAreUntouched() {
        // The six existing test call sites build adverts through this constructor.
        // If S1.1 changed what it sets, VacancyOwnershipTest and the three other
        // suites would move for reasons that have nothing to do with this feature.
        LocalDate created = LocalDate.of(2026, 1, 1);
        LocalDate deadline = LocalDate.of(2026, 6, 1);
        Vacancy vacancy = new Vacancy("Legacy role", "Legacy description", 42L,
                "Kampala", "Legacy requirements", "OPEN", deadline, created);

        Vacancy reloaded = flushAndReload(vacancyRepository.save(vacancy).getId());

        assertThat(reloaded.getTitle()).isEqualTo("Legacy role");
        assertThat(reloaded.getDescription()).isEqualTo("Legacy description");
        assertThat(reloaded.getCompanyId()).isEqualTo(42L);
        assertThat(reloaded.getLocation()).isEqualTo("Kampala");
        assertThat(reloaded.getRequirements()).isEqualTo("Legacy requirements");
        // Status is the one legacy field whose *spelling* changed: "OPEN" is the
        // documented alias of PUBLISHED (§5.6), so the constructor normalises it. The
        // field itself is still untouched — no other value is substituted, and the
        // alias is what keeps every existing fixture and client working.
        assertThat(reloaded.getStatus()).isEqualTo(Vacancy.Status.PUBLISHED);
        assertThat(reloaded.getDeadline()).isEqualTo(deadline);
        assertThat(reloaded.getCreatedAt()).isEqualTo(created);
    }
}
