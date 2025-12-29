import type { StartedTestContainer } from 'testcontainers';

import type { HelperContext, ServiceResult } from '../services/types';

/**
 * Create a helper context from containers and service results.
 */
export function createHelperContext(
	containers: StartedTestContainer[],
	serviceResults: Record<string, ServiceResult>,
): HelperContext {
	return {
		containers,
		findContainer: (pattern: RegExp) => containers.find((c) => pattern.test(c.getName())),
		serviceResults,
	};
}
