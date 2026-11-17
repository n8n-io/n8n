# Ordered implementation plan

These are proposed tickets. No Linear issues were created. Before filing, compare them with LIGO-1089, LIGO-1091, and LIGO-1250. Their contents were unavailable in this investigation. Merge overlapping work rather than creating duplicate tickets.

Effort sizes are estimates of engineering scope, not calendar commitments. M is roughly 2–3 days, L is 3–5 days, and XL needs further breakdown. Cross-project moves are a separate release gate after dependency handling.

## 1. Define and test the package compatibility contract — L

Depends on: agreement with the spike's ownership and coverage decisions.

Write format 2 schemas for explicit resource owners, minimal owner-project descriptors, scoped requirements, sharing intent, coverage, and explicit removals. Keep the format 1 reader and writer path. Specify which operations require format 2. Propagate shared types through `@n8n/api-types` and package readers. Do not change general package import policy solely for Promotions.

Acceptance:

- Existing format 1 fixtures still parse with the same meaning.
- Format 2 partial coverage never permits absence-based instance deletion.
- Duplicate definitions, inconsistent path/owner pairs, and malformed scope references fail before writes.
- Unsupported versions fail before setup through directory, archive, Git, and API entry points.
- Document the reader-first rollout and rollback procedure.

## 2. Preserve metadata through Git and selective overlays — L

Depends on: 1.

Update branch inventory, package paths, working-copy overlay, manifest bridge, diff, and preview hashes. Keep omitted metadata and requirements for unselected consumers. Remove stale requirement consumers when selected content stops referencing them.

Acceptance:

- Selective Promote preserves unrelated project content and sharing metadata.
- Repeating the same export produces no semantic diff.
- A top-level resource retains an external owner descriptor after overlay and reload.
- Same variable name in different scopes remains distinct.
- Moving or renaming directories cannot erase ownership metadata or duplicate a resource.

## 3. Add one dependency and ownership planner — XL

Depends on: 1. Integrate with 2 before shipping.

Extend the existing import plan with package-wide resource resolution. Reuse the requirement extractors and workflow reference registry. Classify requirements as included, reusable, missing, inaccessible, unsupported, or dynamic. Separate caller allowlists from execution dependencies. Include runtime project usability in resolution.

Acceptance:

- Instance and project entry points produce equivalent decisions for the same selection and target state.
- Selecting W does not update an unselected dependency D.
- Missing dependencies block affected content before writes.
- Cycles terminate and preserve one resolution per ID.
- Variables resolve in declared scope. Dynamic references are warnings with no evaluated expressions.
- Cross-project data tables report unsupported scope instead of creating a consumer-project copy.
- Hidden dependencies do not expose names, owners, or transitive content.

Split into extraction/classification and target-resolution tickets if implementation exceeds XL.

## 4. Add Promote dependency review and expansion — L

Depends on: 2 and 3.

Use the shared planner before export. Keep external workflow dependencies as references by default. Add explicit authorized expansion in the existing review. Export owner descriptors without unrelated project content. Keep personal and cross-repository dependencies reference-only.

Acceptance:

- The common case adds no modal or confirmation step.
- Every extra content write appears in review.
- An inaccessible dependency can remain external without exporting hidden content.
- A personal dependency cannot be included.
- Changed source state requires a refreshed review before commit.
- API callers receive structured results with the same policy as the UI.

## 5. Resolve owner projects and shared credential setup once — XL

Depends on: 2 and 3.

Introduce declared owner placement and a package-wide credential resolution map. Reuse the existing credential setup UI. Separate setup, grant, update, and reuse operations. Create missing team owners through the existing project service. Never create a personal owner or infer an owner from the consumer.

Acceptance:

- Two projects that use C resolve to one target credential C.
- New C is configured in its declared owner project. Secret values remain target-local.
- A minimal owner descriptor does not update existing project settings or delete its content.
- Missing sharing produces an explicit, authorized grant operation.
- Partial grant metadata preserves unrelated grants. Explicit removals require impact review.
- Wrong owner, wrong credential type, incompatible usage scope, or missing authority blocks the relevant operation.
- Retrying setup after a partial failure does not create duplicate resources.

## 6. Integrate Apply review, coverage, and stale-plan checks — L

Depends on: 3 and 5.

Use the same plan in preview and execution. Include dependency state and grants in preview revisions. Add remediation for missing external requirements. Reconcile only declared complete scopes or explicit removals. Preserve current publication policy and target variable values.

