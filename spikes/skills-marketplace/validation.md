# Validation — 12 November 2026

## API evidence

- 17 completed HTTP GET probes: 12 returned 200, four returned 401, and one returned 400.
- The 400 was the expected response to a one-character query.
- No Authorization header was supplied. No skill was installed or executed.
- Public search returned stable IDs, source names, skill names, and install counts.
- Six downloads supplied a content hash and file inventory.
- The audit sample contained five providers. A warning was retained in the prototype.
- Authenticated v1 responses, capacity, 429 recovery, and cross-origin access remain untested.

## Interactive prototype

Checked with Playwright against the rendered prototype:

- Six cards render from the saved sample.
- Topic filtering returns the expected subset.
- Search combines with the selected topic.
- An unmatched search shows an empty state and a clear action.
- Clearing filters restores all six cards.
- Name and install sorting work.
- PDF details show 11 skipped files out of 12.
- Expanding the PDF inventory shows all 12 paths.
- Model performance stays marked as not evaluated.
- The find-skills detail shows five dated audit results, including the Snyk warning.
- The Your skills tab shows a clearly labeled empty example.
- The provenance page explains that installs are not runs or active users.
- The outage preview retains the dated sample and shows a stale-data notice.
- Arrow keys move between the two tabs.
- The external Skills.sh link opens the correct HTTPS page.
- Checked layouts at browser widths of 1024, 736, 390, and 320 pixels. No horizontal document overflow was found.
- Expanded the 53-file spreadsheet inventory at 320 pixels. No horizontal overflow was found.
- Inspected light and dark desktop views, the file detail view, and the mobile viewport.
- The prototype produced no browser console errors during these checks.

## Local checks

- Python syntax checks passed for both scripts. Bytecode went to a test-owned temporary path.
- `pnpm exec node --check` passed for the prototype script.
- Snapshot counts and file inventories match the saved API responses.
- Whitespace checks passed for the new text artifacts.

These checks covered the original HTML prototype. The working n8n integration was added afterward. See the checks below.

## Working n8n integration

- 157 frontend tests passed: Skills Hub view (89), GitHub connect dialog (60), and discovery actions (8).
- 13 backend tests passed: catalog parsing, upstream failures, redirects, size limits, flag gating, DTO validation, and route permissions.
- Three focused Agent API tests passed. They cover creation and duplication after the partial-config type change.
- API types build passed. The n8n backend compiled with `build:unchecked` for the local preview.
- Changed-file formatting, frontend ESLint, backend type-aware Oxlint, API types Oxlint, and Vue Stylelint passed. Existing warnings remain in unchanged Agent API code.
- Full frontend typechecks and the full test suite were not run locally. Leave these to CI.

Live browser checks used a separate database under `/private/tmp/n8n-skills-marketplace-preview`:

1. Search for `frontend` returned 24 live Skills.sh results through the n8n backend.
2. Try fetched `anthropics/skills` through the existing GitHub importer. The review showed only `frontend-design`. The import saved one skill in the personal project. Agent creation returned a draft with that local skill ID and no published version. The builder opened its Test panel.
3. Save fetched `vercel-labs/skills` and imported only `find-skills` into Global. The card changed to Saved. Your skills showed the stored skill and source. Save made no Agent creation request.
4. After a page reload, Try found the saved Global `find-skills`. It created a personal draft with the existing skill. It did not send another connect/import request.

The local test account has no model credentials. No LLM conversation was run. The existing Agent Test UI made 404 requests for its new, empty chat thread and an Instance AI request returned 403. These did not stop the draft, attached skill, or Test panel from opening. Catalog and import pages had no console errors.

The preview needed IPv4-first DNS on this host. A normal Node request stalled on the Skills.sh connection. The same bounded request succeeded with IPv4-first DNS. The application code does not change DNS policy.
