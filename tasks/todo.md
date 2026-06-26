# TODO: Git-Backed Workflow Release POC

Full detail in [`plan.md`](./plan.md). Each phase ends in a checkpoint to review with a human.
Branch: `instance-pull-deploy-poc` (fresh from master). Everything gated by `N8N_INSTANCE_PULL_DEMO=true`.

## Phase 0 — The deploy contract (CLI ↔ prd) [the spine, build first]
- [x] **0.0** Demo config + feature flag (`instance-pull.config.ts`, `tasks/demo/instance-pull.env`) — S
- [x] **0.1** Port `ImportPipeline.validate()` + `runFromReader()` onto master; expose `resolveContext` — S
- [x] **0.2** prd `POST /api/v1/n8n-packages/validate` endpoint + service `validatePackage` + `DeployService`/`BindingSessionService` glue + OpenAPI. **Refinements vs plan:** `pr` is a **query param** (no new DTO, no multer surgery — reuses `ImportPackageRequestDto`); instance-pull glue isolated in `DeployService` (feature→core dep); validate gate forces `must-preexist`; `/import` `pr`-merge moved to Phase 1 (only needed with bind-existing).
- [x] **0.3** top-level `deploy` command in `@n8n/cli` + manifest-first node-tar packer + `N8nClient.validatePackage` + `summarizeValidation`; exit 1 on blocking, prints + emits `binding_url` step output; apply imports directly with `publish-all`.
- [x] **Adversarial review** (4 lenses → verify): 1 real bug found + fixed (tar manifest-ordering; **empirically verified**); also fixed gate-defeating `create-stub` default, dead `workflowPublishingPolicy` validate field, host-less `bindingUrl`, generic blocked-message, removed wasteful apply-path pre-validate. Verified: request shape valid (eov accepts), no circular deps, DI resolves.
- [x] **Verification:** `@n8n/cli` typecheck ✅ · `packages/cli` typecheck ✅ (0 errors, post-build) · full build ✅ · F1 packing fix proven.
- [ ] **CHECKPOINT 0** — *paused for human review.* Static verification complete; remaining = live E2E (boot prd, run `deploy --dry-run` → missing creds + exit 1 + link → create cred → exit 0 → apply imports+activates).

**Known limitations (POC, noted by review):** dry-run does not assert publish scope, so a green gate could still fail apply on `publish-all` if the API-key user lacks publish scope (demo uses an owner key); `/credential-binding/<pr>` route is built in Phase 1.2 (link is a placeholder until then); no automated tests (POC scope).

## Phase 1 — Binding session + prd binding page  *(IMPLEMENTED — build/typecheck/review pending)*
- [x] **1.1** Binding-session `@Service`: added `setBinding`/`bindingsFor` (source→target map); internal REST `InstancePullController` (`GET /credential-binding/:pr` requirements+live satisfaction via `CredentialsFinderService`, `GET /:pr/options` picker via `CredentialsService.getMany`, `POST /:pr/bind`); `instance-pull.module.ts` (`@BackendModule`, wires controller only when enabled) registered in `MODULE_NAMES` + `defaultModules`.
- [x] **1.1b** `/import` reads `?pr` and merges `bindingsFor(pr)` into `credentialBindings`; `pr` query param added to import OpenAPI + CLI `importPackage`/deploy + standalone script.
- [x] **1.2** prd `/credential-binding/:pr` view (delegated to n8n:developer agent) + `credential-binding.api.ts` + route (prd-gated `beforeEnter`) + VIEWS + i18n; credential-id prefill plumbing (me): `FrontendSettings.instancePull` exposed via `frontend.service.ts`; `CreateCredentialDto.id` (demo-gated in `credentials.service.ts`); `openNewCredential({presetId})` → `NewCredentialsModal.presetId` → `CredentialEdit.vue` sets `credentialDetails.id` → store forwards `id`.
- [x] **Verification:** `cli` ✅ · `@n8n/cli` ✅ · `editor-ui` (vue-tsc) ✅ — all 0 errors. Fixed during typecheck: controller `req` generics; `CredentialsService` → `Container.get(InstancePullConfig)` (avoid arity break in 3 tests); validate now merges per-PR bindings.
- [x] **Adversarial review (7 agents) + automated security review — 4 confirmed issues fixed:**
  - HIGH (review): `expectedType` was undefined for the common `not_found` requirement → carried the reference type through in `collectBlockingIssues` (`expectedType ?? type`). Was breaking the picker + create-new + type-aware satisfied check.
  - HIGH (review): `N8nButton type=` → `variant=` in the view (removed prop).
  - HIGH (security/review): preset id was an unguarded **upsert** → added existence guard so a preset id can only INSERT, never overwrite; demo-gated.
  - HIGH (security): `bind` now verifies the operator can access the target credential (`findCredentialForUser`); session-ownership finding acknowledged (cross-actor by design) + documented.
  - Confirmed CORRECT by review: preset-id flow end-to-end, no DI cycle, demo-gating, validate=no-writes.
