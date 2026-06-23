import { RuleRunner } from '@n8n/rules-engine';
import type { RuleSettingsMap } from '@n8n/rules-engine';

import type { CodeHealthContext } from './context.js';
import { CatalogViolationsRule } from './rules/catalog-violations.rule.js';
import { EndpointScopeCoverageRule } from './rules/endpoint-scope-coverage.rule.js';
import { MigrationTimestampRule } from './rules/migration-timestamp.rule.js';
import { StaleOverridesRule } from './rules/stale-overrides.rule.js';
import { SubpathPurityRule } from './rules/subpath-purity.rule.js';
import { WorkflowPrTargetSafetyRule } from './rules/workflow-pr-target-safety.rule.js';

export type { CodeHealthContext } from './context.js';
export { CatalogViolationsRule } from './rules/catalog-violations.rule.js';
export { EndpointScopeCoverageRule } from './rules/endpoint-scope-coverage.rule.js';
export { MigrationTimestampRule } from './rules/migration-timestamp.rule.js';
export { StaleOverridesRule } from './rules/stale-overrides.rule.js';
export { SubpathPurityRule } from './rules/subpath-purity.rule.js';
export type { SubpathSpec } from './rules/subpath-purity.rule.js';
export { WorkflowPrTargetSafetyRule } from './rules/workflow-pr-target-safety.rule.js';

const defaultRuleSettings: RuleSettingsMap = {
	'catalog-violations': {
		enabled: true,
		severity: 'error',
		options: { workspaceFile: 'pnpm-workspace.yaml' },
	},
	'workflow-pr-target-safety': {
		enabled: true,
		severity: 'error',
		options: { allowedWorkflows: ['ci-cla-check.yml'] },
	},
	'migration-timestamp': {
		enabled: true,
		severity: 'error',
		options: {},
	},
	'stale-overrides': {
		enabled: true,
		severity: 'warning',
		options: { workspaceFile: 'pnpm-workspace.yaml', lockFile: 'pnpm-lock.yaml' },
	},
	'endpoint-scope-coverage': {
		// Disabled by default: enabling gates CI on ~129 existing authenticated-unscoped
		// routes, which must first be reviewed and grandfathered into the baseline.
		enabled: false,
		severity: 'warning',
		options: { packages: ['packages/cli'] },
	},
	'subpath-purity': {
		enabled: true,
		severity: 'error',
		options: {
			subpaths: [
				{
					name: '@n8n/backend-network/transport',
					entry: 'packages/@n8n/backend-network/src/transport.ts',
					forbidden: ['@n8n/di', '@n8n/backend-common', '@n8n/config', 'cache-manager'],
					allowedExternals: ['n8n-workflow', 'undici'],
				},
			],
		},
	},
};

function mergeSettings(defaults: RuleSettingsMap, overrides?: RuleSettingsMap): RuleSettingsMap {
	if (!overrides) return defaults;

	const merged = { ...defaults };
	for (const [ruleId, override] of Object.entries(overrides)) {
		const base = merged[ruleId];
		merged[ruleId] = base
			? { ...base, ...override, options: { ...base.options, ...override?.options } }
			: override;
	}
	return merged;
}

export function createDefaultRunner(settings?: RuleSettingsMap): RuleRunner<CodeHealthContext> {
	const runner = new RuleRunner<CodeHealthContext>();
	runner.registerRule(new CatalogViolationsRule());
	runner.registerRule(new WorkflowPrTargetSafetyRule());
	runner.registerRule(new MigrationTimestampRule());
	runner.registerRule(new StaleOverridesRule());
	runner.registerRule(new EndpointScopeCoverageRule());
	runner.registerRule(new SubpathPurityRule());
	runner.applySettings(mergeSettings(defaultRuleSettings, settings));
	return runner;
}
