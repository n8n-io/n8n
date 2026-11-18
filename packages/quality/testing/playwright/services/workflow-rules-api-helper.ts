import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

interface StoredRuleSet {
	version: number;
	ruleSet: RuleSetBody;
}

/** The request shape of a rule set. The server validates the details. */
export interface RuleSetBody {
	rules?: Array<{
		ruleId: string;
		severity: 'off' | 'warn' | 'block';
		options?: Record<string, unknown>;
		adjustable?: boolean;
	}>;
	customRules?: Array<Record<string, unknown>>;
}

/** REST helpers for the Workflow Rules module. Requires `N8N_ENABLED_MODULES=workflow-rules`. */
export class WorkflowRulesApiHelper {
	constructor(private readonly api: ApiHelpers) {}

	/** Replaces the instance rule set, whatever version is stored. */
	async setInstanceRules(ruleSet: RuleSetBody) {
		const current = await this.read<StoredRuleSet>('/rest/workflow-rules/instance');
		const response = await this.api.request.put('/rest/workflow-rules/instance', {
			data: { ruleSet: { rules: [], customRules: [], ...ruleSet }, version: current.version },
		});
		if (!response.ok()) {
			throw new TestError(
				`PUT workflow rules failed (${response.status()}): ${await response.text()}`,
			);
		}
	}

	async getInstanceRules(): Promise<StoredRuleSet> {
		return await this.read<StoredRuleSet>('/rest/workflow-rules/instance');
	}

	async reset() {
		await this.setInstanceRules({});
	}

	async exempt(workflowId: string, ruleId: string, reason = 'E2E exemption') {
		const response = await this.api.request.post('/rest/workflow-rules/exemptions', {
			data: { workflowId, ruleId, reason },
		});
		if (!response.ok()) {
			throw new TestError(`POST exemption failed (${response.status()}): ${await response.text()}`);
		}
	}

	private async read<T>(path: string): Promise<T> {
		const response = await this.api.request.get(path);
		if (!response.ok()) {
			throw new TestError(`GET ${path} failed (${response.status()}): ${await response.text()}`);
		}
		const body: { data: T } = await response.json();
		return body.data;
	}
}
