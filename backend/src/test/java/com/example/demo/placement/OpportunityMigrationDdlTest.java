package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import jakarta.persistence.Column;
import jakarta.persistence.Table;

/**
 * Phase 1 (opportunity plan §8.2, step S1.6).
 *
 * <p><b>Why a documentation file needs a test.</b> The h2/dev profile builds its
 * schema from the annotations via {@code ddl-auto=update} and never reads
 * {@code migration/add_opportunity_propagation.sql}. Every other schema test in this
 * phase therefore exercises H2's <i>idea</i> of the schema while the mysql profile
 * — the one that actually holds data — is governed by that hand-written file. Nothing
 * in the suite would notice the two disagreeing.
 *
 * <p>That is not hypothetical. {@code OpportunitySchemaTest} proves every new
 * {@code Vacancy} column round-trips through H2, and the same commit adds ~45 columns
 * to the DDL by hand. A typo in one of those, a type that quietly differs, a unique
 * constraint written for the wrong column pair, and the whole phase passes green while
 * production fails on first write. The unique constraints are the sharpest case: drop
 * {@code uq_opportunity_offers_vacancy_university} from the DDL and the race it
 * guards against reopens on mysql only, which is where it would actually be hit.
 *
 * <p>So this reads the SQL and compares it to the entities, field by field. It is a
 * static check, not an execution — it will not catch a typo in MySQL <i>syntax</i> —
 * but it does catch the failure that matters: a column or constraint that the code
 * relies on and the DDL does not have.
 *
 * <p>Deliberately one-directional. It asserts every entity column appears in the DDL
 * and that the new constraints and nullability are as intended; it does not try to
 * parse the whole MySQL dialect.
 */
class OpportunityMigrationDdlTest {

    private static final Path DDL = Path.of("migration", "add_opportunity_propagation.sql");

    private static String ddl;

    @BeforeAll
    static void loadDdl() throws Exception {
        assertThat(Files.exists(DDL))
                .as("migration script not found at %s (tests run from the module directory)", DDL)
                .isTrue();
        ddl = Files.readString(DDL);
    }

    /** The table an entity maps to. */
    private static String tableOf(Class<?> entity) {
        Table table = entity.getAnnotation(Table.class);
        return table == null ? null : table.name();
    }

    /** The column an entity field maps to, falling back to the naming strategy's snake_case. */
    private static String columnOf(Field field) {
        Column column = field.getAnnotation(Column.class);
        if (column != null && !column.name().isEmpty()) {
            return column.name();
        }
        return field.getName().replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }

    /** Every persistent field of an entity, {@code @Id} excluded. */
    private static List<Field> persistentFields(Class<?> entity) {
        List<Field> fields = new ArrayList<>();
        for (Field field : entity.getDeclaredFields()) {
            if (field.isAnnotationPresent(jakarta.persistence.Id.class)) {
                continue;
            }
            if (field.isSynthetic() || java.lang.reflect.Modifier.isStatic(field.getModifiers())) {
                continue;
            }
            fields.add(field);
        }
        return fields;
    }

