package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Locale;
import java.util.Set;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.example.demo.auth.UserRepository;

/**
 * Step S1.7: the parse boundary for the advert status vocabulary (plan §5.6).
 *
 * <p>{@code "OPEN"} has to keep meaning "live and appliable" after the column became
 * an enum, because three different things still produce it and none of them are being
 * rewritten: every row in the production database, every {@code POST /api/vacancies}
 * body a client sends, and every existing test fixture.
 *
 * <p>So the alias is pinned here from both directions. It has to resolve
 * ({@code "OPEN"} → {@code PUBLISHED}) and it has to be the <i>only</i> thing it
 * resolves to — an alias that quietly also swallowed {@code "PENDING_REVIEW"} or
 * {@code "banana"} would be a worse bug than the one it fixed, because it would hide
 * unmoderated adverts behind a published status.
 */
@SpringBootTest
@AutoConfigureMockMvc
class OpportunityStatusParseTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    // --- The alias resolves ---

    @Test
    void theLegacyOpenAliasResolvesToPublished() {
        assertThat(Vacancy.Status.parse("OPEN")).isEqualTo(Vacancy.Status.PUBLISHED);
        assertThat(Vacancy.Status.LEGACY_OPEN).isEqualTo("OPEN");
    }

    @ParameterizedTest(name = "\"{0}\" is still PUBLISHED")
    @ValueSource(strings = { "open", "Open", "oPeN", "  OPEN  ", "\topen\n" })
    void theAliasIsCaseAndWhitespaceTolerant(String raw) {
        // The gate this replaced used equalsIgnoreCase, so a lower-case "open" row was
        // admissible in production. Rejecting it now would take a live advert out of
        // service for no reason, so the tolerance is a requirement, not a nicety.
        assertThat(Vacancy.Status.parse(raw)).isEqualTo(Vacancy.Status.PUBLISHED);
    }

    @ParameterizedTest(name = "{0} round-trips through its own name")
    @MethodSource("everyStatus")
    void everyStatusParsesFromItsOwnName(Vacancy.Status status) {
        assertThat(Vacancy.Status.parse(status.name())).isEqualTo(status);
        assertThat(Vacancy.Status.parse(status.name().toLowerCase(Locale.ROOT)))
                .isEqualTo(status);
    }

    // --- Nothing else resolves ---

    @ParameterizedTest(name = "\"{0}\" is rejected")
    @ValueSource(strings = { "BANANA", "OPENING", "PUBLISH", "0", "null" })
    void anythingOutsideTheVocabularyIsRejected(String raw) {
        assertThatThrownBy(() -> Vacancy.Status.parse(raw))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void theAliasCannotSmuggleInAnUnmoderatedAdvert() {
        // The specific way this could go wrong: treating "OPEN" as a prefix or a
        // near-miss match would also admit PENDING_REVIEW, which is precisely the
        // private state of R1. Pinned explicitly rather than left to the sweep below.
        assertThatThrownBy(() -> Vacancy.Status.parse("OPEN_REVIEW"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(Vacancy.Status.PENDING_REVIEW.acceptsApplications()).isFalse();
    }

    @Test
    void aBlankOrMissingStatusIsRejectedRatherThanDefaulted() {
        // Defaulting to PUBLISHED here would publish an advert nobody verified.
        assertThatThrownBy(() -> Vacancy.Status.parse(null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Vacancy.Status.parse(""))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Vacancy.Status.parse("   "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // --- The parse is reachable over HTTP, and is a 400 there ---

    @Test
    void anUnknownStatusOnTheWireIsAFourHundredNotAFiveHundred() throws Exception {
        // §5.6 consequence 2, made deliberately: an unrecognised status used to be a
        // 409 from the apply gate, indistinguishable from a closed advert. It is now
        // caught where it arrives, before any advert exists to apply to.
        mockMvc.perform(post("/api/vacancies").with(asAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vacancyBody("BANANA")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theLegacyOpenAliasIsAcceptedOnTheWire() throws Exception {
        // The other half: an existing client still posting "status":"OPEN" must keep
        // working. If the alias only worked through the constructor, every real client
        // would be broken by this step.
        mockMvc.perform(post("/api/vacancies").with(asAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vacancyBody("OPEN")))
                .andExpect(status().isCreated());
    }

    @Test
    void aPublishedAdvertIsAcceptedOnTheWireToo() throws Exception {
        // The spelling that replaces OPEN, so the new vocabulary is proven end to end
        // and not only through the enum.
        mockMvc.perform(post("/api/vacancies").with(asAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vacancyBody("PUBLISHED")))
                .andExpect(status().isCreated());
    }

    // --- The apply gate's vocabulary ---

    @Test
    void publishedIsTheOnlyStatusThatAcceptsAnApplication() {
        // One sweep, so widening the gate means editing this list rather than quietly
        // letting another state through. PUBLISHED alone: PENDING_REVIEW is R1's
        // private state, and admitting it would make moderation decoration.
        assertThat(Stream.of(Vacancy.Status.values())
                .filter(Vacancy.Status::acceptsApplications)
                .toList())
                .containsExactly(Vacancy.Status.PUBLISHED);
    }

    @ParameterizedTest(name = "{0} accepts no applications")
    @EnumSource(value = Vacancy.Status.class,
            names = { "PENDING_REVIEW", "REJECTED", "WITHDRAWN", "CLOSED", "EXPIRED" })
    void everyNonLiveStatusRefusesApplications(Vacancy.Status status) {
        assertThat(status.acceptsApplications()).isFalse();
    }

    @Test
    void everyTerminalStateIsTerminalAndRefusesApplications() {
        Set<Vacancy.Status> terminal = Set.of(
                Vacancy.Status.REJECTED, Vacancy.Status.WITHDRAWN,
                Vacancy.Status.CLOSED, Vacancy.Status.EXPIRED);
        assertThat(Stream.of(Vacancy.Status.values()).filter(terminal::contains))
                .hasSize(terminal.size())
                .allMatch(s -> !s.acceptsApplications());
    }

    @Test
    void expiredIsInTheVocabularyEvenThoughTheColumnNeverHoldsIt() {
        // EXPIRED is derived from the deadline rather than stored, so it can never be
        // the status of a row. It is in the enum because the gate still has to answer
        // for it — a sweep of "every status must be appliable or terminal" needs a name
        // for that answer.
        assertThat(Stream.of(Vacancy.Status.values()).toList())
                .contains(Vacancy.Status.EXPIRED);
    }

    static Stream<Vacancy.Status> everyStatus() {
        return Stream.of(Vacancy.Status.values());
    }

    private RequestPostProcessor asAdmin() {
        return user(userRepository.findByUsername("admin").orElseThrow().getUsername())
                .authorities(new SimpleGrantedAuthority("ADMIN"));
    }

    private String vacancyBody(String status) {
        return """
                {
                  "title": "Advert with status %s",
                  "description": "A description of the role",
                  "location": "Kampala",
                  "status": "%s",
                  "deadline": "2026-09-30"
                }
                """.formatted(status, status);
    }
}