- [x] **CHECKPOINT 1 (static)** — full build ✅ (39s), all typechecks ✅, review + security fixes landed. Remaining = live E2E (boot prd, dry-run → binding page → bind/create → green). *Paused for human review.*

**Phase 1 known limitations (POC, from review):** the page's live "Resolved" badge uses read-access while the deploy gate uses usable-in-target-project — can diverge for multi-user/multi-project setups (aligns for a single-owner demo; dry-run re-run is authoritative). Resolved requirements drop off the list on the next dry-run (no persistent "Resolved" confirmation row). Production: gate the binding controller behind an operator/admin scope.

## Demo packaging (north star: runnable by colleagues)
- [ ] **D1** Turnkey local demo: `tasks/demo/start.sh` boots dev+prd on separate ports/sqlite DBs with env vars; sample exploded package tree + runbook. Laptop-demoable for money-shots #2–7 (CLI + prd UI) with no GitHub infra.
- [ ] **D2** (Phase 2) GitHub Actions reaching a local prd: document self-hosted-runner / tunnel (e.g. cloudflared) options, or a "simulate the Action by running the CLI locally" fallback.

## Phase 2 — dev raise-review → git/PR + GitHub Actions  *(IMPLEMENTED — build ✅, review running)*
- [x] **2.1** Export-to-git: `FilesystemPackageWriter` (new, path-safe) + `N8nPackagesService.exportToWriter` (extracted, injectable writer); `GitOps` (ported simple-git: clone-once/reset/branch/commit/push, PAT-injected remote); `RaiseReviewService` (clear-then-export self-contained package → commit → push).
- [x] **2.2** `GitHubClient` (ported, trimmed to open/read PR via OutboundHttp) + `RaiseReviewController` (`POST /instance-pull/raise-review`) + dev-only "Raise review" editor action (delegated to n8n:developer agent) + api + i18n.
- [x] **2.3** Demo artifacts in `tasks/demo/`: `n8n-deploy.mjs` (zero-dep CI script — **the answer to "no built n8n artifact in CI"**), `github-workflows/deploy-dry-run.yml` (PR gate + sticky-comment) + `deploy-apply.yml` (merge→apply), `start.sh` (boot dev+prd local), `README.md` runbook.
- [x] **Verification:** `cli` ✅ · `editor-ui` ✅ (after i18n rebuild) · full build ✅ (29s).
- [x] **Adversarial review (8 agents) + automated security review — fixes applied:**
  - HIGH: `raise-review` had no authz → added `@GlobalScope('sourceControl:push')` (owner/operator-only) + disclaimer.
  - HIGH: concurrent raises corrupted the shared `/tmp` working dir → added a single-flight mutex in `RaiseReviewService`.
  - HIGH: PAT was persisted in the temp clone's `.git/config` → switched to a transient `http.extraheader` + clean remote URL (token no longer at rest).
  - MED: CI packers packed the whole repo root → both `n8n-deploy.mjs` + `@n8n/cli deploy` now pack ONLY package entries (allowlist).
  - SECURITY: GitHub Actions injection in `deploy-dry-run.yml` → step outputs moved to `env:`/`process.env`.
  - Confirmed CORRECT: exportToWriter refactor, FE action wiring, the CI YAML gate/comment/apply logic, the script's arg-parse/exit-codes/manifest-first packing.
  - Deferred (POC, documented): destructive working-dir mutation before per-workflow access check (mitigated by the mutex + reset-to-base on next raise).
- [x] **CHECKPOINT 2 (static)** — full build ✅ (18s), all typechecks ✅, review + security fixes landed. Remaining = live E2E against a real GitHub repo + reachable prd. *Paused for human review.*

## Demo packaging
- [x] **D1** `start.sh` + sample env + `README.md` runbook (laptop-demoable: CLI/script + prd UI, no GitHub infra for money-shots #2–7).
- [x] **D2** GitHub Actions reaching local prd: documented (cloudflared/ngrok tunnel · self-hosted runner · or run the script locally to simulate the Action).

## Phase 3 — dev dashboard + merge → publish (full E2E)
- [ ] **3.1** dev "My reviews" dashboard: live PR check-status badges + Merge button (GitHub merge API) — L
- [ ] **3.2** Merge → `deploy-apply.yml` → prd `/import` → activate; dashboard shows published — S
- [ ] **CHECKPOINT 3** — full E2E, all 8 diagram steps reproduced live. *Demo-ready.*

## Definition of done (the 8 diagram steps)
0. Raise review on dev → 1. exploded tree PR'd to production-workflows repo → 2. PR Action dry-runs →
3. red + binding link when creds missing → 4. bind/create on prd → 5. re-run green →
6. merge → 7. apply Action imports+activates → 8. all of main running on prd.
