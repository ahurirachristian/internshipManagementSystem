# Opportunity Propagation Plan — company/advisor-submitted internships, relayed Company → Super Admin → University → Student

Status: **Phases 0–5 done, S6.1 ✅ (S0.1–S6.1).** Next step: **S6.2**, review supervisor submissions. Phase 0 added characterization tests only; Phases 1–2 added the schema, migration, status vocabulary and the transition engine + audience resolver; Phase 3 opens the endpoints.
Branch target: `fred`. Every step below is one commit.
Base commit at time of writing: `f0efc57`.
Revision: security-scope audit found two gaps in the first draft (`GET /api/vacancies/{id}` unmentioned; `documents`/`audience` reuse unusable). Both corrected — see **D8** in §11 and **§5.11**.

---

## 1. Requirements captured (your brief, as numbered stories)

| # | Story | Actor | Rule |
|---|---|---|---|
| **R1** | A registered company advertises a possible internship opportunity. | `COMPANY` | **Nobody sees it except the super admin.** Not the university, not students. |
| **R2** | The super admin finds a *legitimate* offer on their own and advertises it as an internship opportunity to universities. | super admin (`ADMIN` + `super_admin=true`) | This is a **sourcing** path: the opportunity may have no company record at all. Legitimacy must be a recorded, auditable verdict, not an assumption. |
| **R3** | The super admin publishes company-submitted opportunities (R1) out to universities. | super admin | Broadcasting is **selective** — chosen universities, not a global blast. |
| **R4** | A university receives opportunities (R3) and **advertises them to its own students**. | `SUPERVISOR` | Scoped to that university only. |
| **R5** | A university **also sources** opportunities itself and advertises them to its own students. | `SUPERVISOR` | University-sourced opportunities skip the super admin (the university *is* the trusted verifier). |
| **R6** | A **supervisor finds an opportunity and submits it to the university**; the university may then share it with students. | `SUPERVISOR` | This is a **submission for approval**, not a publish. One hop of review. |
| **R7** | Registered students see what their university has advertised to them. | `STUDENT` | Only their **own university's** shares. Never another university's, never a company's private submission. |
| **R8** | A submission must be **clear and complete enough to onboard someone** — every fact a student needs to decide and to show up correctly. | all submitters | Drives the field inventory in §5. |
| **R9** | Fields must be planned so the submission can **later create a placement card**. | all submitters | Drives the placement-card mapping in §5.5. |
| **R10** | End-to-end functionality must not break. | — | Drives the ordering constraint in §8.2, which is the single riskiest part of this plan. |

### 1.1 The five origins, stated as one table

| Origin | Created by | First audience | To become visible to students it must pass through |
|---|---|---|---|
| Company submission | `COMPANY` | super admin only | super admin verify → super admin offer to universities → university share |
| External legit offer (sourced) | super admin | chosen universities | super admin offer → university share |
| University-sourced | `SUPERVISOR` | own university | university share (auto) |
| Supervisor submission | `SUPERVISOR` | own university | university approve → university share |
| *(shared by)* | — | students | — |

### 1.2 The relay chain, as three distinct records

The brief describes one behaviour ("advertise it on") but it is three different records with three different owners and three different audiences. Conflating them is the design mistake this plan avoids:

```
   vacancies                 opportunity_offers            opportunity_shares
 (the advert)               (super admin → university)      (university → students)
┌────────────────┐         ┌──────────────────────┐        ┌──────────────────────┐
│ moderation     │  offer  │ one per university   │ share  │ one per university   │
│ status         │────────▶│ OFFERED→ACCEPTED/    │───────▶│ SHARED→CLOSED        │
│ PENDING_REVIEW │         │ DECLINED→SHARED      │        │ + targeting filters  │
│ →PUBLISHED     │         └──────────────────────┘        └──────────────────────┘
│ →REJECTED      │
│ →WITHDRAWN     │                     ▲                          │
│ →CLOSED        │                     │                          ▼
│ →EXPIRED       │      ┌──────────────┴───────────┐      students who match
└────────────────┘      │ opportunity_submissions   │      targeting, at their
                         │ (supervisor → university) │      own university
                         │ PENDING→APPROVED/REJECTED │
                         └──────────────────────────┘
```

---

## 2. Current-state baseline (verified in code, this session — this is the ground truth)

### 2.1 What already exists

| Thing | Reality | Where |
|---|---|---|
| Advert entity | **`Vacancy`** exists: `title`(200), `description`(1000), `companyId` **NOT NULL**, `location`(200), `requirements`(1000), `status` **free-text String**, `deadline`, `createdAt` | `placement/Vacancy.java:14-51` |
| Advert API | `/api/vacancies` — GET all / by company / by status / by id; POST, PUT, DELETE gated `ADMIN,SUPERVISOR,INDUSTRIAL_SUPERVISOR,COMPANY` | `placement/VacancyController.java:33-119` |
| Company advert already works | Company POST is allowed; `companyId` forced from session (**L8 rule**); every admin notified `NEW_VACANCY` → `/admin/marketplace` | `VacancyController.java:70-82,132-144` |
| Student applies | `POST /api/applications` (`STUDENT` only), full lifecycle with a **closed `EnumMap` transition table** | `ApplicationService.java:45-57` |
| Workflow pattern to copy | Closed `EnumMap` + one `POST /{id}/transition` verb + `Status.valueOf(...)` + scope-then-role + centralised error mapping | `ApplicationService`, `ApplicationController.java:103-120` |
| Status-history pattern | Append-only table storing **Strings**, deliberately, so the trail outlives the enum | `placement/PlacementStatusHistory.java:11-19` |
| Super-admin identity | `UserEntity.superAdmin` boolean → granted authority `super_admin` per request | `CustomUserDetailsService.java:25-34`, `AuthorityRefreshFilter.java:50-60` |
| Super-admin lookup | `UserRepository.findBySuperAdminTrue()` already exists | `auth/UserRepository.java:24` |
| Student membership | `Student.universityId` (nullable scalar); `findByUniversityId`, `findByUniversityIdAndProgrammeId`, `findByUniversityIdAndSchoolId` | `StudentRepository.java:31-44` |
| Side effects on every mutation | `NotificationService.notify(List<Long>, type, title, body, link)` + `AuditLogService.log(...)` | `NotificationService.java:29`, `AuditLogService.java:17` |
| Placement | `Placement`: studentId, companyId, universityId, both supervisors (string **and** id), `Status{PENDING,OFFERED,ASSIGNED,ACTIVE,COMPLETED,CANCELLED}`, 5 timestamps | `placement/Placement.java:17-84` |

### 2.2 What does NOT exist (verified by exhaustive keyword search)

| Absent | Searched for | Result |
|---|---|---|
| The word "opportunity" | `opportunity` across all of `backend/src` + `frontend1/ims/src` | **zero matches** |
| Posting / advertisement / listing | `posting`, `advert`, `listing`, `vacancy posting` | **zero domain matches** |
| Placement card | `placement_card`, `placementCard` | **zero matches.** `Card` exists only as UI presentational components (`KpiCard`, `TableCard`, `ChartCard`) |
| An `Internship` entity | `internship` | only prose, plus `InternshipCompany` which is a *company directory* table |
| Any university ↔ advert link | `@ManyToMany`, `@JoinTable`, `@ElementCollection` | **zero in the whole codebase** — there is no join table anywhere |
| Any `status` enum for adverts | `Vacancy.status` | free-text `String`; the only value ever used is `"OPEN"` |
| A status history for adverts | — | does not exist |
| A university-side advert feed | `UniversityDashboard.js` | consumes **no** advert data at all |
| Target/audience columns on `Vacancy` | — | no universityId, no programmeId, no slots, no salary |

### 2.3 🔴 Two pre-existing defects this feature must not inherit or amplify

**D1 — advert visibility is currently unscoped and leaks.** `GET /api/vacancies` has **no `@PreAuthorize` and no scope filter**; it returns `vacancyService.findAll()`:

```java
// placement/VacancyController.java:48-51
@GetMapping
public List<Vacancy> getAllVacancies() {
    return vacancyService.findAll();          // every row, for every logged-in user
}
```

So **today any `STUDENT` can list every advert in the system.** That is the exact opposite of R1. It cannot simply be locked down, because `VacanciesSection.jsx` (student browse, mounted in `StudentDashboard.js:577`) and `AdminDashboard.js:76` both depend on it. **Fixing this without first giving those two callers a correctly-scoped replacement is what breaks student functionality.** Sequencing is handled in §8.2.

**D2 — there are two unrelated company tables.** `company` (used by `Vacancy.companyId`, `users.company_id`, `IndustrialSupervisor.companyId`) and `internship_companies` (used by `Student.internshipCompanyId`) are **not linked to each other**. Every step touching companies must state which table it means.

### 2.4 The 284-test gate

`VacancyOwnershipTest` and `ApplicationLifecycleTest` already encode behaviour we must not lose:

- `VacancyOwnershipTest:145-158` — **`ADMIN` may PUT any advert with an arbitrary `companyId` (999) and DELETE any advert.** Blanket admin rights survive.
- `VacancyOwnershipTest:66-80` — the create JSON sends `"status":"OPEN"` over the wire.
- `VacancyOwnershipTest:163-175` — creating an advert notifies every admin with type `NEW_VACANCY`.
- `ApplicationLifecycleTest:146` — builds adverts with status `"OPEN"` and applies to them.
- `MigrationCatalogCountTest` — asserts an exact user count on a fresh context, so **no phase may add seeded accounts.** All new fixtures are created at runtime (existing pattern: `AuthFlowIntegrationTest.register(...)`).

