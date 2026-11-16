// Vitest config used by Stryker only, not by `pnpm test` or CI unit runs.
// It is the normal config, but only the default expression engine (vm) runs,
// next to the engine-independent tests. The other engines would multiply the
// run time.
import { defineConfig } from 'vitest/config';

import vitestConfig from './vitest.config';

const projects = vitestConfig.test?.projects?.filter(
	(project) =>
		typeof project !== 'object' ||
		!('test' in project) ||
		[undefined, '', 'vm'].includes(project.test?.env?.N8N_EXPRESSION_ENGINE),
);

export default defineConfig({ ...vitestConfig, test: { ...vitestConfig.test, projects } });