    /**
     * True when the DDL adds or modifies this column on this table.
     *
     * <p>Anchored on the {@code TABLE_NAME = '...'} line of each guard, so a column
     * name that merely appears in a comment or belongs to a different table does not
     * count. Every ADD COLUMN in this script sits inside a block that already names
     * the table, so the check walks blocks rather than the whole file.
     */
    private static boolean ddlMentions(String table, String column) {
        for (String verb : new String[] { "ADD COLUMN ", "MODIFY COLUMN " }) {
            String pattern = "TABLE_NAME = '" + table + "'.*?"
                    + verb + Pattern.quote(column) + "\\s";
            if (Pattern.compile(pattern, Pattern.DOTALL).matcher(ddl).find()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Every column name the DDL adds or modifies on one table, read from the statements
     * themselves rather than from a substring search.
     *
     * <p>Needed because a containment check cannot tell "this column was added" from
     * "this column was named". Renaming {@code deliverables_expected} to
     * {@code deliverables} in the script leaves the first search finding the second
     * word inside the first name, so the test passed on a column that does not exist.
     * Extract the names and compare them as sets instead.
     */
    private static List<String> ddlColumnNamesFor(String table) {
        List<String> names = new ArrayList<>();
        // Each guarded statement ends with the 'SELECT 1' no-op branch, so that is
        // where one block ends and the next begins.
        Matcher blocks = Pattern.compile(
                "TABLE_NAME = '" + table + "'.*?'SELECT 1'",
                Pattern.DOTALL).matcher(ddl);
        while (blocks.find()) {
            Matcher changes = Pattern
                    .compile("(?:ADD|MODIFY) COLUMN ([a-z0-9_]+)\\s", Pattern.CASE_INSENSITIVE)
                    .matcher(blocks.group());
            while (changes.find()) {
                names.add(changes.group(1).toLowerCase(Locale.ROOT));
            }
        }
        return names;
    }

    // --- Vacancies ------------------------------------------------------------

    /**
     * Columns {@code schema.sql} already creates, which this script therefore must not
     * re-add. Asserting them by name makes the check two-sided: a new {@code Vacancy}
     * field has to show up in the DDL, and this list is the allowlist of what legitimately
     * does not.
     */
    private static final List<String> PRE_EXISTING_VACANCY_COLUMNS = List.of(
            "id", "title", "status", "deadline", "location", "created_at");

    @Test
    void everyVacancyColumnThePlanIntroducedExistsInTheDdl() {
        List<String> declared = ddlColumnNamesFor("vacancies");
        assertThat(declared)
                .as("no vacancies column statements parsed at all; the regex is wrong, "
                        + "not the DDL")
                .isNotEmpty();

        List<String> missing = new ArrayList<>();
        for (Field field : persistentFields(Vacancy.class)) {
            String column = columnOf(field);
            if (PRE_EXISTING_VACANCY_COLUMNS.contains(column)) {
                continue;
            }
            if (!declared.contains(column)) {
                missing.add(column);
            }
        }

        assertThat(missing)
                .as("columns carried by Vacancy but never added or modified by the DDL; "
                        + "H2 builds its own schema and would pass regardless, while the "
                        + "mysql profile fails on first write")
                .isEmpty();
    }

    @Test
    void theDdlAddsNoVacancyColumnTheEntityDoesNotHave() {
        // The other direction. An orphan column usually means a rename that missed a
        // side, and it would sit there silently in production with nothing writing it.
        List<String> known = new ArrayList<>();
        for (Field field : persistentFields(Vacancy.class)) {
            known.add(columnOf(field));
        }
        known.add("company_id"); // pre-existing, and still carried by the entity

        List<String> orphans = ddlColumnNamesFor("vacancies").stream()
                .filter(column -> !known.contains(column))
                .distinct()
                .toList();

        assertThat(orphans)
                .as("columns the DDL adds that no Vacancy field maps to")
                .isEmpty();
    }

    @Test
    void thePreExistingVacancyColumnsAreNotReAdded() {
        // The other half of the allowlist: re-adding one of these would either error on
        // a re-run or, for a guarded ADD COLUMN, be a silent no-op that hides a typo.
        for (String column : PRE_EXISTING_VACANCY_COLUMNS) {
            assertThat(ddl).doesNotContain("ADD COLUMN " + column + " ");
        }
    }

    @Test
    void theNewVacancyColumnsAreActuallyWritten() {
        // Full type clauses, not just the column name, because a NOT NULL or a DEFAULT
        // is the part that decides whether existing rows survive the backfill intact.
        // Asserted inside the vacancies ADD COLUMN guards so a matching line in the
        // comments cannot satisfy this.
        for (String column : new String[] {
                "ADD COLUMN origin VARCHAR(20) NOT NULL DEFAULT ''COMPANY''",
                "ADD COLUMN verification_status VARCHAR(16) NOT NULL DEFAULT ''UNVERIFIED''",
                "ADD COLUMN work_mode VARCHAR(16) NOT NULL DEFAULT ''ONSITE''",
                "ADD COLUMN safety_orientation_required BOOLEAN NOT NULL DEFAULT 0",
                "ADD COLUMN is_paid BOOLEAN NULL" }) {
            assertThat(ddl).as("missing or altered DDL clause: %s", column).contains(column);
        }
    }

    @Test
    void companyIdIsLoosenedAndTheTextColumnsAreWidened() {
        // The only three non-additive statements in the script. Each is guarded so a
        // re-run is a no-op, which is why the guards are asserted too.
        assertThat(ddl).contains("ALTER TABLE vacancies MODIFY COLUMN company_id BIGINT NULL");
        assertThat(ddl).contains("ALTER TABLE vacancies MODIFY COLUMN description TEXT NOT NULL");
        assertThat(ddl).contains("ALTER TABLE vacancies MODIFY COLUMN requirements TEXT NULL");

        // The guards: IS_NULLABLE and DATA_TYPE, so re-running is harmless.
        assertThat(ddl).contains("AND COLUMN_NAME = 'company_id') = 'NO'");
        assertThat(ddl).contains("AND COLUMN_NAME = 'description') = 'varchar'");
        assertThat(ddl).contains("AND COLUMN_NAME = 'requirements') = 'varchar'");
    }

    @Test
    void theBackfillRewritesEveryOpenStatusRegardlessOfCase() {
        // equalsIgnoreCase at the apply gate means a lower-case 'open' row was
        // admissible, so a case-sensitive backfill would leave it behind to become
        // unappliable the moment S1.7 lands.
        assertThat(ddl)
                .contains("UPDATE vacancies SET status = 'PUBLISHED' WHERE UPPER(status) = 'OPEN'");
    }

    // --- Relay tables ---------------------------------------------------------

    @Test
    void everyRelayTableIsCreated() {
        assertThat(tableOf(OpportunityOffer.class)).isEqualTo("opportunity_offers");
        assertThat(tableOf(OpportunityShare.class)).isEqualTo("opportunity_shares");
        assertThat(tableOf(OpportunitySubmission.class)).isEqualTo("opportunity_submissions");
        assertThat(tableOf(OpportunityStatusHistory.class)).isEqualTo("opportunity_status_history");
        assertThat(tableOf(OpportunityAttachment.class)).isEqualTo("opportunity_attachments");

        for (String table : new String[] { "opportunity_offers", "opportunity_shares",
                "opportunity_submissions", "opportunity_status_history",
                "opportunity_attachments" }) {
            assertThat(ddl).contains("CREATE TABLE IF NOT EXISTS " + table);
        }
    }

    @Test
    void everyRelayTableColumnExistsInTheDdl() {
        List<String> missing = new ArrayList<>();
        for (Class<?> entity : new Class<?>[] { OpportunityOffer.class, OpportunityShare.class,
                OpportunitySubmission.class, OpportunityStatusHistory.class,
                OpportunityAttachment.class }) {
            String table = tableOf(entity);
            // Columns inside a CREATE TABLE are not written as ADD COLUMN, so match the
            // column name against that table's block.
            String block = tableBlock(table);
            for (Field field : persistentFields(entity)) {
                String column = columnOf(field);
                if (!block.contains(" " + column + " ")) {
                    missing.add(table + "." + column);
                }
            }
        }

        assertThat(missing)
                .as("columns carried by an entity but absent from its CREATE TABLE; "
                        + "H2 builds its own schema and would not notice")
                .isEmpty();
    }

    @Test
    void theUniqueConstraintsMatchTheEntities() {
        // Each of these is load-bearing, and each is the kind of thing that gets
        // "tidied" into agreement with a neighbouring table by mistake.
        assertThat(ddl).contains(
                "UNIQUE KEY uq_opportunity_offers_vacancy_university (vacancy_id, university_id)");
        assertThat(ddl).contains(
                "UNIQUE KEY uq_opportunity_shares_vacancy_university (vacancy_id, university_id)");

        // Deliberately (vacancy_id) alone, NOT (vacancy_id, university_id). See §5.9:
        // two universities holding reviewable submissions for one advert would reach
        // different decisions and share it twice.
        assertThat(ddl).contains("UNIQUE KEY uq_opportunity_submissions_vacancy (vacancy_id)");
        assertThat(ddl)
                .as("if this ever appears, the deliberate single-column constraint was widened")
                .doesNotContain("uq_opportunity_submissions_vacancy (vacancy_id, university_id)");
    }

    @Test
    void theAttachmentTableKeepsItsTwoAudiences() {
        // university_id nullable is what lets an advert carry both an advert-level file
        // and a university's targeted file. NOT NULL here would reintroduce the leak
        // this table was created to avoid.
        assertThat(ddl).contains("university_id BIGINT NULL");
        assertThat(ddl).doesNotContain("university_id BIGINT NOT NULL,\n    target_programme_ids");

        // The generated name and the display name are separate columns, so there is
        // somewhere safe to put a server-generated one [H14].
        assertThat(ddl).contains("file_name VARCHAR(255) NOT NULL");
        assertThat(ddl).contains("original_file_name VARCHAR(255) NOT NULL");
    }

    @Test
    void theHistoryStatusesAreStoredAsPlainStrings() {
        // The trail must outlive the enum vocabulary S1.7 introduces: a retired status
        // still has to render in the S8.2 view.
        assertThat(ddl).contains("from_status VARCHAR(20) NULL");
        assertThat(ddl).contains("to_status VARCHAR(20) NOT NULL");
        assertThat(ddl).doesNotContain("ENUM(");
    }

    @Test
    void theIndexesTheFindersDependOnAreDeclared() {
        // Every finder added in S1.2–S1.5b reads through one of these.
        for (String index : new String[] {
                "idx_opportunity_offers_university_status (university_id, status)",
                "idx_opportunity_offers_vacancy (vacancy_id)",
                "idx_opportunity_shares_university_status (university_id, status)",
                "idx_opportunity_shares_vacancy (vacancy_id)",
                "idx_opportunity_submissions_university_status (university_id, status)",
                "idx_opportunity_submissions_submitter (submitted_by)",
                "idx_opportunity_status_history_vacancy_time (vacancy_id, changed_at)",
                "idx_opportunity_status_history_university (university_id)",
                "idx_opportunity_attachments_vacancy (vacancy_id)",
                "idx_opportunity_attachments_university (university_id)" }) {
            assertThat(ddl).contains(index);
        }
    }

    @Test
    void theStatusDefaultsMatchTheEntityFieldDefaults() {
        // A DDL default that disagrees with the field initializer is not harmless: rows
        // written by a script and rows written by Hibernate would carry different states.
        assertThat(ddl).contains("status VARCHAR(16) NOT NULL DEFAULT 'OFFERED'");
        assertThat(ddl).contains("status VARCHAR(16) NOT NULL DEFAULT 'SHARED'");
        assertThat(ddl).contains("status VARCHAR(16) NOT NULL DEFAULT 'PENDING'");
        assertThat(OpportunityOffer.OFFERED).isEqualTo("OFFERED");
        assertThat(OpportunityShare.SHARED).isEqualTo("SHARED");
        assertThat(OpportunitySubmission.PENDING).isEqualTo("PENDING");
    }

    @Test
    void theTimestampColumnsMatchHibernatesMysqlDdl() {
        // datetime(6) is what Hibernate emits for LocalDateTime; a bare DATETIME would
        // silently truncate the sub-second precision the entity relies on to order a
        // same-instant relay. Mirrors the note in add_placement_timeline.sql.
        assertThat(ddl).doesNotContain("DATETIME NULL");
        assertThat(occurrenceCount(ddl, "DATETIME(6)"))
                .isGreaterThanOrEqualTo(8);
    }

    // --- Script hygiene -------------------------------------------------------

    @Test
    void everyGuardedStatementReleasesItsPreparedHandle() {
        // A leaked prepared handle makes the *next* PREPARE fail with "already
        // exists", which on a long migration means it dies half way through.
        int prepared = ddl.split("PREPARE s FROM", -1).length - 1;
        int executed = ddl.split("EXECUTE s;", -1).length - 1;
        int released = ddl.split("DEALLOCATE PREPARE s;", -1).length - 1;

        assertThat(prepared).isGreaterThan(0);
        assertThat(executed).isEqualTo(prepared);
        assertThat(released).isEqualTo(prepared);
    }

    @Test
    void theScriptDropsNothing() {
        // The plan's one rule for migrations in this phase: additive only. A DROP here
        // would destroy data the previous statement just made sense of.
        assertThat(ddl).doesNotContainIgnoringCase("DROP TABLE");
        assertThat(ddl).doesNotContainIgnoringCase("DROP COLUMN");
        assertThat(ddl).doesNotContainIgnoringCase("TRUNCATE");
    }

    @Test
    void theScriptExplainsItsOwnOrdering() {
        // The OPEN rewrite depends on S1.7's apply-gate rewrite. A script that runs
        // first and outlives the deploy leaves adverts unappliable in the gap, so the
        // dependency has to be written down where an operator will read it.
        assertThat(comments()).contains(
                "Do not\n--      run this before deploying the S1.7 entities");
    }

    // --- helpers --------------------------------------------------------------

    private static String tableBlock(String table) {
        Matcher matcher = Pattern.compile(
                "CREATE TABLE IF NOT EXISTS " + table + "\\s*\\((.*?)\\) ENGINE=InnoDB",
                Pattern.DOTALL).matcher(ddl);
        assertThat(matcher.find()).as("no CREATE TABLE block found for %s", table).isTrue();
        return matcher.group(1);
    }

    private static int occurrenceCount(String haystack, String needle) {
        return haystack.split(Pattern.quote(needle), -1).length - 1;
    }

    /** The script's comment lines, newline-separated, for assertions about prose. */
    private static String comments() {
        StringBuilder out = new StringBuilder();
        for (String line : ddl.split("\n")) {
            if (line.startsWith("--")) {
                out.append(line).append('\n');
            }
        }
        return out.toString();
    }
}