### 2.5 Type traps to respect

| Trap | Detail |
|---|---|
| `University.universityId` is **`Integer`**, not `Long` | `university/University.java:14-17`, with `getId()`/`setId(Long)` bridge accessors at `:85-86` |
| `School`/`Department`/`Programme` ids are **`Integer`**; `Course` is `Long`; `Student.{schoolId,departmentId,programmeId}` are **`Long`** | the academic hierarchy is not uniformly typed |
| `StudentController` converts with `.intValue()` | `controller/StudentController.java:582,587` |
| `Vacancy.createdAt` is `LocalDate`, but `Placement`/`Application` timestamps are `LocalDateTime` | `Vacancy.java:49` |

**Rule for this plan:** the opportunity relay keys on `Long universityId` (matching `users.university_id` and `students.university_id`), and programme/school/department targeting columns are `Integer` to match their parent tables. Conversions happen once, in the service, never in the controller.

### 2.6 Conventions every step must match

- **No Lombok** — hand-written getters/setters (`pom.xml` has no Lombok dependency).
- Status enums **nested inside the entity**, `@Enumerated(EnumType.STRING)`, with a field default.
- **Error mapping is centralised** in `controller/GlobalExceptionHandler.java`: `NoSuchElementException`→404, `IllegalArgumentException`→400, `IllegalStateException`→409, `AccessDeniedException`→403.
- **Scope first (404), then role (403)** — `AuthorizationScopeService.requireUniversityCanAct`.
- **L8 rule: never trust the body for tenancy.** Force ids from the session user.
- Response DTOs are **Java `records`** (the current house style). No `ApiResponse` wrapper exists; responses are raw.
- Read models must be **zero-filled** so charts don't interpolate (`ApplicationFunnelDto.of`).
- **Every mutation emits notification + audit log (+ history row for relay records).**
- Frontend is plain JS + react-router v6; one `ProtectedRoute`; `nav.jsx` gates by `roles[]`. **New form fields must use the shared `formControls` tokens** (`CONTROL_CLASS`, `COMPACT_CONTROL_CLASS`) — never a hand-written className.
- Tests: JUnit + MockMvc (backend), Jest + RTL (frontend).

---

## 3. Loophole register — exploit paths this feature opens

| # | Loophole | Mitigation | Step |
|---|---|---|---|
| **H1** | Company reads a rival's advert via `GET /api/vacancies` | Adverts scoped by audience; company sees only its own submissions until publish | S6.1, S7.4 |
| **H2** | Student reads another university's advert | `GET /api/opportunities` filters by `shares.university_id = student's universityId` **and** targeting match | S6.3 |
| **H3** | Student guesses `/api/opportunities/{id}` for an unshared advert | 404 (not 403) when no share row addresses them — non-existence is not disclosed | S6.4 |
| **H4** | Student sees a **closed** or **withdrawn** advert still sitting in their feed | Feed excludes non-`SHARED` share status and non-`PUBLISHED` advert status | S6.3 |
| **H5** | Company crafts `origin=ADMIN` or `status=PUBLISHED` in the POST body | `origin` and the initial `status` are **derived from the session role**, never read from the body | S3.1, S4.1 |
| **H6** | Company sets `verifiedStatus=VERIFIED` on its own advert | `verified*` columns writable only on the super-admin transition; a company POST always writes `UNVERIFIED` | S4.2 |
| **H7** | Supervisor targets students of another university | `targetUniversityId` forced from `actor.getUniversityId()`; targeted ids must belong to that university (validated, else 400) | S5.2 |
| **H8** | Supervisor forges a company `companyId` on a submission | `companyId` forced from session on `COMPANY` origin; cleared/validated for `SUPERVISOR`/`UNIVERSITY` origins which must use `externalOrgName` | S3.1 |
| **H9** | University supervisor edits another university's share | `requireUniversityCanAct` → 404 | S6.2 |
| **H10** | Student re-applies repeatedly | Existing `Application` uniqueness rules apply unchanged; the feed dedupes by `applied` flag as today | S7.2 |
| **H11** | Bulk notification to thousands of students in one transaction | Fan-out chunked + one transaction per chunk, capped; see §9 | S6.5 |
| **H12** | Advert edited after publication, silently changing what students agreed to | Edits to a `PUBLISHED` advert are versioned or require re-verification; see Open decision **D3** | S8.2 |
| **H13** | Student outside the targeted programme reads a share's offer letter | Attachments are a dedicated table (§5.11), never `documents` — `audience` is display-only and `DocumentScopeService.java:48-51` cannot express "these students at this university". Authorization comes from the S2.3 resolver, so a file is never more visible than its advert | S1.5b, S2.3, S6.7 |
| **H14** | Path traversal via a crafted `fileName`, or an orphaned blob | On-disk names are server-generated UUIDs (`FileStorageService.java:37`) and `loadFile` rejects any resolved path outside the root (`:69`). Metadata responses omit `fileName`/`storagePath`; a failed insert deletes the stored blob | S1.5b, S6.7 |

---

## 4. Target architecture

```
                       ┌────────────────────────────────────────────────────────┐
                       │ React SPA — nav.jsx gains 1 link per role, no new role │
                       └────────────────────────────────────────────────────────┘
                            │  fetch credentials:include

  ┌─────────────────────────┴──────────────────────────────────────────────────────────┐
  │ /api/opportunities                       audience-scoped reads (R7)               │
  │                                                                                    │
  │  POST   /api/opportunities            origin derived from session role   [H5][H8] │
  │  GET    /api/opportunities            student feed: shared-to-me only    [H2][H4]  │
  │  GET    /api/opportunities/inbox      super admin: unverified submissions         │
  │  GET    /api/opportunities/offers     university supervisor: offers to my uni      │
  │  GET    /api/opportunities/mine       company / supervisor: my submissions       │
  │  POST   /api/opportunities/{id}/transition   one verb, closed EnumMap → 409        │
  │  POST   /api/opportunities/{id}/offers       super admin → N universities [R3]     │
  │  POST   /api/opportunities/{id}/share        university → own students  [R4][R5]   │
  │  POST   /api/opportunities/{id}/share/close                                      │
  │                                                                                    │
  │  /api/vacancies   ← LEGACY, locked to super_admin LAST (S7.4)            [D1]     │
  │  /api/applications  ← UNCHANGED, keeps working (S0.2 locks it)                    │
  │  /api/placements    ← UNCHANGED until S8 adds vacancy_id                          │
  └────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data model

All changes are **additive** (`ddl-auto=update` handles MySQL + H2 create, matching existing practice). No column is dropped or retyped in any step except the two flagged.

### 5.1 `vacancies` — extended (the advert itself)

| Column | Type | Null | Note |
|---|---|---|---|
| `company_id` | `BIGINT` | **now NULL** | ⚠️ the only loosening: R2/R5/R6 adverts may have no company. Existing rows unaffected. |
| `origin` | `VARCHAR(20)` | NOT NULL default `COMPANY` | `COMPANY` \| `SUPER_ADMIN` \| `UNIVERSITY` \| `SUPERVISOR` — derived from role, never the body |
| `status` | `VARCHAR(20)` | NOT NULL | ⚠️ becomes a real enum column; still `String` on the wire for history-compat. Legacy `"OPEN"` accepted as an alias of `PUBLISHED` (§5.6) |
| `external_org_name` | `VARCHAR(200)` | yes | Required when `company_id IS NULL` (R2 external offer, R5, R6) |
| `source_kind` | `VARCHAR(24)` | yes | `COMPANY_DIRECT` \| `EXTERNAL_OFFER` \| `UNIVERSITY_SOURCED` \| `SUPERVISOR_SOURCED` \| `REFERRAL` |
| `source_reference` | `VARCHAR(500)` | yes | URL / letter reference / who referred. **R2's "legit offer" evidence.** |
| `verification_status` | `VARCHAR(16)` NOT NULL default `UNVERIFIED` | | `UNVERIFIED` \| `VERIFIED` \| `REJECTED` |
| `verified_by` / `verified_at` / `verification_note` | `BIGINT` / `DATETIME` / `VARCHAR(500)` | yes | Who judged it legitimate, when, why **[H6]** |
| `published_at` | `DATETIME` | yes | |
| `reviewed_at` / `review_note` | `DATETIME` / `VARCHAR(500)` | yes | Super-admin review of a submission |
| `updated_at` | `DATETIME` | yes | |
| **description** → `TEXT` | | | ⚠️ 1000 chars is too small for R8 "onboard someone". Length change only. |
| `requirements` → `TEXT` | | | same |

### 5.2 Awareness & completeness fields (R8) — all NEW on `vacancies`

| Group | Fields | Why it matters for onboarding |
|---|---|---|
| Narrative | `responsibilities` TEXT, `deliverables_expected` TEXT, `benefits` TEXT | A student must know what the day actually looks like and what they must hand over. `deliverables` also feeds evaluation at S8. |
| Skills | `required_skills` TEXT, `nice_to_have` TEXT, `tools_technologies` VARCHAR(500) | Eligibility screening. `tools_technologies` matches the existing `DayDiary.technologyTools` precedent. |
| Health & safety | `safety_orientation_required` BOOLEAN default false, `safety_notes` TEXT | Mandatory before a student can be onboarded. Often forgotten; the reason R8 exists. |
| Verification (university-sourced) | `verification_note` reused; university is the trusted verifier, so it records its own basis | Makes R5 auditable without a super-admin step |