Acceptance:

- A missing static requirement stops content writes.
- An unrelated valid selection can apply after the user excludes blocked consumers.
- Changed Git commits, owner changes, or revoked permissions require replanning.
- Applying a partial package cannot delete an unrelated project or resource.
- Existing format 1 full Apply keeps its current reviewed deletion behavior.
- Outcome reporting distinguishes setup writes, content writes, reuse, and failed work.

## 7. Implement authorized team-to-team workflow moves — XL

Depends on: 6.

Replace the move refusal with an explicit transfer plan for supported workflow moves. Compare base, desired, and target ownership. Preserve ID, history, and publication policy. Validate incoming references and destination credential/variable access. Execute ownership and folder placement changes as one persistence transaction.

Acceptance:

- The same move appears once from either affected project.
- An already-applied move is a no-op on retry.
- A third target owner produces a drift conflict.
- Missing destination projects follow the declared creation flow.
- Missing authority on either project blocks before transfer.
- Personal and cross-repository moves remain blocked.
- Removal reconciliation cannot delete a transferred workflow.
- Active and archived workflows retain their intended state and lifecycle cleanup.

## 8. Extend moves to other supported resource types — XL

Depends on: 7.

Handle folder subtrees and credential transfers through domain operations. For tables and variables, first verify that a safe domain transfer exists. If it does not, retain the typed unsupported-move result and split implementation into a later ticket. Do not make workflow move delivery depend on inventing new runtime capabilities.

Acceptance:

- A folder move includes its complete subtree or blocks. It never transfers unselected children silently.
- A credential transfer preserves one ID and reviews changes in consumer access.
- Variable moves reject scoped-name collisions and show affected consumers.
- Table transfers preserve rows and reject unsupported runtime access.
- Tags remain global and do not acquire an artificial owner.

## 9. Add compatibility, permission, and failure regression coverage — L

Depends on: each feature ticket; land relevant tests with each implementation. This ticket owns the final combined matrix.

Use existing Promotions and package integration fixtures. Add focused tests for the matrix below. Use Playwright for the review, setup, and retry flows. Run unit tests with one worker. Use test-owned n8n settings directories. Leave comprehensive lint, type checks, and broad suites to CI.

| Dimension | Required cases |
|---|---|
| Entry point | Instance Promote/Apply; selective project Promote/Apply; API; effective environment resolver |
| Dependency | Included; external and valid; external and missing; hidden; personal; dynamic; cycle |
| Ownership | Existing team; missing team; unknown legacy owner; conflicting target owner |
| Sharing | Existing grant; missing grant; explicit revoke; unrelated local grant; unauthorized grant |
| Selection | One consumer; two consumers; excluded dependency; excluded owner content; explicit deletion |
| Variables | Same key in two projects; project/global shadowing; missing definition; target value preservation |
| Moves | Both directions; already applied; third owner; missing target project; partial folder subtree |
| Compatibility | Format 1 unchanged; format 2 partial/full; old reader rejects; unknown future version |
| Failure | Stale source; stale target; permission revoked; setup succeeds then Apply blocks; interrupted transfer; retry |

Verify no metadata leakage, no duplicate credentials, no unintended deletion, and no unselected content update. Test exact outcomes rather than only successful HTTP responses.

## 10. Roll out and document the contract — M

Depends on: 1–6 and 9 for dependency support. Moves require 7 and the applicable parts of 8.

Ship behind an opt-in flag on master. Upgrade readers first. Enable format 2 writes only for opted-in environments whose participating instances support it. Use neutral release copy that explains owner placement, external dependencies, and setup. Document that per-project repositories and personal project promotion remain outside scope.

Acceptance:

- Old branches work without migration.
- Administrators can identify which branches require new readers.
- Disabling new writes does not make existing format 2 packages unreadable on upgraded instances.
- The rollback path uses a compatible Git commit rather than stripping required metadata.
- Product metrics, if added, use the shared telemetry registry and avoid resource names, variable values, and credential data.

## Delivery order

Contract → Git preservation → shared planner → Promote review and Apply setup → Apply integration → dependency release gate → supported transfers → combined release verification.

Do not start with a credential-only placement patch. It would leave deletion coverage and per-project planning inconsistent. The first shippable slice is safe external reuse plus clear blockers, with no fallback creation. The next slice adds explicit owner-project setup and sharing. Moves follow once that contract is stable.
