# Chris vs Fred — Branch Divergence Analysis

> **Purpose:** identify what `origin/Chris` has that `fred` lacks, and vice versa, with the
> goal of taking Chris's work into `fred` **without losing anything**.
>
> **Generated:** 2026-09-29 · **Method:** read-only `git` inspection after
> `git fetch --all --prune`
>
> *Caveat: this file was produced by automated inspection. The `fred` ref was force-pushed
> during this session (see §7), so "your 38 commits" are not in `fred`'s history. Commit
> hashes below were verified at the time of writing.*

---

## 1. Headline result

| Metric | Value |
|--------|-------|
| `fred` | `a13d290` — *feat(student-profile): IMS-themed profile page with real data and tabbed edit form* (2026-09-06) |
| `origin/Chris` | `7a41d74` — *Merge developer into Chris* (2026-09-29 00:50) |
| `origin/fred` | `a13d290` (in sync) |
| Merge base | `a13d290` — **identical to `fred`'s tip** |
| Chris-only commits | **9** |
| Fred-only commits | **0** |
| Relationship | **`fred` is a direct ancestor of `origin/Chris`** |

**The critical structural fact:** the merge base *is* your current `fred` tip. Your branch
contains nothing of its own that Chris lacks, and a `git merge origin/Chris` would be a
**clean fast-forward with zero conflicts** (`git merge-tree --write-tree` returned exit 0;
`git merge-base --is-ancestor fred origin/Chris` is true).

There is no divergent work to reconcile. Everything you have is already on her branch.

---

## 2. Chris-only commits (the 9 you would gain)

All reachable from `fred` via `fred..origin/Chris`:

```
7a41d74  2026-09-29  ahurirachristian  Merge developer into Chris
c461bde  2026-09-28  ahurirachristian  Save progress before switching to Chris branch
424a9b6  2026-09-07  ahurirachristian  Merged origin/developer into Chris and resolved conflicts
d7ee6fb  2026-09-07  ahurirachristian  Resolved all conflicts using local changes
29d7b53  2026-09-06  Kasagga Fred      Merge pull request #28 from ahurirachristian/fred
725a067  2026-09-03  ahurirachristian  worked on student dashboard
ecb75bc  2026-09-03  ahurirachristian  worked on the student dashboard
84d7243  2026-08-28  ahurirachristian  fixed some errors
026bfb6  2026-08-28  ahurirachristian  changes
```

### 2.1 Only two of these are genuinely new Chris work

Comparing against `origin/developer` isolates what Chris has that nobody else does:

| Chris-only vs developer | developer-only vs Chris |
|---|---|
| `7a41d74` *Merge developer into Chris* (2026-09-29) | `76f3dd7` *Company Dashboard: field supervisors, intern assignment, placement status* (2026-08-31) |
| `c461bde` *Save progress before switching to Chris branch* (2026-09-28) | `c1c6e2d` *Merge pull request #25 from ahurirachristian/Chris* (2026-09-07) |

So the real delta is **`c461bde` + the merge `7a41d74`**. Everything else in the 9 is
developer-lineage work that arrived via `29d7b53` and the `424a9b6`/`d7ee6fb` resolution.

`c461bde` (42 files, +2697 / −681) is the substantive commit — a DTO layer, a
`StudentSetting` subsystem, new dashboard pages, and expanded API wiring.

---

## 3. Clobber / contamination verdict

Your concern was that developer was broken and pulling it in would destroy your code.
Direct ancestry check:

| Commit | In `origin/Chris`? | Consequence |
|--------|--------------------|-------------|
| `d7ee6fb` *Resolved all conflicts using local changes* | **YES** | clobber chain present |
| `424a9b6` *Merged origin/developer into Chris and resolved conflicts* | **YES** | clobber chain present |
| `29d7b53` *Merge PR #28 from fred* | **YES** | your own merged work |
| `c1c6e2d` *Merge PR #25 from Chris* | no | — |
| `76f3dd7` *Company Dashboard* | no | — |

**Yes — `origin/Chris` carries the `d7ee6fb` clobber chain.** A fast-forward to it imports
that resolution. This is the exact mechanism that broke your branch before.

**However, the damage does not reproduce.** `d7ee6fb`'s deletions were Model-A purge
artifacts. Every Model-B file survives on `origin/Chris`:

```
student/Student.java                       present
school/School.java                         present
department/Department.java                 present
programme/Programme.java                   present
supervisor/IndustrialSupervisor.java       present
document/Document.java                    present
student/StudentProfileDataSeeder.java      present
```

All Model-B CRUD controllers (`SchoolController`, `DepartmentController`,
`ProgrammeController`, `StudentController`, `SupervisorController`) are present, and
`SchoolDataSeeder` / `DepartmentDataSeeder` / `ProgrammeDataSeeder` all exist on her branch.

---

## 4. File-level effect of a fast-forward

```
84 files changed, 10355 insertions(+), 3722 deletions(-)
```

- **Added (30 files)** — new subsystems Chris introduced
- **Deleted (1 file)** — see §4.2, the only loss
- **Modified (53 files)** — the rest

### 4.1 New backend classes you would gain

```
controller/SupervisorDto.java
dto/CompanyDetailsDto.java
dto/IndustrialSupervisorDto.java
dto/LearningInstituteDto.java
dto/StudentSettingsDto.java
dto/UniversitySupervisorDto.java
student/StudentSetting.java
student/StudentSettingDataSeeder.java
student/StudentSettingRepository.java
student/StudentProfileDataSeeder.java
```

