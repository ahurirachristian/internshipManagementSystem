# Why `origin/Chris` Fails to Run, and How the Port Handles It

Status: Draft · Date: 2026-09-29 · Author: fred · Branch: `fred` @ `8131b0c` · Broken ref: `origin/Chris` @ `7a41d74`

Companion to `docs/PORTING-CHRIS-WORK.md`. That document plans *what* to take and in *what order*. This one records *why* the branch is broken, *what* the conflicts actually are, and *how each one is dispositioned*. Read this first if you are debugging `origin/Chris`; read the other if you are executing the integration.

---

## Part 1 — Why the branch fails

### 1.1 The compile failure

`./start.sh spring-boot:run` on `7a41d74` fails in about 20 seconds during `test-compile`:

```
[INFO] COMPILATION ERROR :
[INFO] BUILD FAILURE
```

200 compiler error lines across 5 files. The first error of each kind:

| File | Error |
|---|---|
| `backend/.../DemoApplication.java` | `[7,1] class, interface, enum, or record expected` |
| `backend/.../auth/OAuth2UserService.java` | `[55,2] reached end of file while parsing` |
| `backend/.../controller/DayDiaryApiController.java` | `[48,21] > expected` |
| `backend/.../controller/StudentController.java` | `[272,14] '.class' expected` |
| `backend/.../dto/CompanyDetailsDto.java` | `[4,1] illegal start of type` |

These are not logic errors. Each one is the compiler reading a `<<<<<<<` or `>>>>>>>` line as Java.

### 1.2 The conflict markers

**27 files** in the source tree and **94 conflict blocks** total.

| Blocks | File | Area |
|---|---|---|
| 7 | `frontend1/ims/src/components/InternshipProgress.jsx` | Frontend |
| 7 | `frontend1/ims/src/components/dashboards/DayDiariesPage.jsx` | Frontend |
| 6 | `frontend1/ims/src/components/dashboards/StudentDashboard.js` | Frontend |
| 5 | `frontend1/ims/src/components/dashboards/UniversitySupervisorSection.jsx` | Frontend |
| 5 | `frontend1/ims/src/components/dashboards/SettingsSection.jsx` | Frontend |
| 5 | `frontend1/ims/src/components/dashboards/IndustrialSupervisorSection.jsx` | Frontend |
| 5 | `backend/.../dto/UniversitySupervisorDto.java` | Backend |
| 5 | `backend/.../dto/IndustrialSupervisorDto.java` | Backend |
| 5 | `backend/.../controller/DayDiaryApiController.java` | Backend |
| 4 | `frontend1/ims/src/components/dashboards/LearningInstituteSection.jsx` | Frontend |
| 4 | `frontend1/ims/src/components/dashboards/CompaniesSection.jsx` | Frontend |
| 4 | `backend/.../dto/LearningInstituteDto.java` | Backend |
| 4 | `backend/.../dto/CompanyDetailsDto.java` | Backend |
| 3 | `frontend1/ims/src/components/DiaryReviewModal.jsx` | Frontend |
| 3 | `backend/.../student/StudentSetting.java` | Backend |
| 3 | `backend/.../student/StudentSettingDataSeeder.java` | Backend |
| 3 | `backend/.../controller/StudentController.java` | Backend |
| 2 | `frontend1/ims/src/data/tasksData.js` | Frontend |
| 2 | `frontend1/ims/src/context/StudentDataContext.js` | Frontend |
| 2 | `frontend1/ims/package-lock.json` | Build config |
| 2 | `frontend1/ims/package.json` | Build config |
| 2 | `backend/.../student/DayDiary.java` | Backend |
| 2 | `backend/.../dto/StudentSettingsDto.java` | Backend |
| 1 | `backend/src/main/resources/application-mysql.properties` | Config |
| 1 | `backend/.../university/University.java` | Backend |
| 1 | `backend/.../student/StudentSettingRepository.java` | Backend |
| 1 | `backend/.../DemoApplication.java` | Backend |

The canonical example, `backend/src/main/java/com/example/demo/DemoApplication.java` in full:

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

<<<<<<< HEAD
@SpringBootApplication
@EnableCaching
=======
@SpringBootApplication(scanBasePackages = "com.example.demo")
>>>>>>> developer
public class DemoApplication {

