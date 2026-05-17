import { test as base } from './base';
import {
	langsmithFixtures,
	type LangSmithFixtures,
	type LangSmithWorkerFixtures,
} from './langsmith';

// Container-backed eval base. Use when the eval needs a live n8n
// instance — e.g. Instance AI's agent runs inside n8n via REST API,
// AI Workflow Builder feature tests that exercise the full request path.
//
// Composes `fixtures/base` (n8n container per worker, ~17s startup) +
// `langsmithFixtures` (traced + worker-scoped LangSmith client). Consumer
// specs still need to apply their own `test.use(...)` config for
// feature-specific env vars (module enables, API keys, sandbox provider).
//
// For in-process evals (no n8n container needed), use `eval-base.ts` instead.
export const test = base.extend<LangSmithFixtures, LangSmithWorkerFixtures>(langsmithFixtures);

export { expect } from '@playwright/test';