A consistent DTO layer (`hasAuthority`-era request/response objects) plus a new
`StudentSetting` entity with its own repository and seeder. `StudentController` gains
+463 / −308 — the largest backend change, consistent with the new DTO contracts.

### 4.2 The one deletion — verify before merging

```
D  backend/src/main/java/com/example/demo/auth/StudentProfileDataSeeder.java
```

Your tree has this seeder at `auth/`; Chris's tree has the same class moved to
`student/StudentProfileDataSeeder.java` (confirmed added, 49 lines). This is a **package
move, not lost work** — the net effect is `auth/` → `student/`. No functional loss, but any
import or `@Component` scan assumption tied to the old package should be checked.

### 4.3 Frontend churn

| File | Δ | Note |
|------|---|------|
| `src/App.css` | +1659 / −5 | major restyle |
| `src/riho.css` | +1046 / −6 | design-system expansion |
| `dashboards/StudentDashboard.js` | +672 / −186 | largest component change |
| `dashboards/DayDiariesPage.jsx` | +612 / −0 | **new** |
| `dashboards/OverviewSection.js` | +420 / −0 | **new** |
| `InternshipProgress.jsx` | +346 / −46 | see `ONBOARDING.md §9.2` known trap |
| `dashboards/SettingsSection.jsx` | +279 / −0 | **new** |
| `VacanciesManagement.jsx` | +242 / −0 | **new** |
| `components/CompanyPage.js` | +143 / −455 | net simplification |
| `components/DiaryReviewModal.jsx` | +135 / −89 | — |
| `data/tasksData.js` | +121 / −0 | **new** |
| `services/api.js` | +47 / +0 net | new API wrappers |

Seven new frontend files including a student-diary page and a settings section.

---

## 5. What you would lose

**Nothing from `fred` itself.** Fred-only commits: **0**. Your tree is a strict ancestor.

**But your 38 reverted commits are a separate matter.** Those live on no branch:

```
backup/fred-pre-revert     -> 2764d9b
backup/fred-38-commits     -> 2764d9b
archive/fred-38-commits    -> 2764d9b
```

After a fast-forward to `7a41d74`, **40 commits from `2764d9b` would still not be reachable**
in `fred`. Fast-forwarding does **not** restore them — it moves you *past* `a13d290` along
Chris's line, and your 38 commits were never on that line.

To get all three sets into one branch you would need a merge that keeps `2764d9b` as a
parent, not a fast-forward.

---

## 6. Recommendation

Three options, in order of preference for your stated goal ("take Chris's work without
losing anything"):

### Option A — `git merge --no-ff origin/Chris` (recommended)

```bash
git tag pre-chris-merge fred        # undo point
git merge --no-ff origin/Chris
```

- Zero conflicts (fast-forward merge-base, verified)
- Brings all 9 Chris-side commits including `c461bde`'s DTO/`StudentSetting` work
- `--no-ff` preserves a merge commit, so the branch history stays legible
- Single command to undo: `git reset --hard pre-chris-merge`
- Still carries the `d7ee6fb` chain — accepted per §3, Model-B verified intact

### Option B — also restore your 38 commits

```bash
git tag pre-chris-merge fred
git merge --no-ff origin/Chris
git merge --no-ff backup/fred-38-commits    # expect real conflicts
```

Gives you both lines. Expect genuine conflicts — your 38 commits touched the same
seeders and controllers Chris did, which is precisely what the reconciliation commit
`95cb4e5` "Reconcile Model-B code clobbered by merge c1c6e2d" was doing. Do this only
if you want both; it is not required by your current goal.

### Option C — cherry-pick only `c461bde`

```bash
git cherry-pick c461bde
```

Smallest possible intake: 42 files, no clobber chain, no `c1c6e2d`/`76f3dd7`. But it
likely conflicts, since `c461bde`'s parent `29d7b53` is itself a merge. Use only if
Options A's file-level changes are too broad.

**Suggested first step: Option A**, then verify the app boots and the Model-B data is
intact before considering B.

---

## 7. Provenance and caveats

### 7.1 `fred` was force-pushed during this session

```
2026-09-29 04:37:59  reset: moving to a13d290
2026-09-29 04:42:49  pull --tags origin fred: Fast-forward   ← undid the reset
2026-09-29 (later)    reset: moving to a13d290
2026-09-29 (later)    push --force-with-lease → a13d290
```

`origin/fred` was rewritten from `2764d9b` to `a13d290`. Anyone who previously pulled
`fred` will need `git reset --hard origin/fred`.

### 7.2 Stale data warning

Before `git fetch --all --prune`, local `origin/Chris` pointed at `66f9335`
(*database updates*, 2026-08-24) while the remote was at `7a41d74`. Against that stale
ref, Chris had **0** commits `fred` lacked — a misleadingly reassuring answer. All figures
in this document use the post-fetch `7a41d74`.

### 7.3 Both branches are Model B

Neither branch contains `academic/AcademicUnit.java` (Model A, purged in M6c). Both carry
the full Model-B package set. **No schema-model conflict exists**, so the migration
direction documented in `ONBOARDING.md §1` is not a factor in this merge.

### 7.4 Known issues that this merge will surface

`ONBOARDING.md §9` documents sharp edges in the code being merged in. Relevant ones after a
fast-forward: the `InternshipProgress.jsx` relative-URL bug (fails under `npm start`, being
modified here), CSV exports that never reach the server (`csvExport.js`), and
`FileManagement.jsx` being a localStorage mock rather than a real backend.

---

*Corrections welcome — verify against source when in doubt.*
