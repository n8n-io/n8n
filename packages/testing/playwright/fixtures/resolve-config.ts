import type { N8NConfig } from 'n8n-containers/stack';

import { CAPABILITIES, type CapabilityOption } from './capabilities';

function parseGlobalTestEnv(raw: string | undefined): Record<string, string> {
	if (!raw) return {};
	try {
		return JSON.parse(raw) as Record<string, string>;
	} catch {
		console.warn('[resolve-config] Failed to parse N8N_TEST_ENV');
		return {};
	}
}

/**
 * The stack configuration for a worker: the project's `containerConfig`, then
 * the spec's `capability`, then the global `N8N_TEST_ENV`. The result does not
 * depend on the SUT source.
 */
export function resolveConfig(
	base: N8NConfig,
	capability: CapabilityOption | undefined,
	env: NodeJS.ProcessEnv,
): N8NConfig {
	const override: N8NConfig =
		typeof capability === 'string' ? CAPABILITIES[capability] : (capability ?? {});

	return {
		...base,
		...override,
		services: [...new Set([...(base.services ?? []), ...(override.services ?? [])])],
		env: {
			...parseGlobalTestEnv(env.N8N_TEST_ENV),
			...base.env,
			...override.env,
			E2E_TESTS: 'true',
			N8N_RESTRICT_FILE_ACCESS_TO: '',
		},
		// The coverage runner sets N8N_COVERAGE_DIR so the containers collect V8 coverage.
		...(env.N8N_COVERAGE_DIR ? { coverageHostDir: env.N8N_COVERAGE_DIR } : {}),
	};
}
