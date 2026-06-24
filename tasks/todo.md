# TODO: Instance-Pull PROTOTYPE — "Review = PR, Merge = Publish"

**Throwaway demo of the user journey across TWO instances, each with a role-aware
UI.** Full plan + ACs + runbook: [`tasks/plan.md`](./plan.md). Module: `instance-pull.ee`.

Setup: local `dev` + `prd` + one real GitHub repo, `N8N_INSTANCE_PULL_DEMO=true`.
Calls: workflow-menu entry · prd poll loop (no webhooks) · `OutboundHttp`+`simple-git`
(no octokit) · credential id-override + deep-linked prefilled form · `must-preexist`
throughout · role-aware `/settings/instance-pull` view on each instance · env config.

5 money shots: ①click→PR (tracked in dev view) ②blocked in prd dashboard + red check
③create credential→all green ④merge ⑤live on prd.

---

## Phase A — Foundations (backend + UI shell + 2 n8n-packages changes)
- [ ] A1 Module skeleton + config + expose `instanceRole` in FrontendSettings — **M** — _deps: none_
- [ ] A2 Git ops over fixed working dir (simple-git) — **M** — _deps: A1_
- [ ] A3 Filesystem PackageWriter/Reader + make export accept an injectable writer ⚠️_fixes "export returns tar"_ — **M** — _deps: none_
- [ ] A4 Shared role-aware `/settings/instance-pull` view (dev: "My publish requests" / prd: "Incoming requests"), empty states — **M** — _deps: A1_
- [ ] ✅ **Checkpoint A:** both instances show role-correct empty view; workflow exports to exploded tree in git.

## Phase B — Dev "Raise review" 🎯 #1 (click → PR, tracked in-app)
- [ ] B1 GitHub client: open PR (OutboundHttp, `token` auth) — **S–M** — _deps: A1_
- [ ] B2 `raiseReview` + `POST /raise-review/:id` (export via FS writer → commit → push → open PR) — **M** — _deps: A2,A3,B1_
- [ ] B3 FE "Raise review" action + PR-link toast (dev only) — **M** — _deps: B2_
- [ ] B4 Dev "My publish requests" populated via `GET /my-reviews` — **M** — _deps: A4,B2_
- [ ] ✅ **Checkpoint B (demoable):** one click → real PR → appears in dev's in-app list. _Review with James._

## Phase C — Prd validation loop 🎯 #2 (blocked in dashboard + red check)
- [ ] C1 Add `ImportPipeline.validate()` (plan stages only, no apply) → BlockingIssue[] ⚠️_fixes "no plan-only seam"_ — **M** — _deps: A2,A3_
- [ ] C2 GitHub client: upsert comment + commit status; BlockingIssue→markdown w/ deep link — **M** — _deps: B1,C1_
- [ ] C3 Prd poll loop (~10s): list open PRs → validate → comment+status; track merged — **M** — _deps: C1,C2_
- [ ] C4 Prd "Incoming requests" view + attention banner + per-PR "Create credential" CTA — **M** — _deps: A4,C3_
- [ ] ✅ **Checkpoint C (demoable):** raise → red check + comment on GitHub AND PR shown Blocked w/ CTA in prd dashboard.

## Phase D — Prd credential provisioning 🎯 #3 (create credential → all green)
- [ ] D1 (BE) credential id override (demo-gated): optional `id` on create — **S–M** — _deps: none_
- [ ] D2 (FE) thread id through store+api + `CredentialEdit` query-param prefill ⚠️_fixes "id not wired to FE"_ — **M** — _deps: D1,C4_
- [ ] D3 re-validate → GitHub + both dashboards green/Ready — **S** — _deps: C3,D2,B4_
- [ ] ✅ **Checkpoint D (demoable):** click CTA → prefilled form → save → check + dashboards green hands-off.

## Phase E — Publish on merge 🎯 #4–5 (merge → live on prd)
- [ ] E1 merge detection + publish: pull main → full apply (idPolicy source) + activate; mark "Published" — **M** — _deps: A2,A3,C3,D_
- [ ] E2 "Published from main" toast + both dashboards show Published — **S** — _deps: E1,B4,C4_
- [ ] ✅ **Checkpoint E (full demo):** whole journey runs hands-off, visible in both UIs; record it.

---

## ⚠️ De-risk first
- [ ] Credential id alignment (D1+D2) — heart of money shot #3.
- [ ] plan-only is side-effect free (C1) — assert prd DB untouched.
- [ ] export-via-injectable-writer (A3) — confirm the n8n-packages export seam.

## Explicitly NOT in the POC
Webhooks · multi-provider · secure token storage/SSH · RBAC/licensing · multi-main ·
conflict handling · folders/projects/multi-workflow · production cred-provisioning model ·
enforced branch protection · **security (auth scopes, token handling, file perms) — deliberately ignored for the demo** ·
telemetry/docs/prod-bar tests · dashboard search/filter/pagination.
