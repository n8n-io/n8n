import { request } from '@playwright/test';
import type { ServiceHelpers } from 'n8n-containers/services/types';
import {
	createN8NStack,
	type N8NConfig,
	type N8NProcessUrl,
	type N8NStack,
} from 'n8n-containers/stack';

import { ApiHelpers } from '../services/api-helper';
import { TestError } from '../Types';

/**
 * The n8n instance under test. Tests and clients see only this contract, so
 * they do not depend on how the instance was started.
 */
export interface Sut {
	/** The backend, as the test process reaches it. */
	url: string;
	/** The editor, as the browser reaches it. */
	editorUrl: string;
	/** The backend, as n8n reaches itself from inside its own network. */
	internalUrl: string;
	/** Direct URLs of the mains. Empty when the mains are not addressable. */
	mainUrls: string[];
	/** Direct URLs of the n8n processes for diagnostics. */
	processUrls: N8NProcessUrl[];
	/** Access to a service that is not available throws a named error. */
	services: ServiceHelpers;
	/** The Docker stack, when the harness owns the processes. */
	stack?: N8NStack;
	/** Empties the database and seeds the test users. Throws when not permitted. */
	reset(): Promise<void>;
	/** Applies the features and quotas that every test starts with. */
	applyDefaults(): Promise<void>;
	stop(): Promise<void>;
}

async function resetDatabase(url: string): Promise<void> {
	await using context = await request.newContext({ baseURL: url });
	await new ApiHelpers(context).resetDatabase();
}

async function applyDefaultFeatures(url: string): Promise<void> {
	await using context = await request.newContext({ baseURL: url });
	await new ApiHelpers(context).applyDefaultFeatures();
}

function denied(operation: string) {
	return async () => {
		throw new TestError(`${operation} is not permitted on this SUT`);
	};
}

function unavailableServices(label: string): ServiceHelpers {
	return new Proxy({} as ServiceHelpers, {
		get(_target, property) {
			// Awaiting or inspecting the object must not throw.
			if (typeof property !== 'string' || property === 'then') return undefined;
			throw new TestError(`Service "${property}" is not available on ${label}`);
		},
	});
}

/** Starts a Docker stack for one worker and brings it to the known state. */
async function startTestcontainers(config: N8NConfig): Promise<Sut> {
	const stack = await createN8NStack(config);
	const sut: Sut = {
		url: stack.baseUrl,
		editorUrl: stack.baseUrl,
		internalUrl: stack.internalMainUrls[0],
		mainUrls: stack.mainUrls,
		processUrls: stack.processUrls,
		services: stack.services,
		stack,
		reset: async () => {
			await resetDatabase(stack.baseUrl);
			// The reset endpoint reaches only the control plane database.
			await stack.engineDatabase?.truncateEngineDatabase();
		},
		applyDefaults: async () => await applyDefaultFeatures(stack.baseUrl),
		stop: stack.stop,
	};
	try {
		await sut.reset();
		return sut;
	} catch (error) {
		await stack.stop();
		throw error;
	}
}

/**
 * Connects to an instance that the harness does not own. Workers share it, so
 * it is not reset at start. A per-test reset needs `RESET_E2E_DB=true`.
 */
export function attach(env: NodeJS.ProcessEnv = process.env): Sut {
	const url = env.N8N_BASE_URL;
	if (!url) throw new TestError('N8N_BASE_URL is required for an attached SUT');
	return {
		url,
		editorUrl: env.N8N_EDITOR_URL ?? url,
		internalUrl: env.N8N_INTERNAL_URL ?? url,
		mainUrls: [],
		processUrls: [{ role: 'main', name: 'main', url }],
		services: unavailableServices('an attached SUT'),
		reset: env.RESET_E2E_DB === 'true' ? async () => await resetDatabase(url) : denied('Reset'),
		applyDefaults: async () => await applyDefaultFeatures(url),
		stop: async () => {},
	};
}

export async function startSut(config: N8NConfig): Promise<Sut> {
	return process.env.N8N_BASE_URL ? attach() : await startTestcontainers(config);
}
