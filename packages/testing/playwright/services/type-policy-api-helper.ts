import type {
	AvailableCredentialTypesResponse,
	AvailableTypesResponse,
	NonDelegatingPolicyAction,
	NonDelegatingPolicyRule,
	PolicyAction,
	PolicyRule,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

const ENDPOINTS = {
	node: { policies: 'node-type-policies', availability: 'available-types' },
	credential: { policies: 'credential-type-policies', availability: 'available-credential-types' },
} as const;

type TypePolicyKind = keyof typeof ENDPOINTS;

type AvailabilityResponse<K extends TypePolicyKind> = K extends 'node'
	? AvailableTypesResponse
	: AvailableCredentialTypesResponse;

interface EffectivePolicy {
	rules: PolicyRule[];
	defaultAction: PolicyAction;
	version: number;
}

/** A rule on one type name. Keeps the action's literal type, so project rules typecheck. */
export function policyRule<A extends PolicyAction>(
	action: A,
	typeName: string,
): PolicyRule & { action: A } {
	return { id: `${action}-${nanoid(6)}`, action, selector: { kind: 'name', value: typeName } };
}

/**
 * Node or credential type policies at instance and project scope. Every write reads the
 * scope's current `version` first, because the endpoints reject a write with a stale one.
 */
export class TypePolicyApiHelper<K extends TypePolicyKind> {
	constructor(
		private readonly api: ApiHelpers,
		private readonly kind: K,
		private readonly publicApiKey?: string,
	) {}

	/** The same helper, writing through `/api/v1` with a key that holds the manage scope. */
	viaPublicApi(apiKey: string): TypePolicyApiHelper<K> {
		return new TypePolicyApiHelper(this.api, this.kind, apiKey);
	}

	async setInstancePolicy(policy: { rules: PolicyRule[]; defaultAction: PolicyAction }) {
		const { policies } = ENDPOINTS[this.kind];
		const path = this.publicApiKey ? `/api/v1/${policies}/instance` : `/rest/${policies}/instance`;
		const { version } = await this.read(path);
		await this.write(path, { ...policy, version });
	}

	async setProjectPolicy(
		projectId: string,
		policy: { rules: NonDelegatingPolicyRule[]; defaultAction: NonDelegatingPolicyAction },
	) {
		const { policies } = ENDPOINTS[this.kind];
		const path = this.publicApiKey
			? `/api/v1/${policies}/projects/${projectId}`
			: `/rest/projects/${projectId}/${policies}/project`;
		const { version } = await this.read(path);
		await this.write(path, { ...policy, version });
	}

	/** Allows every type of this kind on the instance again. */
	async resetInstancePolicy() {
		await this.setInstancePolicy({ rules: [], defaultAction: 'allow' });
	}

	async getAvailability(projectId: string): Promise<AvailabilityResponse<K>> {
		const path = `/rest/projects/${projectId}/${ENDPOINTS[this.kind].availability}`;
		const response = await this.api.request.get(path);

		if (!response.ok()) {
			throw new TestError(`GET ${path} failed (${response.status()}): ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	private get headers(): Record<string, string> {
		return this.publicApiKey ? { 'X-N8N-API-KEY': this.publicApiKey } : {};
	}

	private async read(path: string): Promise<EffectivePolicy> {
		const response = await this.api.request.get(path, { headers: this.headers });

		if (!response.ok()) {
			throw new TestError(`GET ${path} failed (${response.status()}): ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	private async write(path: string, data: EffectivePolicy) {
		const response = await this.api.request.put(path, { data, headers: this.headers });

		if (!response.ok()) {
			throw new TestError(`PUT ${path} failed (${response.status()}): ${await response.text()}`);
		}
	}
}
