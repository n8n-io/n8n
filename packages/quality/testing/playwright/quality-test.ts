import type { CurrentsFixtures, CurrentsWorkerFixtures } from '@currents/playwright';
import { fixtures } from '@currents/playwright';
import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

export const test = base.extend<CurrentsFixtures, CurrentsWorkerFixtures>(fixtures.baseFixtures);