### 5.3 Logistics fields (R8) — all NEW on `vacancies`

| Field | Type | Null | Note |
|---|---|---|---|
| `work_mode` | `VARCHAR(16)` | NOT NULL default `ONSITE` | `ONSITE` \| `REMOTE` \| `HYBRID` |
| `country` | `VARCHAR(100)` | yes | default `Uganda` to match `University.country` |
| `city` | `VARCHAR(100)` | yes | |
| `address_detail` | `VARCHAR(255)` | yes | |
| `duration_weeks` | `INT` | yes | CHECK > 0 |
| `start_date` / `end_date` | `DATE` | yes | `end_date >= start_date` |
| `is_paid` | `BOOLEAN` | yes | null = unstated; false = unpaid; true = see stipend |
| `stipend_amount` `DECIMAL(12,2)` / `stipend_currency` `VARCHAR(3)` / `stipend_period` `VARCHAR(16)` | | yes | period: `MONTHLY` \| `WEEKLY` \| `TOTAL` |

### 5.4 Eligibility, targeting & contact fields (R8/R9) — all NEW

| Group | Fields |
|---|---|
| Targeting | `target_school_ids` VARCHAR(255), `target_department_ids` VARCHAR(255), `target_programme_ids` VARCHAR(255) (comma-separated `Integer` ids, §2.5), `target_year_of_study` VARCHAR(50) (comma-separated), `target_degree_levels` VARCHAR(255), `min_cgpa` DECIMAL(4,2) |
| Capacity | `slots` INT (CHECK >= 0), `eligibility_notes` TEXT |
| Contact | `contact_person_name` VARCHAR(150), `contact_role` VARCHAR(100), `contact_email` VARCHAR(200), `contact_phone` VARCHAR(50) |
| Application | `application_instructions` TEXT, `application_email` VARCHAR(200), `application_phone` VARCHAR(50), `application_url` VARCHAR(500), `required_attachments` TEXT — a *note* about what the applicant must attach. **Uploaded files live in the dedicated `opportunity_attachments` table (§5.11), not in `documents`** — see the correction note below. |

### 5.5 Placement-card mapping (R9) — proof the fields are sufficient

A placement card must be derivable with **no re-asking**. Existing `Placement` already carries student, company, university, both supervisors and status; the advert supplies the rest:

| Placement card shows | Source | Available today? |
|---|---|---|
| Student name, number, programme | `Student` | ✅ existing |
| Host organisation | `vacancies.company_id` **or** `external_org_name` | ✅ after §5.1 |
| Role title | `vacancies.title` | ✅ existing |
| Supervisors (academic + field) + contacts | `Placement.universitySupervisorId`, `companySupervisorId` + §5.4 contact fields | ✅ existing + new |
| Internship window | `vacancies.start_date`, `end_date` | ✅ new |
| Work mode + location | `work_mode`, `city`, `address_detail` | ✅ new |
| Stipend | `is_paid`, `stipend_amount`, `stipend_currency`, `stipend_period` | ✅ new |
| Deliverables assessed | `deliverables_expected` | ✅ new |
| Attached documents (offer letter, brochure) | `opportunity_attachments` rows for the advert — filtered through the audience resolver, so a placement card never renders a file the viewer may not open `[H13]` | ✅ new in **S1.5b** |
| Traceability back to the advert | **NEW** `placements.vacancy_id` | ⬜ built in **S8.1** |
| Lifecycle status/timestamps | `Placement.Status` + 5 existing timestamps | ✅ existing |

`Placement` has **no advert link today**, so a placement currently cannot be traced back to the offer that produced it. S8.1 adds `vacancy_id` (nullable — existing placements predate adverts).

### 5.6 The advert status machine

```
PENDING_REVIEW ──verify──▶ PUBLISHED ──▶ CLOSED
      │  ▲                     │  ▲         │
      │  │ re-submit           │  │         └─ EXPIRED (deadline passed, computed)
      └──┘ REJECTED ───────────┘  └─ WITHDRAWN (originator pulls it)
```

Terminal: `REJECTED`, `CLOSED`, `EXPIRED`, `WITHDRAWN`. Implemented as a closed `EnumMap` copied from `ApplicationService.java:45-57`; anything not listed is **409**.

**Wire compatibility.** `"OPEN"` is accepted as a legacy alias of `PUBLISHED` in the parser (`Status.parse`), so `VacancyOwnershipTest`'s `"status":"OPEN"` JSON and `ApplicationLifecycleTest`'s `"OPEN"` constructor argument keep passing **without editing those tests**. Any other unrecognised value is 400.

**🔴 The apply gate must change in the same step — found in Phase 0.** This alias is *not* sufficient, and the plan originally missed it. Whether a student may apply is decided here:

```java
// placement/ApplicationService.java:85-87
if (!"OPEN".equalsIgnoreCase(vacancy.getStatus())) {
    throw new IllegalStateException("This vacancy is no longer open.");
}
```

The alias protects rows **already written** as `"OPEN"`. It does nothing for rows **written after** the change: a super-admin-published advert carries `"PUBLISHED"`, and `"OPEN".equalsIgnoreCase("PUBLISHED")` is `false`. So the day the enum lands, **every correctly published opportunity silently becomes un-appliable** — 409 on apply, no compile error, no failing test, because every existing apply test uses the `"OPEN"` fixture.

