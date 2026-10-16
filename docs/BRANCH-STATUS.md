# Branch State Snapshot — before the clean installation

Status: Snapshot · Date: 2026-10-16 · Author: fred · Branch: `working-fred` · Remote: `origin` = `https://github.com/ahurirachristian/internshipManagementSystem.git`

This is a ledger, not a plan. It records what every branch, tag, and worktree in this clone looked like just before the machine was wiped, and confirms that each one is now on GitHub so the old clone can be discarded. Nothing here fixes, merges, or reorders anything — the working branches were pushed exactly as found.

---

## 1. Why this exists

The clone is about to be destroyed by a clean OS installation. Every ref that only existed locally would go with it. This pass pushed all of them and wrote down their tips so that after reinstalling, a fresh clone can be checked against this document and any disagreement is immediately visible.

## 2. The clone at a glance

| Item | Value |
|---|---|
| Checked-out branch | `working-fred` |
| Remote | `origin` → `https://github.com/ahurirachristian/internshipManagementSystem.git` |
| Local branches | **53** (46 of them `port/*`) |
| Remote branches after this pass | 62 |
| Local tags | 1 — `archive/fred-38-commits` @ `2764d9b` (now on origin) |
| Worktrees | 2 — the main clone, plus `.kilo/worktrees/typical-consonant` (detached) |
| Uncommitted work at snapshot time | none — the two pending edits were committed first (see §4) |
| Stashes | none |
| Commits reachable from `working-fred` | 171 |
| Commits across all refs | 287 |
| Last commit before this pass | `5301428` (2026-10-06 09:59 +0300) |

## 3. Current branch: `working-fred`

`working-fred` descends from `f0efc57`, which was the tip of `origin/fred`. It is **not** a superset of the local `fred` branch:

| Compared against | Result |
|---|---|
| `origin/fred` (`f0efc57`) | `working-fred` carries 3 commits on top of it |
| `fred` (`f424289`) | shares base `f0efc57`; `fred` has **60** commits `working-fred` does not, and `working-fred` has commits `fred` does not |
| `port/s7.2-student-feed-repoint` | same commit as `fred` (`f424289`) |
| `migration/schema-b` (`9c41efd`) | fully contained — `working-fred` is 101 commits ahead, 0 behind |
| `origin/main` (`5044acb`) | shared ancestor `a20a69d`; 135 commits on `working-fred` not on `origin/main`, 6 the other way |

Practical consequence: checking out `fred` is not a way to get "everything from `working-fred`". The one feature commit that lives only on `working-fred` is `5301428` (demo seed data, `OFFERED` status enum migration, rollback backup).

## 4. What this pass committed and pushed

Two edits were sitting unstaged and were committed on `working-fred` first, so that the working tree was clean at snapshot time:

| Commit | Change |
|---|---|
| `fab9708` | `chore(vscode): raise the Java language-server heap for this workspace` — `.vscode/settings.json`. Note this file is matched by `.gitignore` but is already tracked, so it keeps travelling with clones. |
| `85ba70b` | `docs(reference): correct the seeded demo password for 2400101003` — `CODEBASE_ANALYSIS.md` runbook credential table. |
| *(this file)* | `docs(status): record the branch state pushed ahead of the clean installation` |

Then **all 53 local branches and the tag** were pushed to `origin`:

- **46 were newly created on GitHub** — `working-fred`, both `backup/*` branches, `chris-review`, and 42 of the 46 `port/*` branches.
- **6 already existed and were updated or were already current** — `fred` (60 commits ahead, now pushed), `migration/schema-b`, `port/detail-tabs`, `port/diary-fields`, `port/overview-dashboard`, `port/student-settings`.
- **1 already existed and was deliberately left alone** — `master` (see §6).
- **1 tag** — `archive/fred-38-commits` (points at the same commit as both `backup/*` branches).
- `chris-review` is byte-identical to `origin/Chris` at `7a41d74`; creating `origin/chris-review` added a second remote branch at that same commit rather than any new work.

46 + 6 + 1 accounts for all 53 local branches.

## 5. Branch inventory (state after the push)

Every branch below matches its remote counterpart at the listed tip, with the single exception of `master` (see §6).