	public static void main(String[] args) {
		SpringApplication.run(DemoApplication.class, args);
	}

}
```

`HEAD` is one side of the merge; `developer` is the other. Both were written by the same person.

### 1.3 The second failure: `npm ci` cannot run

Even if the 24 Java and JS files were resolved, the frontend build fails. `package.json` and `package-lock.json` disagree:

```
package.json      declares:  "recharts": "^2.15.0"
package-lock.json root deps:  recharts → absent
```

Parsed directly from the lock's root `packages[""]` block at `c461bde`. `npm ci` hard-fails on this mismatch. Two further consequences:

- `frontend1/ims/src/components/dashboards/UniversityDashboard.js:59` still does `} from 'recharts';`. That file is **unmodified** between `a13d290` and `c461bde` (`git diff --stat` empty), so Chris never noticed the import is dangling.
- `lucide-react` is downgraded `1.31.0` → `0.468.0` and `react-scripts` is unpinned `5.0.1` → `^5.0.1`. 40 packages are deleted from the lock (`recharts` and its full `d3-*` / `victory-vendor` / `@reduxjs/toolkit` tree); 0 are added.

### 1.4 A third, silent failure inside the source we want

`c461bde` has **zero** conflict markers, but does not compile either:

```
$ git show c461bde:backend/src/main/java/com/example/demo/auth/OAuth2UserService.java | tail -3 | od -c
0000000    )   ;  \n     }  \n     }   w
0000020
```

2164 bytes. A stray `w` after the closing brace. This is the only such artifact across all 17 changed backend Java files at `c461bde`, so it is an accidental keystroke rather than a merge remnant. It is invisible to a marker grep and would survive any conflict-marker-based CI guard.

---

## Part 2 — What the conflicts actually are

### 2.1 The topology

```
7a41d74  Merge developer into Chris          ← the broken commit
  ├─ 424a9b6  Merged origin/developer into Chris and resolved conflicts   (parent 1, "HEAD")
  └─ c461bde  Save progress before switching to Chris branch              (parent 2, "developer")
```

Commit dates:

| Commit | Date | Role |
|---|---|---|
| `424a9b6` | 2026-09-07 09:17 | HEAD side — three weeks **older** |
| `c461bde` | 2026-09-28 23:12 | developer side — **newer** |
| `7a41d74` | — | the merge that collided them |

The work in `c461bde` was committed on 2026-09-28. It was then merged into a tree last touched on 2026-09-07. Git compared the same conceptual change against a three-week-older snapshot and reported a conflict on every file both had since modified.

### 2.2 Proof: merging forward in time produces zero conflicts

```
$ git merge-base fred c461bde
a13d290                       ← fred's own base

$ git merge-tree --write-tree fred c461bde
d75bf1b7906fe9d8cc15ae3f193647b0556c878d     (no conflict output)
```

`c461bde`'s parent is `29d7b53`, whose second parent is `a13d290`. So `c461bde` sits exactly one commit above fred's base, and `git diff --stat a13d290 29d7b53` is **empty** — the PR #28 merge introduced nothing. The whole 42-file / +2697 / −681 delta is attributable to `c461bde` alone.

I verified the merge result tree `d75bf1b7` directly: **zero** conflict markers across every `.java`, `.js`, `.jsx`, `.properties` and `.json` file.

**Conclusion: the conflicts are not a disagreement between Chris and fred. They are an artifact of merging backwards in time.** Nobody had to choose a winner, so nobody did.

### 2.3 Why 17 files conflict despite being new

All 17 files absent from `a13d290` also exist at `424a9b6`. Both sides created the same files independently — classic add/add conflicts.

Two shapes appear:

**Empty-HEAD** (7 files) — the HEAD side has nothing where the developer side has content, and the same content reappears later in the file. `frontend1/ims/src/data/tasksData.js` shows both blocks:

```javascript
<<<<<<< HEAD
=======
const PRIORITIES = ['Low', 'Medium', 'High'];
const ASSIGNEES = ['Self', 'Team A', 'Team B', 'Team C', 'Supervisor'];
const DAYS = ['Sunday', 'Monday', /* … */ 'Saturday'];
const WEEKDAYS = ['Monday', /* … */ 'Saturday'];
>>>>>>> developer
const TASK_SENTENCES = [ /* 15 items */ ];
/* … */
<<<<<<< HEAD
const PRIORITIES = ['Low', 'Medium', 'High'];     ← same constants, second location
const ASSIGNEES = ['Self', 'Team A', 'Team B', 'Team C', 'Supervisor'];
const DAYS = ['Sunday', 'Monday', /* … */ 'Saturday'];
const WEEKDAYS = ['Monday', /* … */ 'Saturday'];
=======
>>>>>>> developer
```

Identical constants on both sides, in different positions. Whichever side wins, the file is correct. Git cannot know that, so it asked.

**Both-sides-non-empty** (10 files) — the two versions genuinely differ. `CompanyDetailsDto.java` is 112 lines at `424a9b6` versus 79 at `c461bde`:

| `424a9b6` (HEAD) | `c461bde` (developer) |
|---|---|
| `name`, `location`, `email`, `phone`, `website`, `profile`, `department`, `fieldSupervisor`, `roles` | `companyName`, `branch`, `physicalAddress`, `website`, `email`, `phone`, `contactPerson` |

Both are complete, self-consistent shapes. There is no correct automatic resolution.

### 2.4 The one conflict that would have caused data loss

`backend/src/main/java/com/example/demo/student/DayDiary.java`, second block:

```java
<<<<<<< HEAD
    @Lob
    @Column(nullable = true)
    private String industrialSupervisorComment;