Two consequences for S1.7:
1. The gate must become membership of the *new* vocabulary, not a comparison against `"OPEN"`. Decide and document which statuses are admissible: **recommend `PUBLISHED` only** (`PENDING_REVIEW` is precisely R1's private state).
2. An unknown status becomes a **400 rather than a 409** once the column is an enum. That is a real behaviour change, so it is a decision to make on purpose rather than a free side effect.

`ApplicationAdvertStatusGateTest` (committed in Phase 0) pins all of this and fires on the change — it was verified to fail with `expected:<409> but was:<201>` when `PUBLISHED` was admitted.

### 5.7 `opportunity_offers` — NEW (super admin → university, R3)

`id`, `vacancy_id` NN, `university_id` NN (**`Long`**), `status` NOT NULL default `OFFERED`, `note` VARCHAR(500), `offered_by` NN, `offered_at` NN, `responded_by`, `responded_at`, `response_note` VARCHAR(500). **UNIQUE (`vacancy_id`,`university_id`)**, index (`university_id`,`status`).

Status: `OFFERED → ACCEPTED | DECLINED`, `ACCEPTED → SHARED | CLOSED`. Terminal `DECLINED`, `CLOSED`.

### 5.8 `opportunity_shares` — NEW (university → students, R4/R5/R6)

`id`, `vacancy_id` NN, `university_id` NN, `offer_id` **nullable** (null when the university sourced it itself — R5), `status` NOT NULL default `SHARED`, `note` VARCHAR(500), `shared_by` NN, `shared_at` NN, `closed_at`, `closed_by`. Plus the targeting columns **duplicated onto the share** (`target_programme_ids`, `target_department_ids`, `target_year_of_study`) — because the university may narrow the audience on the way down, and we must not let the university widen beyond what the super admin offered.

**UNIQUE (`vacancy_id`,`university_id`)** — one live share per university per advert.

Status: `SHARED → CLOSED`. Terminal `CLOSED`.

### 5.9 `opportunity_submissions` — NEW (supervisor → university, R6)

`id`, `vacancy_id` NN, `university_id` NN (forced from session), `submitted_by` NN, `submitted_at` NN, `status` NOT NULL default `PENDING`, `note` VARCHAR(500), `reviewed_by`, `reviewed_at`, `review_note` VARCHAR(500). **UNIQUE (`vacancy_id`)**.

Status: `PENDING → APPROVED | REJECTED`. Terminal `REJECTED`. On `APPROVED` the university may then call `POST /{id}/share` (R6's second half).

### 5.10 `opportunity_status_history` — NEW (audit trail for all three)

`id`, `vacancy_id` NN, `university_id` **nullable** (null = advert-level transition; set = relay transition), `relay_type` nullable (`OFFER` \| `SHARE` \| `SUBMISSION`), `from_status` VARCHAR(20) nullable, `to_status` VARCHAR(20) NOT NULL, `changed_at` NOT NULL, `changed_by` NOT NULL. Index (`vacancy_id`,`changed_at`).

**Statuses stored as `String`, not the enum** — copied from `PlacementStatusHistory.java:11-19` so the trail survives a vocabulary change.

### 5.11 `opportunity_attachments` — NEW (advert files: offer letters, brochures)

Chosen over extending `DocumentScopeService` because that predicate is shared with File Management, which works today and has its own passing tests (`DocumentScopeTest`, `FileAccessScopeTest`, `DocumentScopeBackfillTest`). This feature is new, so there is no legacy attachment data to migrate and no reason to put a shared predicate at risk.

| Column | Type | Null | Note |
|---|---|---|---|
| `id` | `BIGINT` | PK IDENTITY | |
| `vacancy_id` | `BIGINT` | NOT NULL | plain scalar, house style — no `@ManyToOne` |
| `university_id` | `BIGINT` | **yes** | null = advert-level file (super admin + the advertising side). Set = shared with one university's students |
| `target_programme_ids` | `VARCHAR(255)` | yes | narrows who may read it, mirroring §5.8 |
| `target_year_of_study` | `VARCHAR(50)` | yes | |
| `file_name` | `VARCHAR(255)` | NOT NULL | **server-generated UUID**, never the client's name |
| `original_file_name` | `VARCHAR(255)` | NOT NULL | display only |
| `content_type` | `VARCHAR(120)` | NOT NULL | |
| `file_size` | `BIGINT` | NOT NULL | |
| `storage_path` | `VARCHAR(500)` | NOT NULL | relative to the storage root |
| `uploaded_by` | `BIGINT` | NOT NULL | |
| `uploaded_at` | `DATETIME` | NOT NULL | |

Indexes: `(vacancy_id)`, `(university_id)`.

**Blob storage is reused; authorization is not.** `FileStorageService` is reused for the bytes because it already does the two things that matter — it stores under a `UUID` filename (`FileStorageService.java:37`) and rejects any resolved path escaping the storage root (`:69`), which closes path traversal `[H14]`. What is **not** reused is `DocumentScopeService`: authorization comes from the S2.3 audience resolver — the same resolver that decides whether the caller may read the advert itself. **A file is never more visible than its advert.**

**Audience for a file** — super admin always; the advertising side (owning company, or offering university); and, for a `SHARED` advert, only students at `university_id` whose programme/year matches the targeting columns. Anyone else is a **404**, not a 403, so the endpoint is not a probing oracle.

---

## 6. API contracts

Notation: ★ new · ◆ changed · ○ reused · 🔒 super-admin only · `(R#)` requirement · `[H#]` loophole

### 6.1 Advert lifecycle
| Method | Path | Gate | Notes |
|---|---|---|---|
| ★ POST | `/api/opportunities` | `COMPANY,SUPERVISOR,ADMIN` | `origin` + initial `status` **derived from session** `[H5]`; `companyId` forced (L8) `[H8]`; `verification_status` always `UNVERIFIED` `[H6]` |
| ★ GET | `/api/opportunities/mine` | `COMPANY,SUPERVISOR` | own submissions + current status |
| ★ GET | `/api/opportunities/{id}` | any authenticated | **404** unless the caller is in the audience `[H3]` |
| ★ GET | `/api/opportunities/{id}/history` | audience | merged advert+relay history |
| ★ POST | `/api/opportunities/{id}/transition` | audience-scoped | one verb, closed `EnumMap`, illegal → **409** |

### 6.2 Super admin (R2/R3)
| Method | Path | Gate | Notes |
|---|---|---|---|
| ★ GET | `/api/opportunities/inbox` | 🔒 | company submissions awaiting verification — **R1's only audience** |
| ★ POST | `/api/opportunities/{id}/offers` | 🔒 | body `{universityIds:[…], note}` → creates offers, notifies each university's supervisors (R3) |

`R2` (super admin sources a legit offer) is *not* a separate endpoint: a super admin POSTs to the same `/api/opportunities` and their session makes `origin=SUPER_ADMIN` + `status=PUBLISHED` + `verification_status=VERIFIED`, with `source_kind=EXTERNAL_OFFER` and `source_reference` required.

### 6.3 University (R4/R5/R6)
| Method | Path | Gate | Notes |
|---|---|---|---|
| ★ GET | `/api/opportunities/offers` | `SUPERVISOR,ADMIN` | offers addressed to my university, `universityId` forced from session |
| ★ POST | `/api/opportunities/{id}/offers/{offerId}/respond` | `SUPERVISOR` | `{decision: ACCEPTED\|DECLINED, note}`; cross-university offer → 404 `[H9]` |
| ★ GET | `/api/opportunities/submissions` | `SUPERVISOR,ADMIN` | supervisor submissions to my university |
| ★ POST | `/api/opportunities/{id}/submissions/{submissionId}/respond` | `SUPERVISOR` | `{decision: APPROVED\|REJECTED, note}` (R6) |
| ★ POST | `/api/opportunities/{id}/share` | `SUPERVISOR` | body `{target:{programmeIds,departmentIds,yearsOfStudy}, note}`; `universityId` forced `[H7]`; offered-audience not widenable (5.8) |
| ★ POST | `/api/opportunities/{id}/share/close` | `SUPERVISOR` | pulls it from the student feed; students notified |
| ★ GET | `/api/opportunities/shared` | `SUPERVISOR,ADMIN` | what my university has shared |

### 6.4 Student (R7)
| Method | Path | Gate | Notes |
|---|---|---|---|
| ★ GET | `/api/opportunities` | `STUDENT` | **audience-scoped feed**: shares at my university, `status=SHARED`, advert `PUBLISHED`, not past deadline, matching my targeting `[H2][H4]` |
| ★ GET | `/api/opportunities/{id}` | `STUDENT` | 404 unless a live share addresses me `[H3]` |
| ○ POST | `/api/applications` | `STUDENT` | **unchanged** — applications already carry `vacancyId` |

### 6.5 Legacy endpoints — changed LAST
| Method | Path | Change |
|---|---|---|
| ◆ GET | `/api/vacancies` | `@PreAuthorize("hasAuthority('super_admin')")` — closes D1. **Only after S7.3 repoints both callers.** |
| ◆ GET | `/api/vacancies/company/{companyId}` | superseded by `/api/opportunities/mine`; restrict to the caller's own company |
| ◆ GET | `/api/vacancies/status` | superseded by the scoped feed |
| ◆ GET | `/api/vacancies/{id}` | 🔒 **the fourth read, and the one an earlier draft of this plan forgot.** Also ungated (`VacancyController.java:63`), so gating only the three above would close the list and leave every single advert readable by id — R1 still violated behind a green test suite. Superseded by `GET /api/opportunities/{id}`; until that exists, gate it to `super_admin`. |
| ★ GET | `/api/opportunities/{id}` | audience-scoped via S2.3; **404** when out of audience, never 403 `[H3]` |
| ○ POST/PUT/DELETE | `/api/vacancies` | **kept working unchanged.** `VacancyOwnershipTest:145-175` depends on it, including the admin `companyId:999` override and the `NEW_VACANCY` notification. Internally rewritten to delegate to the opportunity service so there is one code path, but the HTTP contract and the test's expectations are preserved. |

> **All four reads, not three.** `VacancyController` has four ungated GETs (`:48`, `:53`, `:58`, `:63`). Closing three leaves the fourth. The S0.1 baseline already caught this: gating `getAllVacancies` alone turned exactly three assertions red and left `studentCanCurrentlyReadASingleVacancyById` green — because it was still wide open.

### 6.6 Attachments (§5.11)

Not a legacy surface, so it lives outside §6.5.

| Method | Path | Gate | Notes |
|---|---|---|---|
| ★ POST | `/api/opportunities/{id}/attachments` | super admin, or the advertising side (owning company / offering university). **`companyId`/`universityId` never read from the body** | `multipart/form-data`; `vacancyId` comes from the path. Bytes → `FileStorageService.storeFile`; the row stores the **generated** `fileName`, never the client's. Targeting columns validated the same way as §5.8. On failure to persist the row, the stored blob is deleted — never orphan a file `[H14]` |
| ★ GET | `/api/opportunities/{id}/attachments` | audience resolver: super admin, advertising side, or a targeted student | A file with `universityId = null` is **advert-level** and is listed for the super admin and the advertising side, but is **omitted from a student's listing** — a student never sees a file that was not targeted at them |
| ★ GET | `/{attachmentId}/download` | same resolver, **404** for anyone else | Serves `original_file_name` as a download name while `file_name` stays the on-disk UUID |
| ★ DELETE | `/api/opportunities/{id}/attachments/{attachmentId}` | uploader, advertising side, or super admin | Deletes the row **and** the blob via `FileStorageService.deleteFile`. A student can never delete |

`GET` returns metadata only (`id`, `originalFileName`, `contentType`, `fileSize`, `uploadedAt`) — never `fileName` or `storagePath`, so the on-disk UUID never reaches a client that could try to guess a path `[H14]`.

---

## 7. UI changes (file-by-file)

| File | Change | Step |
|---|---|---|
| `components/layout/nav.jsx` | Add `Briefcase` links: "Opportunities" for `COMPANY` (Management), "Opportunity Inbox" for `ADMIN`, "Advertise Opportunity" for `SUPERVISOR`, **no new nav for `STUDENT`** (the feed is a tab in the existing dashboard, matching how `VacanciesSection` is mounted) | per phase |
| `components/dashboards/AdminDashboard.js:76` | **Repoint the advert count** off `fetchVacancies()` → `/api/opportunities/inbox`. *Must land before S7.4.* | S7.3 |
| `components/dashboards/VacanciesSection.jsx` | **Repoint to `/api/opportunities`**, add targeting/salary/work-mode chips, and show "withdrawn/closed" states. *Must land before S7.4.* | S7.2 |
| `components/ui/OpportunityCard.jsx` ★ | Shared presentational card used by all four audiences; shows only the fields the viewer is entitled to | S7.1 |
| `components/dashboards/OpportunityForm.jsx` ★ | The R8 submission form — the field inventory in §5.2–5.4, grouped into collapsible sections with a completeness meter. **All controls use `CONTROL_CLASS` / `COMPACT_CONTROL_CLASS`; no hand-written classNames** | S3.1 |
| `components/dashboards/OpportunitiesSection.jsx` ★ | Student feed tab, replacing `VacanciesSection`'s role | S7.2 |
| `components/dashboards/OpportunityInbox.jsx` ★ | Super admin: verify/reject with a required note, then multi-select universities to offer to | S5.1 |
| `components/dashboards/OfferInbox.jsx` ★ | University supervisor: accept/decline offers, review supervisor submissions, share to students with targeting | S6.1, S6.3 |
| `components/dashboards/OpportunityHistory.jsx` ★ | Renders `opportunity_status_history` | S8.2 |
| `services/api.js` | Add `createOpportunity`, `fetchMyOpportunities`, `fetchOpportunityFeed`, `fetchOfferInbox`, `respondToOffer`, `respondToSubmission`, `shareOpportunity`, `closeShare`, `fetchOpportunityHistory`, `fetchOpportunityInbox`, `offerToUniversities`. **Keep `fetchVacancies` exported** — it is still live until S7.4 | per phase |
| `App.js` | No new top-level routes required if each audience gets a dashboard section; **a standalone `/opportunities` route only if the student feed needs its own page** | S7.2 |

---

## 8. Phased execution guide

Every step = **one branch → its own tests → gate → ff-merge → one commit.** Steps are ordered so that **no step leaves the app in a state where a user can see less than before.**

### 8.1 Phase 0 — Baseline lock (nothing user-visible changes)

| Step | Goal | Work | Tests | Commit |
|---|---|---|---|---|
| **S0.1** ✅ `db003d9` | Characterise current advert visibility so we can prove D1 gets closed and nothing else regresses | Add `VacancyVisibilityBaselineTest`: `STUDENT` currently **can** list all adverts (asserts today's leaky behaviour, clearly named as the defect) | new | `test(vacancy): pin current unscoped advert visibility` |
| **S0.2** ✅ `43d263a` | Lock the applications path that must survive everything | Assert `POST /api/applications` against a `"OPEN"` advert still reaches `SUBMITTED`, and `GET /api/applications/funnel` still zero-fills | new — landed as `ApplicationAdvertStatusGateTest` (apply path + the gate set); the funnel half was already pinned by PC9's `ApplicationLifecycleTest.companyFunnelIsZeroFilledAndReconcilesWithTheApplicantList` | `test(applications): pin the apply gate that the status enum will break` (actual subject; the row above named a file/subject that were never used) |
| **S0.3** ✅ (no commit) | Snapshot the full pre-change gate | Run and record — **measured 2026-10-03 at `43d263a`**: backend **303** (284 baseline + 19 new), frontend **25 suites / 166 tests**, eslint **0 errors / 9 warnings**, build **compiled with warnings** | — | (no commit — recorded in §8.1.1 below) |
| **S0.5** ✅ (no commit) | Learn the discipline this plan is built on | Every schema step fault-injected its own tests. Two dead assertions found this way: the S1.3 feed test passed with the status filter removed because its withdrawn share belonged to a different university. **A test that survives the fault it was written to catch is worse than no test** — it reads as coverage | — | (recorded here; no code change) |
| **S0.4** ✅ `cdca2fc` | Re-audit the plan against the code before writing feature code | Found two gaps: `GET /api/vacancies/{id}` unmentioned, and the `documents`/`audience` attachment reuse unusable. Corrected in §5.11, §6.5, §6.6, §3 (H13/H14), D8 | markdown table-column check across the whole document | `docs(opportunities): close two security gaps the first draft missed` |

**Gate after Phase 0:** identical to the recorded baseline.

#### 8.1.1 Phase 0 result — measured baseline

| Gate | Value at `43d263a` |
|---|---|
| Backend `./start.sh clean test` | **303 passed**, 0 failures (284 + `VacancyVisibilityBaselineTest` 8 + `ApplicationAdvertStatusGateTest` 11) |
| Frontend `react-scripts test` | **25 suites / 166 tests** passed |
| ESLint | **0 errors / 9 warnings** (pre-existing) |
| Build | **compiled with warnings** (no new ones) |

Two findings from doing Phase 0, both folded back into this plan:

1. **The apply gate (`ApplicationService.java:85`) would have died at S1.7** — a dead end-to-end path that no existing test would have caught. Now called out in §5.6 and added to S1.7 as in-scope work. This is the concrete payoff of pinning behaviour before changing it.
2. **`fetchVacancies` has six live references, three of them test mocks** — recorded in S7.3/S7.5 so the repoint cannot half-land and break three suites.

### 8.2 Phase 1 — Schema foundation (additive; zero behaviour change)

| Step | Goal | Work | Tests | Commit |
|---|---|---|---|---|
| **S1.1** ✅ `05dd28d` | Add columns to `vacancies` (5.1–5.4) | Entity fields + getters/setters, no Lombok; `companyId` → nullable; `description`/`requirements` → `TEXT`; `origin`/`verification_status` defaults | `OpportunitySchemaTest`, **13 tests** — every new column forced through a real `INSERT`/`SELECT` round trip (H2 builds its schema from the annotations and never reads the S1.6 migration, so an annotation-vs-DDL mismatch is otherwise untestable). `companyId`-nullable and the `TEXT` change both fault-injected and confirmed to fail when reverted | `feat(opportunities): add the advert field inventory` |
| **S1.2** ✅ `bcfedda` | `opportunity_offers` | Entity + repository (UNIQUE + index); `findByIdForUpdate` copies the `PESSIMISTIC_WRITE` lock from `RoleRequestRepository` so two supervisors cannot accept one offer at once | `OpportunityOfferRepositoryTest`, **10 tests**. Duplicate-offer rejection proven against the constraint directly, bypassing `existsBy…`, so it fails if the constraint is dropped. Both fault-injected: removing the constraint, and substituting a finder that ignores `university_id` `[H9]` | `feat(opportunities): add the super-admin-to-university offer record` |
| **S1.3** ✅ `f6fbe2f` | `opportunity_shares` | Entity + repository; targeting columns duplicated onto the share so S6.3 can ask "is this wider than its offer?" as a column read; `offer_id` nullable and meaningful for R5/R6 | `OpportunityShareRepositoryTest`, **14 tests**. Pins that the feed finder filters on status itself rather than trusting the caller, that `offer_id = null` survives, and that share targeting is independent of the advert's. Duplicate rejected against the constraint, bypassing `existsBy…` | `feat(opportunities): add the university-to-students share record` |
| **S1.4** ✅ `10d450b` | `opportunity_submissions` | Entity + repository | repository test (10) | `feat(opportunities): add the supervisor submission record` |
| **S1.5** ✅ `ebef4be` | `opportunity_status_history` | Entity + repository | repository test (10) | `feat(opportunities): add the relay audit trail` |
| **S1.5b** ✅ `09fa5e1` | `opportunity_attachments` (§5.11) | Entity + repository. Columns exactly as §5.11: `university_id` **nullable**, server-generated `file_name` separate from `original_file_name`, targeting columns. Indexes `(vacancy_id)`, `(university_id)`. No `@ManyToOne` — house style is plain scalars | landed as `OpportunityAttachmentRepositoryTest` (11, the schema half): a `university_id`-null advert-level row and a targeted row coexist on one advert; repository returns only rows for a given `vacancy_id`/`university_id` | `feat(opportunities): add the dedicated advert attachments table` |
| **S1.6** ✅ `fca6f03` | Migration DDL + backfill | `backend/migration/add_opportunity_propagation.sql`: add columns, backfill `origin='COMPANY'` and `status='PUBLISHED'` where `status='OPEN'`, create tables/indexes — **including `opportunity_attachments` and its two indexes**. **Additive only — no drops** | `MigrationCatalogCountTest` still green; landed as `OpportunityMigrationDdlTest` (17, DDL-vs-entity mirror + `theBackfillRewritesEveryOpenStatusRegardlessOfCase` + `theScriptDropsNothing`) on H2 | `feat(opportunities): migration DDL and the test that keeps it honest` (actual subject) |
| **S1.7** ✅ `b0e8237` | Enums + parsers | Nested `Opportunity.Status`, `Opportunity.Offer.Status`, `Share.Status`, `Submission.Status`, `Origin`, `VerificationStatus`, `WorkMode`, `SourceKind` + `Status.parse` accepting legacy `"OPEN"`. ⚠️ **Also rewrite the apply gate at `ApplicationService.java:85` in this same commit** — see the 🔴 note in §5.6. Leaving it comparing against `"OPEN"` kills the entire apply path. Two extras the implementation forced: `HttpMessageNotReadableException` → 400 in `GlobalExceptionHandler` (a bad status on the wire was a 500, not a 400), and both frontend `vacancy.status` call sites (`VacanciesSection.jsx`, `AdminDashboard.js`) accept `OPEN` **and** `PUBLISHED` so nothing user-visible changes before S7.2/S7.3 repoint them | `OpportunityStatusParseTest` (30): `OPEN`→`PUBLISHED`, unknown→400, case/trim tolerant. `ApplicationAdvertStatusGateTest` **inverted** here (21): `PUBLISHED` becomes appliable, `PENDING_REVIEW` stays refused | `feat(opportunities): status enums with legacy OPEN alias` |

**Gate after Phase 1 — measured at `b0e8237`:** backend **428** / 0 failures · frontend **25 suites / 166 tests** · eslint **0 errors / 9 warnings** (pre-existing) · build OK (+92 B). Nothing user-visible has changed — the two frontend `vacancy.status` call sites accept both spellings precisely so this holds.

### 8.3 Phase 2 — Transition engine (no new endpoints)

| Step | Goal | Work | Tests | Commit |
|---|---|---|---|---|
| **S2.1** ✅ `cca616f` | `OpportunityTransitionService` | Closed `EnumMap` per relay type, copied from `ApplicationService:45-57`; scope-first-404 then role-403 then illegal→409; writes a history row | `OpportunityTransitionTest`, **26 tests** — the full cross product of all four machines against tables hard-coded in the test, scope-404/role-403 pins, side-field assertions. Fault-injected both guards: removing legality fails exactly the 5 illegal/terminal suites, removing offer scope fails exactly the H9 test | `feat(opportunities): closed transition engine for every relay` |
| **S2.2** ✅ `fe2c085` | Side effects on every transition | `NotificationService.notify` + `AuditLogService.log` wired into the service (never the controller), matching `PlacementPipelineService:82-86` | `OpportunityTransitionSideEffectsTest`, **10 tests** — exactly-one audit rows across a two-step lifecycle, catalog types per event, rival company / other university hear nothing, refused transitions emit nothing. Fault-injected the notify call: exactly the 4 notification tests go red. Student fan-out deliberately deferred to S6.5/S6.6 `[H11]` | `feat(opportunities): notify and audit every transition` |
| **S2.3** ✅ `82dd6f6` | Audience resolution — **the security core** | One service that answers "may this actor see this advert, and in what capacity" for all 5 origins × 6 actors, consumed by every later read/write | `OpportunityScopeTest`, **7 tests** — the whole policy as one 4-origin × 9-actor data table, state rules (closed/withdrawn/unmoderated invisible), the 404-not-403 `requireVisible` shape. Fault-injected the live-share check: exactly the H4 test goes red. `OpportunityTransitionService` keeps its deliberately stricter **action** scope — seeing never implies acting | `feat(opportunities): single audience resolver for every origin` |

**Gate after Phase 2:** full suite green; still zero behaviour change.

### 8.4 Phase 3 — Submission (R1, R2, R5, R6 origins)

| Step | Goal | Work | Tests | Commit |
|---|---|---|---|---|
| **S3.1** ✅ `79bd20b` | `POST /api/opportunities` | `origin` + initial `status` derived from session role `[H5]`; `companyId` forced (L8) `[H8]`; `verification_status` forced `UNVERIFIED` `[H6]`; `universityId` forced for SUPERVISOR/UNIVERSITY (materialised as the relay link: S3.2's submission row for R6, S6.3's share for R5 — `vacancies` carries no university column by D1); `external_org_name` required when no company; validate date order, `slots>=0`, `duration_weeks>0`, targeting ids belong to the actor's university | `OpportunitySubmissionTest`, **15 tests**: each role's derived origin; every body-supplied `origin`/`status`/`companyId`/`verified` ignored (fault-injected a body-trusting status — exactly the two forgery tests go red); cross-university targeting ids → 400; 403 door for students/field supervisors; notify+audit split. Decisions: the supervisor's R5-vs-R6 split keys on `sourceKind=UNIVERSITY_SOURCED` (evidence, not authority — origin still derives from the session); a plain `ADMIN` without the `super_admin` flag posts into `PENDING_REVIEW` | `feat(opportunities): submission endpoint with role-derived origin` |
| **S3.2** ✅ `3719047` | Supervisor submission record (R6) | Creating with `origin=SUPERVISOR` also writes `opportunity_submissions` PENDING — `universityId` from the session (the body has no such field to forge `[H7]`). §9 announcement split lands here: R6 proposals go to their university's supervisors (`OPPORTUNITY_SUBMISSION`), **not** the super admins; supervisor accounts without a university → 403 at derivation | `OpportunitySubmissionTest` grows to **20 tests**: the forced-tenancy row, R6 visibility (own queue ✓ / other university ✗ / student of the same university ✗ — resolver NONE), no row for company or R5 posts, university-less supervisor refused. Fault-injected the row save: exactly the two R6 tests go red | `feat(opportunities): supervisor submissions await university review` |
| **S3.3** ✅ `dc52c05` | `GET /api/opportunities/mine` | Company and supervisor see their own submissions + status | `OpportunitySubmissionTest` grows to **24 tests**: rival exclusion `[H1]`, peer exclusion `[H9]`, status in payload, 403/404 door. Fault-injected the company scope: exactly the rival test goes red. Sequencing note recorded in-code: R5's university-sourced adverts appear at S6.3's `/shared` (no creator column by D1) | `feat(opportunities): my-submissions feed` |
| **S3.4** ✅ `83f075a` | `OpportunityForm.jsx` | The R8 form, §5.2–5.4 fields, `CONTROL_CLASS`/`COMPACT_CONTROL_CLASS` only, completeness meter | `formControls.test.js` still green; `OpportunityForm.test.js` **5 tests** — minimal-valid trio, full typed payload, empty-field dropping, verbatim server error, targeting shown to a supervisor and hidden from a company | `feat(opportunities): the complete submission form` |

### 8.5 Phase 4 — Super admin moderation (R1's gate, R2)

| Step | Goal | Work | Tests | Commit |
|---|---|---|---|---|
| **S4.1** ✅ `5fac74d` | 🔒 `GET /api/opportunities/inbox` | Super-admin-only (`super_admin` flag, not the `ADMIN` role — the controller narrows to `ADMIN`, the service then checks the flag), `verification_status=UNVERIFIED` + `status=PENDING_REVIEW`, newest first | `OpportunityInboxTest`, **7 tests**: `STUDENT`, `SUPERVISOR`, `COMPANY`, plain `ADMIN` → 403, anonymous → 401; **`STUDENT` cannot see a company's submission** (R1, the headline); born-published and already-judged rows never enter the queue. Fault-injected the gate (authority + flag): exactly the 4 gate tests flip 403→200 | `feat(opportunities): super-admin moderation inbox` |
| **S4.2** ✅ `b17ebcf` | Verify / reject | `POST /{id}/transition` wired to the S2.1 engine: **required** verification note on a verdict (D7 — both `verification_note`/`verificationNote` accepted), sets `verified_by/at` + `verification_note` + `verification_status` (row leaves the inbox queue); `PENDING_REVIEW→PUBLISHED` or `→REJECTED`; notifier + audit already engine-side. Scope 404 → role 403 → legality 409 **before** note validation, so an illegal jump stays 409 | `OpportunityVerifyRejectTest`, **10 tests**: both verdicts record fields + notify + one history row, reject/verify without a note → 400 (row untouched), only super admin verifies `[H6]` (plain admin + owner → 403, stranger → 404, student/field supervisor → 403, anonymous → 401), unknown/missing status → 400, terminal → 409. Fault-injected note + role checks: exactly the 3 guarded tests go red. S2.1/S2.2 suites updated to pass notes, verdict-loop now asserts the [H6] fields | `feat(opportunities): verify or reject a submission` |
| **S4.3** ✅ `87c0f45` | `OpportunityInbox.jsx` | Super-admin UI: inbox list, per-row note-gated Verify/Reject, verbatim server errors in `role="alert"`, success in `role="status"` + row retired; `/admin/opportunities` route + nav entry (the S2.2 notification link target); `fetchOpportunityInbox`/`transitionOpportunity` API wrappers. **Multi-select universities + offer deferred to S5.1** (the offers endpoint does not exist yet) | `OpportunityInbox.test.js`, **7 tests**: renders origins/provenance, verify flow, reject flow, blank note cannot be sent, server refusal verbatim + row stays, empty state, failed load verbatim | `feat(opportunities): super-admin inbox UI for verify/reject decisions` |

### 8.6 Phase 5 — Super admin → university (R2/R3)

| Step | Goal | Work | Tests | Commit |
|---|---|---|---|---|
| **S5.1** ✅ `6774477` | 🔒 `POST /{id}/offers` | Body `{universityIds[], note}` via `OpportunityOfferCreateRequest`; super-admin flag [H6] → advert `PUBLISHED` 409 → all ids validated **before any write** (a bad batch leaves zero rows) → duplicate 409 (UNIQUE). Each offer writes its §5.10 history row (from `null`), notifies that university's `SUPERVISOR` users (`OPPORTUNITY_OFFERED`, §9, recipients server-side [L15]), audits `OPPORTUNITY_OFFERED`. Inbox UI: a verified row steps into a multi-select offer panel (publishing is when R3 applies); reject still retires the row | `OpportunityOfferTest`, **17 tests**: broadcast + note + history/audit, recipients scoping (offered ✓ / not-offered ✗), plain admin/door/anonymous gates, unknown id rejects the whole batch atomically, empty list, overlong note, re-offer 409, `PENDING_REVIEW`/`WITHDRAWN` 409, missing advert 404, in-batch duplicate collapses to one, missing `universityIds` 400, response echoes. Fault-injected all five guards (flag, state, existence, duplicate, notify) in one run: exactly the 6 guarded tests flipped | `feat(opportunities): broadcast adverts to chosen universities` |
| **S5.2** ✅ `873605c` | `GET /offers` + `respond` | `GET /offers` forces `universityId` from the session (no id in the request to tamper with `[H9]`); `POST /{id}/offers/{offerId}/respond` gated `SUPERVISOR` only (even a super admin is refused — D2), decision parsed at the door (missing/unknown/`SHARED` → 400) and anchored to the path's advert id (offer under another advert → 404); optional response note ≤500 checked **before** the row is touched; answer reuses the S2.1 engine (scope 404 → role 403 → legality 409) with `respondedBy/at` + `response_note` + history + `OPPORTUNITY_OFFER_ANSWERED`. `fetchOfferInbox`/`respondToOffer` wrappers landed in `api.js` | `OpportunityOfferRespondTest`, **15 tests**: own-university scoping + status/provenance payload, student/company/anonymous/no-university doors, accept records fields + history + notice, decline shape, optional-but-capped note (refused → row still `OFFERED`), only-supervisor gate (incl. super admin → 403), missing/unknown decision → 400, **cross-university → 404 not 403 `[H9]`** (×2, list + respond), path-anchor replay → 404, missing offer → 404, no second answer (first stands, one history row), declined terminal. Fault-injected the four guards this step adds (path anchor, note cap, list tenancy, decision vocabulary): exactly the 6 guarded tests flip | `feat(opportunities): universities respond to offers` |

### 8.7 Phase 6 — University → students (R4/R5/R6)

| Step | Goal | Work | Tests | Commit |
|---|---|---|---|---|
| **S6.1** ✅ `a7029f2` | `GET /offerInbox` + accept | Landed as the **UI + route** half: the endpoints themselves arrived with S5.2 (`GET /offers`, `respond`, `OPPORTUNITY_OFFER_ANSWERED` → super admin), so S6.1 delivers `OfferInbox.jsx` + `/university/opportunities` — the target the S3.2/S5.1 notification links have pointed at all along — plus nav entry. Answer rows keep their outcome (a second answer is the engine's 409); refusals shown verbatim with the form left open. ⚠️ The "cannot share an offer that was never accepted" test is **deferred to S6.3** where the share endpoint it guards actually exists | `OfferInbox.test.js`, **8 tests**: list + provenance/status, accept flow (verb + note + row update, controls disappear), decline flow, optional note reaches the endpoint as `undefined`, refusal verbatim + row stays `OFFERED`, answered row keeps outcome with no controls, empty state, failed load verbatim | `feat(opportunities): university offer inbox` |
| **S6.2** | Review supervisor submissions (R6) | `PENDING→APPROVED/REJECTED` with note; on APPROVED the share endpoint unlocks | supervisor cannot approve their own submission's share without approval | `feat(opportunities): university reviews supervisor submissions` |
| **S6.3** | `POST /{id}/share` + targeting | Creates `opportunity_shares`; `universityId` forced from session `[H7]`; targeting ids validated against the university; **may narrow the offered audience, never widen it** (5.8); fan-out to matching students, chunked `[H11]` | supervisor of another university → 404; widening an offer's targeting → 400/409 | `feat(opportunities): universities share adverts with their students` |
| **S6.4** | Student feed `GET /api/opportunities` | Audience-scoped via S2.3: my university + `SHARED` + `PUBLISHED` + not past deadline + targeting match `[H2][H4]`; zero-filled metadata so counts don't interpolate | **the R7 matrix**: student sees own university's share; another university's student does not; closed/withdrawn share invisible; guessing `/id` → 404 `[H3]` | `feat(opportunities): the student opportunity feed` |
| **S6.5** | Chunked student notification | Chunked fan-out, one transaction per chunk, cap + log when truncated `[H11]` | 5k-student fixture: all receive it, no single huge transaction | `feat(opportunities): chunked notification fan-out` |
| **S6.6** | `close share` | `SHARED→CLOSED`, students notified, feed excludes it | closed share invisible to students | `feat(opportunities): universities can withdraw a share` |
| **S6.7** | Attachments (§5.11, §6.6) | The four endpoints in §6.6: upload / list / download / delete. Blob via `FileStorageService`; **authorization via the S2.3 audience resolver, never `DocumentScopeService`**. Advert-level (`university_id IS NULL`) files are omitted from a student's listing; metadata responses omit `fileName`/`storagePath`; delete removes row **and** blob; a failed insert deletes the blob `[H14]` | full `OpportunityAttachmentScopeTest`: owner ✓, super admin ✓, targeted student ✓, **untargeted student at the same university → 404** `[H13]`, other university → 404, student cannot delete, traversal blocked. Plus a **fault-injection run** proving each negative test actually fails when the resolver is stubbed to allow-all | `feat(opportunities): attach and gate advert documents` |

### 8.8 Phase 7 — Close the leak D1 (**highest-risk sequencing in this plan**)

> **Why this order is mandatory.** `GET /api/vacancies` currently leaks every advert to every logged-in user (D1). Tightening it *before* its callers are repointed would leave students with an empty browse list — the exact regression R10 forbids. So: repoint **first**, tighten **second**, in separate commits, so each is independently revertible.

| Step | Goal | Work | Tests | Commit |
|---|---|---|---|---|
| **S7.1** | `OpportunityCard.jsx` | Shared card; field visibility by audience | UI test per audience | `feat(opportunities): shared opportunity card` |
| **S7.2** | Repoint the **student** UI | `VacanciesSection.jsx` → `/api/opportunities`; new `OpportunitiesSection.jsx`; `StudentDashboard.js:577` mounts it | student feed renders; **student no longer calls `fetchVacancies`** (assert with a fetch spy) | `refactor(student): browse the scoped feed, not the legacy list` |
| **S7.3** | Repoint the **admin** count | `AdminDashboard.js:11,76` → `/api/opportunities/inbox`. ⚠️ **Three test files mock `fetchVacancies` and must be repointed in the same commit or they fail:** `AdminDashboard.test.js:20,33,43`, `OverviewLanding.test.js:30,142,155`, `RoleAnalytics.test.js:19,42,111` | admin count renders from the inbox; those 3 suites green | `refactor(admin): count adverts from the moderation inbox` |
| **S7.4** | 🔒 Close D1 | **All four** ungated GETs on `VacancyController` (`:48`, `:53`, `:58`, `:63`) → `super_admin` only. `/company/{id}` restricted to the caller's own company; `/status` retired | **S0.1 inverted — all four leak assertions flip 200→403, not three:** `studentCanCurrentlyListEveryVacancyAcrossCompanies`, `studentCanCurrentlyReadASingleVacancyById`, `companyCanCurrentlyListARivalsVacancies`, `supervisorCanCurrentlyListVacanciesFromEveryUniversity`. ⚠️ **`studentCanCurrentlyReadASingleVacancyById` must be flipped here** — as written it certifies the defect, and a green suite vouching for a broken requirement is the failure mode this whole plan is guarding against. The two guard tests (`anonymousIsRejected`, `superAdminCanListEveryVacancy`) must keep passing so the fix cannot over-reach. `POST/PUT/DELETE` unchanged and `VacancyOwnershipTest` fully green | `fix(security): scope every legacy advert read to the super admin` |
| **S7.5** | Remove the now-dead `fetchVacancies` callers | Delete from `api.js` **only** after `rg fetchVacancies src` confirms zero callers — the full set today is `AdminDashboard.js:11,76`, `VacanciesSection.jsx:6,40`, `api.js:521`, plus the three test mocks repointed in S7.3 | `rg fetchVacancies src` returns nothing; build passes | `refactor(student): drop the dead legacy advert fetch` |

### 8.9 Phase 8 — Placement cards, history, hardening (R9, H12)

| Step | Goal | Work | Tests | Commit |
|---|---|---|---|---|
| **S8.1** | Link placements to adverts | `placements.vacancy_id` nullable + FK-less scalar (house style); `Placement`'s creation from an accepted application pre-fills from the advert per §5.5 | placement created from an advert carries role/window/stipend; **pre-existing placements with `vacancy_id=NULL` unaffected** | `feat(placements): link placements to the advert they came from` |
| **S8.2** | History UI + post-publication edit policy | `OpportunityHistory.jsx`; decide per **D3** | illegal post-publication edit → 409 per the chosen policy | `feat(opportunities): visible relay history` |
| **S8.3** | Docs + rollout | Update `CODEBASE_ANALYSIS.md`, `README`, the ops runbook; note the manual `add_opportunity_propagation.sql` step | full gate | `docs(opportunities): runbook and analysis update` |

---

## 9. Notification catalog

| Event | Recipients | Type | Title | Link |
|---|---|---|---|---|
| Advert submitted (R1) | all `findBySuperAdminTrue()` | `OPPORTUNITY_SUBMITTED` | New opportunity awaiting review | `/admin/opportunities` |
| Verified (R2/R3) | submitter | `OPPORTUNITY_VERIFIED` | Your opportunity was approved | role dashboard |
| Rejected | submitter | `OPPORTUNITY_REJECTED` | Your opportunity was not approved | role dashboard |
| Offered to universities (R3) | `findByUniversityIdAndRole(uniId, SUPERVISOR)` | `OPPORTUNITY_OFFERED` | New opportunity offered to your university | `/university/opportunities` |
| Offer accepted / declined | super admins | `OPPORTUNITY_OFFER_ANSWERED` | University responded to an offer | `/admin/opportunities` |
| Supervisor submission (R6) | university's supervisors | `OPPORTUNITY_SUBMISSION` | A supervisor submitted an opportunity | `/university/opportunities` |
| Shared with students (R4/R5) | matching students, **chunked** `[H11]` | `OPPORTUNITY_SHARED` | New internship opportunity | `/student/dashboard` |
| Share closed | students | `OPPORTUNITY_WITHDRAWN` | An opportunity is no longer available | `/student/dashboard` |
| Advertisement shared | the uploading side | `OPPORTUNITY_ATTACHMENT_ADDED` | A document was attached to your opportunity | role dashboard |
| Placement card created | student + both supervisors | existing placement notification types | | |

> **[H11] is the one scale risk in this plan.** Student fan-out is per-student rows in `notifications`, and unlike the existing admin fan-out (a handful) a university can hold thousands. S6.5 chunks it. If it still misbehaves, the fallback is a single "N new opportunities" notification per student with a count, not N messages. **Decide before S6.3, not during it.**

---

## 10. Test plan summary

| Suite | Covers | Steps |
|---|---|---|
| `VacancyVisibilityBaselineTest` | pins today's leaky behaviour, then inverted to assert it's closed | S0.1 → S7.4 |
| `ApplicationAdvertStatusGateTest` | the application flow that must never break; pins the gate before S1.7, inverted at S1.7 | S0.2 → S1.7 |
| `OpportunitySchemaTest` | columns, defaults, backfill | S1.1, S1.6 |
| `OpportunityStatusParseTest` | legacy `"OPEN"` alias; unknown → 400 | S1.7 |
| `OpportunityTransitionTest` | closed `EnumMap`; illegal → 409; terminal is terminal | S2.1 |
| `OpportunityScopeTest` | **the security matrix** — 4 origins × 6 actors | S2.3 |
| `OpportunitySubmissionTest` | role-derived origin; body cannot forge tenancy `[H5][H6][H8]` | S3.1 |
| `OpportunityModerationTest` | **R1**: a company submission is invisible to student, supervisor and university | S4.1 |
| `OpportunityOfferTest` | R3 broadcast; UNIQUE; cross-university → 404 | S5.1, S5.2 |
| `OpportunityShareTest` | R4/R5/R6; cannot widen the offered audience `[H7]` | S6.3 |
| `OpportunityFeedTest` | **R7** audience matrix + closed/withdrawn exclusion + 404 on guess `[H2][H3][H4]` | S6.4 |
| `OpportunityFanoutTest` | 5k students, chunked, all notified | S6.5 |
| `PlacementAdvertLinkTest` | placement card derived from the advert; old placements unaffected | S8.1 |
| `OpportunityAttachmentScopeTest` | owner reads it; **super admin** reads it; **targeted** student reads it; **untargeted student at the SAME university → 404** `[H13]`; student at another university → 404; a student never sees an advert-level (`university_id IS NULL`) file in their listing; `GET` metadata omits `fileName`/`storagePath`; a crafted `fileName` cannot escape the storage root `[H14]`; deleting removes row **and** blob; a student cannot delete | S1.5b, S6.7 |
| **Existing, must stay green** | `VacancyOwnershipTest` (8 call sites), `ApplicationLifecycleTest`, `PlacementPipelineTest`, `MigrationCatalogCountTest` | all |
| **Existing, must stay green (File Management)** | `DocumentScopeTest`, `FileAccessScopeTest`, `DocumentScopeBackfillTest` | all — proof that the new attachment table did not disturb `documents` |

**Gates per phase:** `backend ./start.sh clean test` (must stay ≥ 284 and rising) · `CI=false npx react-scripts test --watchAll=false` (≥ 25 suites / ≥ 166 tests) · `CI=false npm run build` (compiled with warnings, no new ones) · `npx eslint src --ext .js,.jsx` (0 errors, ≤ 9 warnings) · **plus `grep`/`rg` audits** for the id-type and L8 traps in §2.5.

---

## 11. Open decisions — your call, needed before the phase noted

| # | Decision | Recommendation | Alternative | Needed by |
|---|---|---|---|---|
| **D1** | **Extend `Vacancy` (keeping table `vacancies`, API named `/api/opportunities`) or create a new `opportunities` table?** | **Extend.** `Vacancy` is already the wired advert — company UI, `NEW_VACANCY` notifications, `Application.vacancyId`, student browse. A second table means two sources of truth for "what a student can apply to" and a data migration for every existing advert. Cost: the one loosened column, `company_id` → nullable. | New `opportunities` table + backfill + dual-write during cutover. Cleaner naming, much larger blast radius. | **S1.1** |
| **D2** | University-sourced (R5) and supervisor-sourced (R6) adverts — do they need super-admin verification? | **No.** The university is the trusted verifier. R5 goes straight to the students' feed; R6 needs one university approval hop. Super-admin review applies **only** to `origin=COMPANY`, because a self-interested company is the untrusted source. | Route everything through the super admin — simpler rule, but blocks R5/R6 behind a bottleneck and contradicts your brief. | **S3.1** |
| **D3** | Editing a `PUBLISHED` advert that students can already see? | **Allow edits, but re-verify:** a material edit (dates, slots, stipend, eligibility) resets `verification_status` to `UNVERIFIED` and pulls it out of live feeds until re-verified `[H12]`. | Freeze published adverts; changes require a new advert + closure of the old. | **S8.2** |
| **D4** | One `opportunity_shares` row per university (broadcast + targeting filters), or one row per student? | **Per university**, with targeting columns. The audience is then derived by querying `students` at read time, so a student who enrols late still sees it. Per-student rows do not scale to a 5k-student university. | Per-student rows, for exact per-recipient delivery records. | **S6.3** |
| **D5** | Should a company be able to see which universities its advert was offered to? | **No** until `PUBLISHED`; after publish, show a count only, not names. Prevents companies from learning a university's recruiting posture. | Full visibility after publish. | **S5.1** — and it holds by construction today: no offers-reading endpoint is reachable by `COMPANY` at all (S5.1 writes offers; S5.2's `GET /offers` is university-scoped), so there is no count surface to over-share yet. |
| **D6** | Standalone `/opportunities` route, or a section inside each existing dashboard? | **Section inside each dashboard**, matching how `VacanciesSection` is mounted in `StudentDashboard.js:577`. Fewer routes, less nav churn, and `/file-management` already proves the all-roles route pattern works when needed. | Standalone routes per role. | **S7.2** |

**Already decided, not open:**

| # | Decision | Outcome |
|---|---|---|
| **D8** | Where do advert attachments live — extend `documents` + `Document.audience`, or a dedicated table? | **Dedicated `opportunity_attachments` table (§5.11).** Checked and rejected the `documents` reuse: `audience` is display-only and `DocumentScopeService.java:48-51` keys only on `universityId`/`companyId`/uploader, so it can express neither "these students at this university" nor a targeted programme. Reusing `FileStorageService` for the bytes only. |
| **D7** | "Legit offer" (R2) — is `verification_status` a super-admin binary, or a graded scale? | **Binary `VERIFIED`/`REJECTED` with a required note** — implemented in S4.2: `requireVerificationNote` refuses a verdict without a non-blank ≤500-char note (400), and the verdict writes `verification_status` + `verified_by/at` + `verification_note` in one move. Matches the `RoleRequest` approval precedent. |

---

## 12. What deliberately does NOT change

| Untouched | Why |
|---|---|
| `POST/PUT/DELETE /api/vacancies` | `VacancyOwnershipTest` depends on the exact contract, including the admin `companyId:999` override and the `NEW_VACANCY` notification. Internally delegated to the opportunity service, externally identical. |
| `Application` and its whole lifecycle | Out of scope. `vacancyId` keeps working; only the audience that can see the advert changes. |
| `Placement` lifecycle & statuses | Unchanged. S8.1 adds one nullable column and nothing else. |
| Roles, authorities, `super_admin` | No new role. `super_admin` is already a boolean + granted authority. |
| **`documents` table, `DocumentScopeService`, `/file-management`** | **Deliberately untouched.** The opportunity feature gets its own `opportunity_attachments` table (§5.11) instead of stretching a shared, currently-working visibility predicate. `DocumentScopeTest` / `FileAccessScopeTest` / `DocumentScopeBackfillTest` must stay green throughout. The only shared piece is `FileStorageService`, and only for the bytes — never for authorization. |
| `/api/placements`, `/api/evaluations`, `/api/diaries` | Not involved. |
| `users`, `students`, `universities`, `company` tables | Not involved. `D2`/`internship_companies` is **not** touched and must not be conflated with `company`. |
| The entity/table name `vacancy` | Deferred rename; see D1. Renaming now would churn `Application.vacancyId`, the seeder and 4 test classes for no functional gain. |
| Seeded users | `MigrationCatalogCountTest` asserts an exact count. All new fixtures are runtime-created. |
| `frontend1/ims` form-control tokens | S3.4 and S7.1 must use `CONTROL_CLASS`/`COMPACT_CONTROL_CLASS`. `formControls.test.js` guards this and must stay green. |

---

## 13. Rollback

| Phase | Rollback |
|---|---|
| 0–2 | Pure additive. Revert the commits; nothing user-visible ever changed. |
| 3–6 | New endpoints only. Reverting removes new capability; the legacy feed is untouched and still functional. |
| **7** | **Two commits on purpose.** If S7.4 breaks something, revert **only** the tightening — S7.2/S7.3 are then simply unused repoints and the legacy feed still works. This is why S7.2–S7.4 are never squashed together. |
| 8 | Nullable column + UI; revert freely. |

**Never** run a destructive migration. `add_opportunity_propagation.sql` is additive (`ADD COLUMN` / `CREATE TABLE`), so the worst case is unused columns.

---

## 14. Definition of done

1. A company advert is visible **only** to the super admin — verified by a test asserting a `STUDENT` gets 403 on both the new inbox and the legacy endpoint.
2. The super admin can source a legitimate external offer, record the evidence, and offer it to chosen universities.
3. A university receives offers, accepts, and shares to its own students with targeting.
4. A university can source its own advert and share it directly.
5. A supervisor can submit, the university can approve or reject, and an approved submission can be shared.
6. A student sees exactly their own university's live shares — no more, no less, and a guessed id is a 404.
7. A placement created from an advert carries the full card detail, and pre-existing placements are untouched.
8. Every transition produced a notification, an audit row and a history row.
9. `grep`/`rg` audits clean for the §2.5 id-type and L8 traps.
10. All gates green: backend ≥ 284, frontend ≥ 25 suites / ≥ 166 tests, build no new warnings, eslint 0 errors.
11. `VacancyOwnershipTest` and `ApplicationLifecycleTest` **never edited to make them pass** — if one fails, the implementation is wrong.
