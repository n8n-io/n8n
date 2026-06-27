# Implementation Plan: Git-Backed Workflow Release ("review → PR → CI gate → publish")

> On approval I will copy this file to `tasks/plan.md` and generate `tasks/todo.md`
> (the planning command asked for both; plan mode only permits editing this file).

## Context

We want a **working demo** of a release pipeline for n8n workflows, driven by GitHub
Actions. The user journey (from the hand-drawn diagram, 8 steps):

0. On a **dev** instance a user builds workflows and clicks **"Raise review"**.
1. Dev exports the workflows as an exploded n8n-packages tree into a git working dir,
   commits a feature branch, and opens a **PR against a separate "production workflows"
   git repo**.
2. On PR open/update a **GitHub Action** runs `n8n deploy --instance <prd> --dry-run --pr <N> .`
3. The dry-run asks **prd** what's missing. If credentials are needed it **fails the check
   (non-zero exit)** and prints a link `https://<prd>/credential-binding/<N>` — the id (the
   PR number) is **stable across PR updates**.
4. The user opens that link on prd, sees the required credentials, and **creates them**.
5. Re-running the failed Action now **passes** (check goes green).
6. **Merge to main** (from GitHub or from the dev dashboard) triggers a second Action:
   `n8n deploy --instance <prd> --pr <N> .` (no `--dry-run`).
7. That Action **actually imports + activates** the workflows on prd. All workflows in `main`
   run in prd.

This is a **throwaway POC**: tests and production hardening are out of scope; everything is
configured by env vars and gated behind `N8N_INSTANCE_PULL_DEMO=true`.

### Why CI-driven (and how it differs from prior work)
The `instance-pull-poc` branch built the inverse model (prd polls GitHub and posts commit
statuses itself). Per decision, we are building **fresh from master** in the CI-driven shape:
**GitHub Actions owns the merge-blocking check**; prd is a passive HTTP endpoint provider; the
`n8n deploy` CLI is the bridge between git/CI and prd. We **copy** proven plumbing out of the
POC branch but reshape the control flow.

## Architecture Decisions

- **The CLI lives in the standalone `packages/@n8n/cli/` package** (oclif, bin `n8n-cli`),
  NOT the server CLI in `packages/cli/src/commands/`. The standalone client wraps the public
  REST API, needs **no DB**, and already ships `package import`/`package export` + `N8nClient`
  with `--url`/`--api-key`. This is the only home that runs cleanly inside CI.
- **CLI ↔ prd over the public API** (`X-N8N-API-KEY`), gated by `N8N_PUBLIC_API_PACKAGES_ENABLED`.
  Apply reuses the existing `POST /api/v1/n8n-packages/import`. Dry-run is a **new**
  `POST /api/v1/n8n-packages/validate` that returns `{ issues, bindingUrl }` as **200** (the CLI
  decides the exit code from the `credential-unresolved` subset — keeps CLI logic trivial).
- **Wire format = the gzip tar the import endpoint already accepts.** The CLI packs the exploded
  tree locally with `node-tar` (`tar.c({ gzip:true, cwd:dir, portable:true }, ['.'])`) → multipart
  `package` field. No new upload protocol; prd parses it with the existing `TarPackageReader`.
- **Plan-only seam = `ImportPipeline.validate()`** (ported from the POC branch): runs only the
  importers' side-effect-free `plan()` stages and returns `BlockingIssue[]`. Apply reuses `run()`.
- **Binding session = in-memory `Map<prNumber, { requirements: Requirement[]; bindings: Map<sourceId,targetId> }>`**
  in a `@Service`. Keyed by **PR number only** (NOT head SHA — creating a credential doesn't change the
  SHA, so a SHA key would pin "blocked" forever). The binding page computes satisfied/unsatisfied
  **live** against the prd credential store, so it flips green with no cache invalidation.
