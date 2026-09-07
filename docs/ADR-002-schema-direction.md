# ADR-002: Adopt Model B as the target-of-record schema

Status: Accepted · Date: 2026-08-25 · Deciders: fred + repo owner · Supersedes: dual-model status quo from merge e91ae5a

## Context

University academic structures differ across institutions. Kyambogo nests
faculties → departments → programmes; Nkumba runs flat schools with programmes
attached directly; Makerere adds a College tier above schools. Model A's single
flat `academic_units` table (type enum + parentUnitId) could represent this only
awkwardly, and its companion tables (`courses`, `unit_courses`, `staff`) carried
demo data for two universities with no clean multi-tenant story.

The `developer` branch (Chris) introduced a cleaner three-tier model —
`schools` / `departments` / `programmes`, each carrying a soft `universityId`
FK — plus first-class supervisor entities and a Long-keyed `students` table.
Both models coexisted after merge e91ae5a, which is untenable long-term.

## Decision

Model B is the target-of-record. Model A is purged in phases (M6c of
MIGRATION_PLAN.md). Rulings R1–R8 in MIGRATION_PLAN.md §1 are normative;
the load-bearing ones:

1. **Why this model fits any university:** deep hierarchies use all three
   tiers (`schoolId` → optional `departmentId` on programme); flat structures
   leave `departments` empty and set `programmes.departmentId = NULL`.
   Nothing about the schema assumes one institution's shape.
2. **College tier:** `schools.parent_school_id INT NULL` (+ `type`
   COLLEGE/SCHOOL/DIRECTORATE) makes 4-tier institutions like Makerere
   representable natively. NULL parent = top-level, so Nkumba is unaffected.
3. **Catalog scope:** three universities ship at boot — Nkumba (from our own
   verified AcademicUnit/Course/UnitCourse data), Kyambogo and Makerere
   (Chris's uni-2/uni-1 seeder rows, whose hardcoded ids align because both
   university lists agree on positions 1 and 2). Makerere imports flat until
   a real college tree is supplied; none will be invented.
4. **Entity pairs** (`StudentProfile`↔`Student`, `Company`↔`InternshipCompany`)
   coexist until their porting phase, then Model-A side dies. A-shape
   `University` (shortForm/fullName/country/establishedYear) is retained
   permanently.
5. **Data safety:** one-time ETL between M5 and M6c converts real rows with
   reconciliation gates before anything destructive runs.
6. **Config:** `dev` (H2, auto-ddl) remains default for zero-setup
   contribution; `mysql` profile is production truth via committed
   `schema.sql` + `ddl-auto=none`. Chris's database rename is skipped.

## Alternatives considered

- **Keep Model A** — rejected: cannot express per-university structure
  variation cleanly and lacks supervisor entities entirely.
- **Reorder our universities to match Chris's ordering** — rejected once
  catalog scope settled: importing only his id-1/id-2 slices avoids touching
  university ids at all, so the ETL needs no remap there.
- **Defer college-tier column** — rejected: adding it pre-production is free;
  after go-live it is a migration.

## Consequences

- Seeder `@Order` collisions (3/4/6/8 doubled across models) must be resolved
  before any shared-DB boot (M1).
- Until M3 lands, registration still writes Model-A `StudentProfile`; the two
  student tables diverge by design inside the migration window only.
- The dormant `roles` table uses `ROLE_*` names; authorities remain
  STUDENT/SUPERVISOR/COMPANY/ADMIN. Nothing may read `roles.name` as an
  authority (R8).
