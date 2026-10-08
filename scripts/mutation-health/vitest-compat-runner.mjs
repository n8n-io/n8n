/**
 * Stryker plugin that declares the `vitest-compat` test runner. It is the
 * runner of `@stryker-mutator/vitest-runner` with two fixes for Vitest 5 (see
 * vitest-compat.mjs). mutate.mjs selects it for every config that uses the
 * plain `vitest` runner, and Stryker loads this file by its path in each test
 * runner process.
 *
 * Keep this file to the import: the logic is in vitest-compat.mjs, where the
 * unit tests reach it without the runner installed.
 */
import { strykerPlugins as vitestRunnerPlugins } from '@stryker-mutator/vitest-runner';

import { compatPlugins } from './vitest-compat.mjs';

export const strykerPlugins = compatPlugins(vitestRunnerPlugins);
