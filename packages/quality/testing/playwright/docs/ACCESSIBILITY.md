# Add an accessibility check to a Playwright journey

Use the `a11y` fixture in a product journey. It runs axe-core against a named part of the page.

1. Select a bucket from [`A11Y_BUCKETS`](../fixtures/a11y.ts). The buckets are `page`, `canvas`, `ndv`, `node-creator`, `sidebar`, `modal`, and `instance-ai`.
2. Check the bucket after the relevant UI appears. Assert the result when the journey must fail on a violation.

```typescript
test('canvas is accessible', async ({ n8n, a11y }) => {
	await n8n.start.fromBlankCanvas();
	const violations = await a11y.check('canvas');
	expect(violations).toEqual([]);
});
```

The fixture uses WCAG 2.1 A and AA tags by default. Pass `{ tags, disableRules }` to change the rules for one scan. A scan that cannot run logs a warning and returns an empty array. Check that the target UI is present before the scan.

For a second user's page, use `a11y.for(otherN8n).check('modal')`. Both checkers attach scans to the same test.

## Check landmark structure

Use [`assertMainLandmarkStructure`](../utils/a11y-landmark-check.ts) when the journey must check the composed page layout. It checks that the page has one `<main>` element outside other landmarks and one `id="content"`.

```typescript
import { assertMainLandmarkStructure } from '../../../utils/a11y-landmark-check';

await assertMainLandmarkStructure(n8n.page);
```

Use `checkMainLandmarkStructure(page)` to receive `{ ok, problems }` instead of throwing. The [a11y suite](../tests/e2e/a11y/) checks this helper with synthetic markup.

## Inspect a report or set a budget

Scans attach to their tests by default. Set `PLAYWRIGHT_A11Y_REPORT=1` to write an HTML report and a job summary:

```bash
PLAYWRIGHT_A11Y_REPORT=1 pnpm --filter n8n-playwright test:local
```

Checks report violations without failing by default. Set `PLAYWRIGHT_A11Y_MAX_VIOLATIONS` to fail a test when its violation count exceeds the limit:

```bash
PLAYWRIGHT_A11Y_MAX_VIOLATIONS=5 pnpm --filter n8n-playwright test:local
```

The budget does not apply when the test already failed for another reason. The [reporter](../reporters/a11y-reporter.ts) scores each bucket and attaches metrics. CI also sends bucket scores through the [QA metrics pipeline](../../../../../.github/CI-TELEMETRY.md).