- **Credential resolution is prd-authoritative, via a unified `credentialBindings` (source→target)
  map.** prd owns how its own credentials are identified. The binding page offers two actions per
  requirement, both of which just write an entry into the per-PR `credentialBindings` map:
  - **Bind existing** → `source → <existing prd credential id>` (operator picks a real prd credential of the right type).
  - **Create new** → `source → source` (deep-linked prefilled create form with `type`/`name`/**`id`=source**; the demo `id` override is honoured only when the demo flag is on).
  Both **validate** and **apply** merge this persisted map into the request before running `plan()`/`run()`
  (uses `WorkflowIdPolicy:'source'` + `id-only` matching). So binding OR creating flips the dry-run
  green identically. This removes the id-override from the *only* path and matches real operator
  behaviour. (Note: matching across independent DBs is still id/name-based — a known demo limitation;
  robust cross-instance identity is out of POC scope.)
- **The Action publishes the binding link as a sticky PR comment.** The `deploy` CLI stays
  single-purpose (talks only to prd) and emits the `bindingUrl` + missing-credential summary to
  stdout / a GitHub step output; a following `actions/github-script` step in the workflow YAML
  upserts a sticky PR comment. Durable, in-PR, survives a prd restart, and keeps GitHub API knowledge
  out of the deploy CLI.
- **Two repos.** The n8n monorepo holds the product code. The **production-workflows repo** holds
  the synced exploded tree + the two GitHub Actions workflow files. The dev instance opens PRs
  against the production-workflows repo.
- **GitHub usage is split by role.** dev needs: open PR, read PR check status, merge PR. prd needs:
  nothing from GitHub (CI talks to it). Trim the POC's GitHub client to the dev verbs only.

## Reuse map (copy from `origin/instance-pull-poc`, adapt to master)

| Piece | Source on POC branch | Use |
|---|---|---|
| `validate()` + `runFromReader()` | `modules/n8n-packages/engine/import-pipeline.ts` (diff verified) | Port verbatim onto master |
| Filesystem package reader/writer | `modules/n8n-packages/io/...` | Port; writer used by dev export, reader optional |
| simple-git wrapper | `modules/instance-pull.ee/git/git-ops.ts` (137 LOC) | Port/trim for dev raise-review |
| GitHub REST client (OutboundHttp) | `modules/instance-pull.ee/github/github-client.ts` (208 LOC) | Trim to open-PR / read-check / merge-PR |
| Credential-id prefill | `CredentialEdit.vue` query-param reads + `CreateCredentialDto.id` | Port (demo-gated) |
| Role-aware `FrontendSettings` | `frontend-settings.ts` `instancePull:{enabled,role}` | Port |
| Settings view + store + sidebar scaffold | `features/instance-pull.ee/...`, `useSettingsItems` | Scaffold dev dashboard + prd binding page |
| Env config | `instance-pull.ee/instance-pull.config.ts`, `tasks/demo/instance-pull.env` | Port |

## Dependency graph

```
config + feature flag (Task 0.0)
        │
ImportPipeline.validate()/runFromReader() + resolveContext (Task 0.1)
        │
prd /validate endpoint + DTO + service (Task 0.2)
        │
n8n deploy CLI: packer + N8nClient.validatePackage + exit codes (Task 0.3)
        │   ── CHECKPOINT 0: contract proven from a shell ──
        ├─────────────────────────────────────────────┐
binding-session @Service (Task 1.1)            GitOps + FilesystemWriter (Task 2.1)
        │                                              │
prd /credential-binding page + cred prefill    GitHub client + raise-review action (Task 2.2)
   (Task 1.2)                                          │
        │                                       GitHub Actions YAML (Task 2.3)
   ── CHECKPOINT 1 ──                                  │
                                                ── CHECKPOINT 2 ──
                                                       │
                                  dev "My reviews" dashboard + merge (Task 3.1)
                                                       │
                                  main-apply E2E (Task 3.2)
                                  ── CHECKPOINT 3: full E2E ──
```

---

## Phase 0 — The deploy contract (the spine)

Build and prove the CLI ↔ prd contract with a hand-made tree, **before** any git/UI. Highest risk
(two-CLI trap, API-key auth, context resolution) lands first.

### Task 0.0: Demo config + feature flag scaffolding
**Description:** Create the env-driven config the whole demo keys off.
**Acceptance criteria:**
- [ ] `N8N_INSTANCE_PULL_DEMO`, `INSTANCE_PULL_ROLE` (`dev|prd`), `INSTANCE_PULL_PUBLIC_URL`,
      dev-only `INSTANCE_PULL_GH_TOKEN`/`INSTANCE_PULL_GH_REPO`/`INSTANCE_PULL_GH_BASE`,
      and `N8N_PUBLIC_API_PACKAGES_ENABLED` are all readable via a config class.
- [ ] A `tasks/demo/instance-pull.env` sample documents every var.
**Verification:** Boot n8n with the vars set; log the resolved config once at startup.
**Dependencies:** None. **Files:** `modules/instance-pull.ee/instance-pull.config.ts`, `tasks/demo/instance-pull.env`. **Scope:** S

### Task 0.1: Port the plan-only seam onto master
**Description:** Bring `ImportPipeline.validate(reader, context, request): Promise<BlockingIssue[]>`
and `runFromReader()` from the POC branch onto master, and expose context resolution.
**Acceptance criteria:**
- [ ] `validate()` runs only `credentialImporter.plan()` + `workflowImporter.plan()` + `collectBlockingIssues()`; never calls any `apply()`.
- [ ] `resolveTarget` is callable from the service (made `public` or wrapped as `resolveContext()`).
**Verification:** Unit-free; covered by Task 0.2's manual run. Typecheck passes.
**Dependencies:** None. **Files:** `modules/n8n-packages/engine/import-pipeline.ts`. **Scope:** S

### Task 0.2: prd `POST /api/v1/n8n-packages/validate` (dry-run) endpoint
**Description:** New public-API endpoint that accepts the same multipart tar + a `pr` field, resolves
context from the API-key user, runs `validate()`, and returns `{ issues, bindingUrl }`.
**Acceptance criteria:**
- [ ] Same scope (`workflow:import`) + `packagesEnabled` 404 gate as `/import`.
- [ ] Returns **200** with `BlockingIssue[]` + `bindingUrl` (built from `INSTANCE_PULL_PUBLIC_URL` + PR).
- [ ] Before running `validate()`, it **merges the persisted per-PR `credentialBindings`** (see 1.1)
      into the request — so a requirement the operator has bound/created no longer appears as blocking.
- [ ] Apply path: `/import` gains an optional `pr` field; when present it **merges the same persisted
      per-PR bindings** server-side before `run()`. Otherwise unchanged. Confirmed reused for no-dry-run deploy.
**Verification:** `curl -F package=@pkg.n8np -F pr=1 -H 'X-N8N-API-KEY: …' <prd>/api/v1/n8n-packages/validate` returns the missing-credential issues for a package referencing an absent credential.
**Dependencies:** 0.1. **Files:** `public-api/v1/handlers/n8n-packages/n8n-packages.handler.ts`, `@n8n/api-types/.../validate-package-request.dto.ts`, `modules/n8n-packages/n8n-packages.service.ts`, OpenAPI `spec/paths/n8n-packages.validate.yml` + `openapi.yml`. **Scope:** M

### Task 0.3: `n8n deploy` command in `@n8n/cli`
**Description:** Add the oclif `deploy` command + local tar packer + `N8nClient.validatePackage`.
Dry-run gates on missing credentials; apply reuses `importPackage`.
**Acceptance criteria:**
- [ ] `deploy [dir] --instance <url> --dry-run --pr <N>` packs the tree, calls `/validate`, prints
      one line per missing credential + the `bindingUrl`, and **exits 1** when any `credential-unresolved` issue exists; **exits 0** otherwise.
- [ ] On a missing-credential dry-run it also writes the `bindingUrl` + summary to a **GitHub step
      output** (and/or a `::notice::`) so the YAML comment step (2.3) can consume it. The CLI itself
      makes **no GitHub API calls** — it talks only to prd.
- [ ] `deploy [dir] --instance <url> --pr <N>` (no `--dry-run`) calls `importPackage` (apply, passing `pr`) and exits 0 on success.
- [ ] `--instance` is an alias of the existing `--url`; api key via `--api-key`/`N8N_API_KEY`.
**Verification:** Hand-make an exploded tree (manifest.json + one workflow referencing credential id `X`); run dry-run against a local prd → exit 1 + link; run apply after the cred exists → workflow imported.
**Dependencies:** 0.2. **Files:** `@n8n/cli/src/commands/deploy.ts`, `@n8n/cli/src/commands/package/pack-tree.ts`, `@n8n/cli/src/client.ts`. **Scope:** M

### Checkpoint 0 — contract proven (diagram steps 3, 6, 7 mechanically)
- [ ] From a shell, dry-run reports missing creds + non-zero exit + binding link.
- [ ] After creating the matching credential (id = source id), dry-run exits 0.
- [ ] Apply imports + activates the workflow on prd.
- [ ] `pnpm typecheck` clean in `@n8n/cli` and `cli`. **Review with human before Phase 1.**

---

## Phase 1 — Binding session + prd binding page

### Task 1.1: Binding-session `@Service` (in-memory)
**Description:** Per-PR store of both the latest **requirements** (from `/validate`) and the operator's
chosen **bindings** (`source → target`); `urlFor(pr)` builds the link.
**Acceptance criteria:**
- [ ] `/validate` records the `credential-unresolved` issues for the PR as `Requirement = { sourceId, expectedType, usedByWorkflows }` (overwrite on re-deploy).
- [ ] A separate map holds operator resolutions: `setBinding(pr, sourceId, targetId)`; `bindingsFor(pr): Map<sourceId,targetId>`.
- [ ] Read API returns `{ requirements, bindings }` for a PR; both `/validate` and `/import` read `bindingsFor(pr)`.
**Verification:** Bind a source→target, then a dry-run for that PR returns the requirement resolved (not blocking).
**Dependencies:** 0.2. **Files:** `modules/instance-pull.ee/binding-session.service.ts`, a read+write controller endpoint. **Scope:** S

### Task 1.2: prd `/credential-binding/:pr` view + credential prefill
**Description:** A Vue view (prd-only) listing the PR's required credentials with live satisfied/
unsatisfied state and **two** resolution actions per requirement; port the credential-id prefill.
**Acceptance criteria:**
- [ ] `instancePull:{enabled,role}` exposed in `FrontendSettings`; route + sidebar gated to prd.
- [ ] Each requirement shows satisfied/unsatisfied computed live against the resolved target credential by `{id,type}`.
- [ ] **Bind existing**: a picker of prd credentials of the right type → writes `setBinding(pr, source, targetId)`.
- [ ] **Create new**: opens the create form prefilled with `credentialType`/`credentialName`/`credentialId=source`; saving with the preset `id` is honoured only when the demo flag is on (`CreateCredentialDto.id`), and records `setBinding(pr, source, source)`.
**Verification:** Open `/credential-binding/1` → unsatisfied cred → either Bind existing OR Create → row flips satisfied; re-running deploy dry-run exits 0.
**Dependencies:** 1.1. **Files:** `frontend-settings.ts`, `frontend.service.ts`, `features/instance-pull.ee/views/CredentialBindingView.vue` + store + api + router + `useSettingsItems`, `CredentialEdit.vue`, `@n8n/api-types/.../create-credential.dto.ts`, `credentials.service.ts`. **Scope:** L

### Checkpoint 1 — binding loop (diagram steps 4, 5)
- [ ] Dry-run link opens the prd binding page showing the missing credential.
- [ ] Creating the credential flips it satisfied; re-running deploy dry-run exits 0.
- [ ] **Review with human.**

---

## Phase 2 — dev raise-review → git/PR + GitHub Actions

### Task 2.1: Export-to-git (GitOps + FilesystemPackageWriter)
**Description:** Port the simple-git wrapper + filesystem writer; dev service exports selected
workflows into a working dir, commits a feature branch, pushes.
**Acceptance criteria:**
- [ ] Selected workflow(s) export as an exploded tree (manifest + workflows + credential requirements) into a working dir.
- [ ] A feature branch is committed and pushed to the production-workflows repo (HTTPS + PAT).
**Verification:** Call the dev raise-review endpoint → branch with the exploded tree appears on the remote.
**Dependencies:** 0.1 (writer lives in n8n-packages). **Files:** `modules/instance-pull.ee/git/git-ops.ts`, `modules/n8n-packages/io/filesystem-package-writer.ts`, `modules/instance-pull.ee/instance-pull.service.ts`. **Scope:** M

### Task 2.2: GitHub client + "Raise review" action
**Description:** Trim the POC GitHub client to open-PR (+later read-check/merge); add the dev-only
workflow-editor menu action that triggers raise-review and opens the PR.
**Acceptance criteria:**
- [ ] Raise-review opens a PR (feature→main) on the production-workflows repo and returns its number/URL.
- [ ] The "Raise review" action is visible only when `instancePull.role === 'dev'`.
**Verification:** Click Raise review on dev → a PR appears on GitHub containing the exploded tree.
**Dependencies:** 2.1. **Files:** `modules/instance-pull.ee/github/github-client.ts`, `instance-pull.controller.ts`, `MainHeader/ActionsDropdownMenu.vue`, instance-pull store/api. **Scope:** M

### Task 2.3: GitHub Actions workflows (production-workflows repo)
**Description:** Two YAML workflows that run the CLI. Authored in the production-workflows repo, not the monorepo.
**Acceptance criteria:**
- [ ] `deploy-dry-run.yml` on `pull_request` runs `npx @n8n/cli deploy --instance "$PRD_URL" --dry-run --pr "${{ github.event.pull_request.number }}" .`; a non-zero exit fails a **required** check.
- [ ] A following `actions/github-script` step upserts a **sticky PR comment** with the binding link + missing-credential summary (consuming the CLI's step output), using the auto-provided `GITHUB_TOKEN`.
- [ ] `deploy-apply.yml` on `push` to `main` runs the same without `--dry-run`.
- [ ] Secrets `PRD_URL`, `PRD_API_KEY` are mapped to `N8N_URL`/`N8N_API_KEY`.
**Verification:** Open the PR from 2.2 → dry-run check runs red (missing cred) → log shows the binding link → create cred → re-run → green.
**Dependencies:** 0.3, 2.2. **Files:** `production-workflows/.github/workflows/deploy-dry-run.yml`, `deploy-apply.yml`. **Scope:** S

### Checkpoint 2 — raise-review → CI gate (diagram steps 1, 2, 3)
- [ ] Raise review → PR with exploded tree → dry-run check red → binding link works → re-run green.
- [ ] **Review with human.**

---

## Phase 3 — dev dashboard + merge → publish (full E2E)

### Task 3.1: dev "My reviews" dashboard + merge
**Description:** Settings dashboard (dev role) listing raised PRs with live GitHub check status and a
Merge button.
**Acceptance criteria:**
- [ ] Lists the user's raised PRs with status badges (`pending`/`blocked`/`ready`/`published`) read live from GitHub check status.
- [ ] A "Merge" button merges the PR via the GitHub merge API when the check is green.
**Verification:** Dashboard shows the PR as blocked while the check is red, ready when green; Merge merges it.
**Dependencies:** 2.2. **Files:** `features/instance-pull.ee/views/InstancePullView.vue` + store/api, `useSettingsItems`, GitHub client read-check/merge verbs, `instance-pull.controller.ts`. **Scope:** L

### Task 3.2: Merge → main apply E2E
**Description:** Confirm merge triggers `deploy-apply.yml` → prd `/import` → activate; dashboard reflects published.
**Acceptance criteria:**
- [ ] Merging (GitHub or dashboard) triggers the apply Action; prd imports + activates the workflows.
- [ ] Dashboard shows the review as published.
**Verification:** Full run-through of all 8 diagram steps; the workflow is active and running on prd.
**Dependencies:** 3.1, 2.3. **Files:** (integration only). **Scope:** S

### Checkpoint 3 — full E2E (all 8 diagram steps)
- [ ] Every diagram box reproduced live. **Demo-ready.**

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Building `deploy` in the wrong (server) CLI drags in DB boot/migrations → unusable in CI | High | Build in `packages/@n8n/cli/` (no DB); verify `npx`-run reaches a remote with just `--url`/`--api-key` in Task 0.3 |
| API-key user lacks `workflow:import` on the target project, or context resolution throws | High | Use a CI key whose user owns the target project; confirm `validate()` is write-free; resolve to the user's personal project by default |
| Naive `tar.c(['.'])` produces paths `TarPackageReader` rejects (needs root `manifest.json`, relative paths) | Med | Pack with `cwd:dir, portable:true`; assert manifest at root in Checkpoint 0 |
| Credential-id collision (id/name match across independent DBs) binds the wrong credential | Med (demo) | Bind-existing lets the operator pick the right prd credential explicitly; full cross-instance identity is out of POC scope |
| Binding session lost on prd restart mid-demo (in-memory) | Low | Sticky PR comment keeps the link durable; re-run the dry-run Action to repopulate; note DB-entity upgrade path |
| GitHub required-check + branch protection not configured on the demo repo | Med | Part of Task 2.3 setup; document the branch-protection toggle in the env sample |

## Known limitations (intentional, POC scope)
- **Apply is an additive import, not a declarative sync.** A workflow *deleted* from `main` is NOT
  removed/deactivated on prd. "All of main runs in prd" holds for the add/update happy path; full
  reconcile (archive/deactivate orphans) is future work.
- A green check proves the required credential **exists** ({id,type}), not that its secret is valid —
  acceptable for the demo.

## Open Questions (none blocking; defaults chosen)
- CLI distribution in CI: defaulting to `npx @n8n/cli` (alt: run the built `dist` from a checkout).
- Apply-side `pr` value on merge: defaulting to passing through; apply does not need the binding session.