| Branch | Tip | Last commit | On GitHub | Latest commit subject |
|---|---|---|---|---|
| `backup/fred-38-commits` | `2764d9b` | 2026-09-26 | yes — in sync | Use the design-system dropdown for diary review status |
| `backup/fred-pre-revert` | `2764d9b` | 2026-09-26 | yes — in sync | Use the design-system dropdown for diary review status |
| `chris-review` | `7a41d74` | 2026-09-29 | yes — in sync | Merge developer into Chris |
| `fred` | `f424289` | 2026-10-06 | yes — in sync | docs(plan): mark S7.2 done, next step S7.3 |
| `master` | `1170dc0` | 2026-07-29 | yes — local behind by 39 | Initial commit |
| `migration/schema-b` | `9c41efd` | 2026-08-25 | yes — in sync | docs: update CODEBASE_ANALYSIS.md for post-M7 Model B state |
| `port/detail-tabs` | `73c0beb` | 2026-09-29 | yes — in sync | feat(internship-progress): port the stepper rework and to-do list |
| `port/diary-fields` | `a9398ed` | 2026-09-29 | yes — in sync | feat(diary): port the 5 new DayDiary fields and diary UI from c461bde |
| `port/overview-dashboard` | `18f7e36` | 2026-09-29 | yes — in sync | feat(student-dashboard): port overview dashboard tab from c461bde |
| `port/p0-foundations` | `e36b813` | 2026-09-30 | yes — in sync | feat(p0): make the SPA the only UI and add the notification foundation |
| `port/p1-auth-ux` | `f7896f7` | 2026-09-30 | yes — in sync | feat(p1): resolve login roles server-side and require email at registration |
| `port/p2-password-reset` | `c175650` | 2026-09-30 | yes — in sync | feat(p2): email reset links via Resend with lockout and managed resets |
| `port/p3-role-requests` | `b4a1859` | 2026-09-30 | yes — in sync | feat(p3): add role requests with approval notifications and live role switch |
| `port/p4-super-admin` | `dd3e23e` | 2026-09-30 | yes — in sync | feat(p4): super admin grant/revoke/disable and forced first-login change |
| `port/p5-university-powers` | `e30e59e` | 2026-09-30 | yes — in sync | feat(p5): university-scoped people management |
| `port/p6-company-powers` | `d3b86b3` | 2026-09-30 | yes — in sync | Add company field supervisors, vacancy ownership scoping, admin marketplace feed (P6) |
| `port/p7-placement-pipeline` | `1c112ec` | 2026-09-30 | yes — in sync | Add student lookup and placement offer pipeline with approvals (P7) |
| `port/p9-particles` | `3b448ea` | 2026-09-30 | yes — in sync | Scale login particles with viewport and respect motion preferences (P9) |
| `port/pc10-audit-indexes` | `508a500` | 2026-10-02 | yes — in sync | perf(audit): index audit_logs for the deferred activity charts (PC10) |
| `port/pc6a-company-grade-scale` | `245e649` | 2026-10-01 | yes — in sync | fix(company): render evaluation averages on the 0-10 scale |
| `port/pc6a-report-grade-scale` | `4d25182` | 2026-10-01 | yes — in sync | fix(profile): print the report overall grade on the 0-10 scale |
| `port/pc6b-diary-statuses` | `6df8987` | 2026-10-01 | yes — in sync | fix(dashboards): stop dropping REJECTED diaries from the university pie |
| `port/pc6c-real-empty-state` | `a6bff6a` | 2026-10-01 | yes — in sync | feat(student): replace fabricated to-do seed with a real empty state |
| `port/pc6d-admin-opens-overview` | `0e73fed` | 2026-10-01 | yes — in sync | fix(dashboards): open the admin dashboard on Overview |
| `port/pc6e-placement-pie` | `8c2a17c` | 2026-10-01 | yes — in sync | fix(dashboards): show OFFERED on the university placement status pie |
| `port/pc7-industrial-supervisor` | `b460e82` | 2026-10-01 | yes — in sync | feat(roles): add INDUSTRIAL_SUPERVISOR persona with company-scoped dashboard (PC7) |
| `port/pc8a-placement-lifecycle` | `7e343c5` | 2026-10-02 | yes — in sync | feat(placements): complete the placement lifecycle with offer/start/complete (PC8a) |
| `port/pc8b-placement-timestamps` | `5a9419a` | 2026-10-02 | yes — in sync | feat(placements): add the PC8b timeline columns, status history, and queries |
| `port/pc9-vacancy-applications` | `d2f5c1d` | 2026-10-02 | yes — in sync | feat(applications): add vacancy applications with a scoped lifecycle (PC9) |
| `port/s1.7-opportunity-status-enums` | `aef708b` | 2026-10-03 | yes — in sync | docs(opportunities): record S0.1-S1.7 as done, with what actually landed |
| `port/s2.1-opportunity-transition` | `b5cfb4f` | 2026-10-03 | yes — in sync | docs(opportunities): record S2.1 as done with its fault-injection run |
| `port/s2.2-transition-side-effects` | `9add3b6` | 2026-10-03 | yes — in sync | docs(opportunities): record S2.2 as done |
| `port/s2.3-audience-resolver` | `77375ee` | 2026-10-03 | yes — in sync | docs(opportunities): record S2.3 as done - Phase 2 complete |
| `port/s3.1-opportunity-submission` | `1d1b3c9` | 2026-10-03 | yes — in sync | docs(opportunities): record S3.1 as done |
| `port/s3.2-supervisor-submission-row` | `0d071ad` | 2026-10-03 | yes — in sync | docs(opportunities): record S3.2 as done |
| `port/s3.3-my-submissions` | `7ff3aa2` | 2026-10-03 | yes — in sync | docs(opportunities): record S3.3 as done |
| `port/s3.4-opportunity-form` | `db7d824` | 2026-10-03 | yes — in sync | docs(plan): mark S3.4 done, point at S4.1 |
| `port/s4.1-opportunity-inbox` | `b22ed28` | 2026-10-04 | yes — in sync | docs(plan): mark S4.1 done, point at S4.2 |
| `port/s4.2-verify-reject` | `695e36b` | 2026-10-04 | yes — in sync | docs(plan): mark S4.2 done, close D7 |
| `port/s4.3-opportunity-inbox-ui` | `7b562a8` | 2026-10-04 | yes — in sync | docs(plan): mark S4.3 done, next step S5.1 |
| `port/s5.1-opportunity-offers` | `eba26de` | 2026-10-04 | yes — in sync | docs(plan): mark S5.1 done, next step S5.2 |
| `port/s5.2-offer-respond` | `b66e1f7` | 2026-10-04 | yes — in sync | docs(plan): mark S5.2 done, next step S6.1 |
| `port/s6.1-offer-inbox` | `e2d73d4` | 2026-10-04 | yes — in sync | docs(plan): mark S6.1 done, next step S6.2 |
| `port/s6.2-submission-review` | `45ff436` | 2026-10-05 | yes — in sync | docs(plan): mark S6.2 done, next step S6.3 |
| `port/s6.3-share` | `ea3eb00` | 2026-10-05 | yes — in sync | docs(plan): mark S6.3 done, next step S6.4 |
| `port/s6.4-feed` | `faa0985` | 2026-10-05 | yes — in sync | docs(plan): mark S6.4 done, next step S6.5 |
| `port/s6.5-fanout` | `bf28c64` | 2026-10-05 | yes — in sync | docs(plan): mark S6.5 done, next step S6.6 |
| `port/s6.6-close-share` | `fae6e41` | 2026-10-06 | yes — in sync | docs(plan): mark S6.6 done, next step S6.7 |
| `port/s6.7-attachments` | `cc47c69` | 2026-10-06 | yes — in sync | docs(plan): mark S6.7 done, next step S7.1 |
| `port/s7.1-opportunity-card` | `a0d6f1f` | 2026-10-06 | yes — in sync | docs(plan): mark S7.1 done, next step S7.2 |
| `port/s7.2-student-feed-repoint` | `f424289` | 2026-10-06 | yes — in sync | docs(plan): mark S7.2 done, next step S7.3 |
| `port/student-settings` | `0777bc4` | 2026-09-29 | yes — in sync | feat(student-settings): port the settings stack from c461bde |
| `working-fred` | *this commit* | 2026-10-16 | yes — in sync | docs(status): record the branch state pushed ahead of the clean installation |

