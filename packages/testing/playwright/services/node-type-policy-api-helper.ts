import type { PolicyAction, PolicyRule } from '@n8n/api-types';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export interface InstancePolicy {
	rules: PolicyRule[];
	defaultAction: PolicyAction;
	version: number;
}

const INSTANCE_POLICY_URL = '/rest/node-type-policies/instance';

/**
 * Helpers for the instance-scope node type availability policy.
 *
 * Endpoints:
 *   - GET /rest/node-type-policies/instance
 *   - PUT /rest/node-type-policies/instance
 *
 * Both need the `feat:nodeTypePolicies` license at boot and the
 * `nodeTypePolicy:manage` global scope, so run these flows as the owner on a
 * licensed instance with the `type-availability-policies` module enabled.
 */
export class NodeTypePolicyApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	async getInstancePolicy(): Promise<InstancePolicy> {
		const response = await this.api.request.get(INSTANCE_POLICY_URL);

		if (!response.ok()) {
			throw new TestError(
				`GET ${INSTANCE_POLICY_URL} failed (${response.status()}): ${await response.text()}`,
			);
		}

		const result = await response.json();

		return result.data ?? result;
	}

	/**
	 * Writes the composed instance policy. The route is optimistically
	 * concurrent, so the current version is read first and sent back.
	 */
	async putInstancePolicy(policy: {
		rules: PolicyRule[];
		defaultAction: PolicyAction;
	}): Promise<InstancePolicy> {
		const { version } = await this.getInstancePolicy();

		const response = await this.api.request.put(INSTANCE_POLICY_URL, {
			data: { ...policy, version },
		});

		if (!response.ok()) {
			throw new TestError(
				`PUT ${INSTANCE_POLICY_URL} failed (${response.status()}): ${await response.text()}`,
			);
		}

		const result = await response.json();

		return result.data ?? result;
	}

	/** Restores the default: no rules, everything allowed. */
	async clearInstancePolicy(): Promise<InstancePolicy> {
		return await this.putInstancePolicy({ rules: [], defaultAction: 'allow' });
	}
}
