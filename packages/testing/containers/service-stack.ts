import type { ServiceName } from './services/types';
import { createN8NStack, type N8NStack } from './stack';

export interface ServiceStackOptions {
	services: ServiceName[];
	projectName?: string;
}

/**
 * Creates a stack with only services (no n8n containers).
 * Useful for integration tests that need databases/services but not full n8n.
 *
 * @example
 * const stack = await createServiceStack({ services: ['postgres'] });
 * const pgContainer = stack.serviceResults.postgres?.container;
 * const host = pgContainer.getHost();
 * const port = pgContainer.getMappedPort(5432);
 * await stack.stop();
 */
export async function createServiceStack(options: ServiceStackOptions): Promise<N8NStack> {
	const { services, projectName } = options;

	return await createN8NStack({
		mains: 0,
		workers: 0,
		postgres: services.includes('postgres'),
		services,
		projectName,
	});
}