## 6. The one branch that is not in sync: `master`

`master` was deliberately **not** moved. The local `master` (`1170dc0`, "Initial commit") is an *ancestor* of `origin/master` (`8eb81dd`) and sits 39 commits behind it, so the remote already contains everything local `master` has. Pushing it was refused for exactly that reason:

```
! [rejected]  master -> master (non-fast-forward)
hint: Updates were rejected because a pushed branch tip is behind its remote counterpart
```

Forcing it would have rewound the shared `master` and deleted 39 commits of other people's work. Nothing is lost by leaving it alone, and no force push was used anywhere in this pass.

## 7. Recreating the clone after the reinstall

```bash
git clone https://github.com/ahurirachristian/internshipManagementSystem.git
cd internshipManagementSystem
git fetch origin --tags
```

Then confirm the tips match §5:

```bash
git ls-remote --heads origin | sort          # 62 heads
git rev-parse --short origin/working-fred    # the docs(status) commit from §4
git rev-parse --short origin/fred            # f424289
git ls-remote --tags origin                  # archive/fred-38-commits -> 2764d9b
```

Two things a clone will not bring back, by design:

- **The second worktree** (`.kilo/worktrees/typical-consonant`) is a local worktree registration, not a branch. It was clean and detached at `5044acb`, which is `origin/main` — recreate it from that commit if it is still wanted.
- **Local-only configuration**: the `master` tracking gap, the `chris-review` → `origin/Chris` upstream, and any machine-specific IDE settings outside the tracked `.vscode/settings.json`.

Also worth knowing before reopening the project: `backend/` binds to a real MySQL on port 3306 with profile `mysql`, the runbook in `CODEBASE_ANALYSIS.md §0` is the fastest way back to a running stack, and the rollback dump taken before the demo seed lives at `backups/pre-demo-seed-20261006-091005.sql`.
