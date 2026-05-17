import { test as base } from '@playwright/test';

import {
	langsmithFixtures,
	type LangSmithFixtures,
	type LangSmithWorkerFixtures,
} from './langsmith';

// In-process eval base. Use when the eval runs the subject under test
// directly in-process — e.g. ai-workflow-builder.ee's callback-style
// evals, or instance-ai's `cli/pairwise.ts` via `buildInProcess`.
//
// Does NOT extend `./base`: the container stack from base.ts auto-starts
// and costs ~17s per worker, wasted when no n8n instance is needed.
//
// For container-backed evals (Instance AI's main eval path, anything
// exercising the live REST API), use `eval-base-container.ts` instead.
export const test = base.extend<LangSmithFixtures, LangSmithWorkerFixtures>(langsmithFixtures);

export { expect } from '@playwright/test';
