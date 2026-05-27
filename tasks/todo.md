# TODO: Credential Export

Companion to [plan.md](./plan.md). Strike through as items land.

## V1 — Happy path

- [ ] **T1.1** — Add `spec/requirements.schema.ts`, `spec/serialized/credential.schema.ts`; extend `spec/manifest.schema.ts` with optional `credentials[]` + `requirements`. *(Verify: `pnpm typecheck` clean; existing tests green.)*
- [ ] **T1.2** — Add optional `fallback` param to `generateSlug`; unit test empty-name → `'credential'`. *(Verify: `pnpm test src/modules/n8n-packages/io`.)*
- [ ] **T1.3** — Widen `WorkflowExporter.export` return to `{ entries, credentialReferences }`; update existing tests; add a test covering credential-ref emission. *(Verify: `pnpm test src/modules/n8n-packages/entities/workflow`.)*
- [ ] **T1.4** — Add `CredentialSerializer` + unit test that strips extra fields. *(Verify: unit test green.)*
- [ ] **T1.5** — Add `CredentialExporter` happy path (empty input + single accessible credential); unit tests for rows 1, 2, 8 of SPEC §5. *(Verify: unit tests green.)*
- [ ] **T1.6** — Wire `CredentialExporter` into `N8nPackagesService`; emit `credentials`/`requirements` only when non-empty. *(Verify: existing integration tests still green.)*
- [ ] **T1.7** — Add `export-workflow-with-credentials.integration.test.ts` with the single-credential happy-path case. *(Verify: integration test green.)*

### 🔍 Checkpoint 1
- [ ] Manifest with zero credentials byte-identical to today
- [ ] `pnpm lint && pnpm typecheck` clean from `packages/cli`
- [ ] Manual smoke against a dev instance

---

## V2 — Dedup + slug collisions

- [ ] **T2.1** — Dedup credentials across workflows in `CredentialExporter`; unit test for row 3 of SPEC §5. *(Verify: unit test green.)*
- [ ] **T2.2** — Slug-collision handling for credentials (numeric suffix); unit test for row 4 of SPEC §5. *(Verify: unit test green.)*
- [ ] **T2.3** — Integration test: two workflows sharing one credential. *(Verify: integration test green.)*

### 🔍 Checkpoint 2
- [ ] All unit + integration tests green
- [ ] No public method signatures changed since V1

---

## V3 — Orphan handling

- [ ] **T3.1** — Add `findCredentialById` probe to distinguish orphan vs forbidden; orphan path emits requirements-only entry; unit test for row 5 of SPEC §5. *(Verify: unit test green.)*
- [ ] **T3.2** — Integration test: workflow node references a non-existent credential id. *(Verify: integration test green.)*

### 🔍 Checkpoint 3
- [ ] No surprise N+1 — `findCredentialById` only called for the null cases

---

## V4 — Forbidden credentials

- [ ] **T4.1** — Detect forbidden creds and throw aggregated `UserError`; ensure no partial writes (resolve all → classify → write); unit tests for row 6 of SPEC §5 + mixed-forbidden-accessible case. *(Verify: unit tests green.)*
- [ ] **T4.2** — Integration test: workflow shared with member, credential not; member's export throws `UserError`. *(Verify: integration test green; tar not streamed.)*

### 🔍 Checkpoint 4
- [ ] All 7 acceptance criteria from SPEC §1 pass
- [ ] Unit table rows 1–8 from SPEC §5 covered

---

## V5 — Sweep

- [ ] **T5.1** — Full-repo `pnpm build > build.log && tail -n 20 build.log`; `pnpm lint && pnpm typecheck` from root. *(Verify: clean.)*
- [ ] **T5.2** — Manual smoke: end-to-end export with credential, with shared credential, with deleted credential.
- [ ] **T5.3** — Decide on slug-collision-suffix extraction (lift to `io/slug.utils.ts` if duplicated verbatim, else document divergence).
- [ ] **T5.4** — `gh pr create --draft` referencing Linear ticket + SPEC.md.

---

## Out-of-band watch-items (from plan §4)

- [ ] `isGlobal` credentials still serialize correctly through the happy path (no special-casing in v1, verify no leakage)
- [ ] `nodes[*].credentials` iterated by value not key (test pins this in T1.3)
- [ ] `UserError` message grammar matches `WorkflowExporter`'s (first-20 truncation, `, and N more` suffix)