=======
    @Column(name = "account_number")
    private String accountNumber;

    @Lob
    private String action;

    @Lob
    @Column(name = "technology_tools")
    private String technologyTools;

    @Lob
    @Column(name = "industrial_supervisor_comment")
    private String industrialSupervisorComment;

    @Lob
    @Column(name = "university_supervisor_comment")
    private String universitySupervisorComment;

    /**
     * M4: rekeyed from the Model-A student_profile_id join to the Model-B
     * students.id reference (MIGRATION_PLAN.md R1/R2).
     */
    @Column(name = "student_id", nullable = false)
    private Long studentId;
>>>>>>> developer

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_profile_id", nullable = false)
    private StudentProfile studentProfile;
```

The `HEAD` side carries the **Model A** foreign key (a rekeyed `studentProfile` join); the `developer` side restores **Model B**, which is what fred already has:

| Side | Field | Model |
|---|---|---|
| `424a9b6` (HEAD) | `@JoinColumn(name = "student_profile_id") private StudentProfile studentProfile` | A |
| `c461bde` (developer) | `@Column(name = "student_id", nullable = false) private Long studentId` | B |
| `fred` (`a13d290`) | `@Column(name = "student_id", nullable = false) private Long studentId` | B |

The Javadoc on the developer side's `studentId` line records the M4 rekey from the Model-A `student_profile_id` join to the Model-B `students.id` reference. Taking the HEAD side would silently undo `ADR-002-schema-direction.md` and `MIGRATION_PLAN.md` R1/R2, breaking every diary query in the codebase. A person resolving this file under time pressure could easily have picked the shorter block.

This is the single most dangerous conflict in the branch, and it is invisible without reading the surrounding file.

### 2.5 The conflict with no valid resolution

Three files disagree on the design itself, not just the formatting. There is no merge that satisfies both sides.

**`StudentSetting.java` — entity shape**

| `424a9b6` (HEAD) | `c461bde` (developer) |
|---|---|
| `@Column(nullable=false, unique=true) String username` | `@Column(name="student_id", nullable=false, unique=true) Long studentId` |
| `boolean emailNotifications = true` | `Boolean emailNotifications = TRUE` |
| `boolean smsNotifications = false` | `Boolean smsNotifications = TRUE` |
| `boolean diaryReminders = true` | `Boolean darkMode = FALSE` |
| `String theme = "light"` | `String language = "en"` |

Different primary key strategy (username vs student id), different notification defaults, and two entirely different features: **diary reminders + light/dark theme** versus **dark mode + language selection**.

**`StudentSettingRepository.java`**

| Side | Signature |
|---|---|
| `424a9b6` | `Optional<StudentSetting> findByUsername(String username)` |
| `c461bde` | `StudentSetting findByStudentId(Long studentId)` |

**`StudentSettingDataSeeder.java` — three conflicts in one file**

```java
@Component
<<<<<<< HEAD
@Order(4)
=======
@Order(33)
>>>>>>> developer
```

```java
<<<<<<< HEAD
    if (studentSettingRepository.findByUsername(user.getUsername()).isEmpty()) {
        StudentSetting setting = new StudentSetting();
        setting.setUsername(user.getUsername());
        setting.setDiaryReminders(true);
        setting.setTheme("light");
=======
    if (studentSettingRepository.findByStudentId(user.getId()) == null) {
        StudentSetting setting = new StudentSetting();
        setting.setStudentId(user.getId());
        setting.setDarkMode(Boolean.FALSE);
        setting.setLanguage("en");
>>>>>>> developer
```

`@Order(4)` is not merely a collision — it runs before the users are seeded at `@Order(32)`, so on a fresh boot the HEAD side would iterate an empty users table and seed nothing. `@Order(33)` collides with `auth/StudentProfileDataSeeder.java:11` and `student/StudentDataSeeder.java:18`.

The port takes the `c461bde` design wholesale, relocates the order to `41`, and scopes the loop to `Role.STUDENT` — her `userRepository.findAll()` has no role filter and creates settings rows for admins and supervisors.

### 2.6 The config conflict

`backend/src/main/resources/application-mysql.properties`:

```properties
<<<<<<< HEAD
spring.datasource.url=${MYSQL_URL:jdbc:mysql://localhost:3306/internshipmanagementsystem_db?...}
spring.datasource.username=${MYSQL_USER:root}
spring.datasource.password=${MYSQL_PASSWORD:}
=======
spring.datasource.url=jdbc:mysql://localhost:3306/internshipmanagementsystem_db?...
spring.datasource.username=root
spring.datasource.password=
>>>>>>> developer
```

HEAD preserves environment-variable override. `developer` hardcodes everything with an empty password. Note the `ddl-auto=none` line below the conflict block comes from the HEAD side's file; `c461bde`'s own `application-mysql.properties` sets `ddl-auto=update`. Neither side's config is ported — fred's stays.

### 2.7 Work that exists only in the discarded side

Files at `424a9b6` present in **neither** `fred` **nor** `c461bde` — discarded along with the broken merge:

| File | Lines | Note |
|---|---|---|
| `frontend1/ims/src/components/VacanciesManagement.jsx` | 242 | Real component, no replacement anywhere |
| `backend/.../controller/SupervisorDto.java` | 61 | Note the misplaced `controller/` package |
| `backend/.../student/StudentProfileDataSeeder.java` | — | **Fred has this at `auth/StudentProfileDataSeeder.java`.** Not lost. |
| `.history/...` × 2 | — | IDE history, no value |

`VacanciesManagement.jsx` and `SupervisorDto.java` are genuine losses from the merge. They are worth recovering from `424a9b6` if the vacancies UI is wanted; that is a separate decision, not part of this integration. Everything else in the `424a9b6` side is either reproduced better by `c461bde` or already in fred.

---

## Part 3 — Disposition of all 27 conflicted files

Every conflicted file, and what the port does with it.

| Disposition | Files | Rationale |
|---|---|---|
| **Take `c461bde`** (16) | `dto/CompanyDetailsDto.java`, `dto/IndustrialSupervisorDto.java`, `dto/LearningInstituteDto.java`, `dto/StudentSettingsDto.java`, `dto/UniversitySupervisorDto.java`, `student/StudentSetting.java`, `student/StudentSettingRepository.java`, `student/StudentSettingDataSeeder.java`, `components/dashboards/CompaniesSection.jsx`, `DayDiariesPage.jsx`, `IndustrialSupervisorSection.jsx`, `LearningInstituteSection.jsx`, `SettingsSection.jsx`, `UniversitySupervisorSection.jsx`, `context/StudentDataContext.js`, `data/tasksData.js` | New capability, no fred equivalent. `StudentSetting*` carries the fixes in 2.5. |
| **Take `c461bde` + fix** (3) | `student/DayDiary.java`, `controller/DayDiaryApiController.java`, `controller/StudentController.java` | Correct content, but `PUT /api/diaries/{id}` needs null-guards (Chris sets fields unconditionally, so a partial body nulls the column) and `/university-supervisor` needs a null-guard on `s.getUniversityId()`. |
| **Take `c461bde`, modified** (3) | `components/DiaryReviewModal.jsx`, `components/InternshipProgress.jsx`, `components/dashboards/StudentDashboard.js` | Real UI work. `StudentDashboard` gets 9 tabs, diary form gains 3 fields. |
| **Take neither — regression** (3) | `package.json`, `package-lock.json`, `application-mysql.properties` | `package.json`/lock: the desync and downgrades in 1.3. Config: hardcoded empty password, lowercased DB name that breaks case-sensitive MySQL, and the HEAD side's `ddl-auto=none` (`c461bde` itself keeps `update`). Fred's versions stay. |
| **Take neither — no-op** (1) | `DemoApplication.java` | `scanBasePackages = "com.example.demo"` is identical to the implicit default for a class already in that package. The HEAD side's `@EnableCaching` is not fred's — `a13d290` has no `@EnableCaching` and nothing in fred's codebase reads `@Cacheable` — so dropping it changes nothing. |
| **Not ported — artifacts of the discarded side** (2) | `frontend1/ims/package.json` `proxy` key, `.history/` log files | IDE and tooling noise. |
| **Take neither — absorbed by redesign** (2) | `student/StudentSettingDataSeeder.java` HEAD side, `dto/*.java` HEAD sides | The HEAD variants are superseded wholesale by the `c461bde` design described in 2.5. |

Two of the 27 are not conflicted but are handled in the same pass: `auth/OAuth2UserService.java` (the stray `w`, 1.4) and `auth/DataSeeder.java` (planned: take the 2 new accounts with fred's early-return instead of Chris's unconditional upsert, which would reset every seeded account's password, email, role, `companyId` and `universityId` on every boot — **revised during the port: neither account is taken at all, see Part 4**).

**Verified: `c461bde` deletes `auth/StudentProfileDataSeeder.java`, and fred has it. Not porting that deletion loses nothing.** Confirmed absent from merge result tree `d75bf1b7`, so a naive merge *would* lose it.

### 3.1 Why not simply merge

A plain `git merge c461bde` is **mechanically clean** (Part 2.2) and would produce a tree with zero conflict markers. It was rejected because the merge result tree carries every regression:

| Check on `d75bf1b7` | Result |
|---|---|
| Conflict markers | none |
| `OAuth2UserService.java` ends `}w` | **yes** — still a compile error |
| `DataSeeder` uses `ifPresentOrElse` | **yes** — password reset every boot |
| `auth/StudentProfileDataSeeder` | **absent** — deletion carried in |
| `package.json` `recharts: ^2.15.0` | **yes** |
| `package-lock.json` root deps has `recharts` | **no** — `npm ci` still fails |
| 10 new files (`StudentSetting*`, `tasksData.js`, `OverviewSection.js`, …) | present and correct |

The merge delivers the 8 wanted capabilities and the 4 regressions in one indivisible step. The phased port in `docs/PORTING-CHRIS-WORK.md` takes the former and refuses the latter, with a test gate after each phase.

---

## Part 4 — Residual risks after the port

| Risk | Status |
|---|---|
| 11 nullable columns added to a live MySQL across phases 2 and 4 | `ddl-auto=update` on both profiles adds them; no existing row is invalidated. `backend/schema.sql` is not on the classpath and is already stale, so it needs no update. |
| `MigrationCatalogCountTest.java:61` asserts `assertEquals(7, userRepository.count())` | **Revised during the port:** Phase 3 adds no accounts. The planned `student`/`student123` login activates the dormant fallback in `DayDiaryDataSeeder` — a 4th "Demo Student" row + 2 `PENDING` diaries that has never executed because no `.java` file has contained `student123` since `471e556` — and turns 3 gate tests red; `MIGRATION_README.md:258` documents that account's removal as intentional. Assertion stays at 7: the drift detector now also proves Phase 3 touched no seed data. |
| `StudentSettingDataSeeder` `@Order` | Moved to `41`. `Order(33)` collides with two existing seeders; `Order(4)` would run before users exist. |
| `PUT /api/diaries/{id}` nulls columns on a partial body | Null-guards added in phase 2, not inherited. |
| `/university-supervisor` NPE on null `university_id` | Null-guard added in phase 4, not inherited. |
| `frontend1/ims/build/` stale (2026-09-26), untracked | Overwritten by `npm run build` in each gate. |
| `VacanciesManagement.jsx`, `SupervisorDto.java` lost with the discarded side | Not part of this integration. Recoverable from `424a9b6` if wanted. |

---

## Part 5 — Verification status

**Verified mechanically.** Commit topology and dates. Conflict file count (27) and block count (94) with per-file breakdown. `merge-base` and `merge-tree` results. Zero markers in `c461bde` and in merge tree `d75bf1b7`. The `}w` byte sequence. `package.json` / `package-lock.json` desync. `pom.xml` blob identity (`269ff705`) at `a13d290` and `c461bde`. The Model A/B foreign key difference across all three refs. The `StudentSetting` schema and repository signature differences. Seeder `@Order` map. Test count assertions. Existence of each file at each ref.

**Predicted from reading code, not observed at runtime.** That the four detail tabs render populated values, that a settings restart preserves values, that the diary round-trip works. Phase 0's test run and Phase 1's manual check in Brave are the first real gates. See `docs/PORTING-CHRIS-WORK.md` §10.
