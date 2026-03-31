import { RuleRunner } from '@n8n/rules-engine';
import type { RuleSettingsMap } from '@n8n/rules-engine';

import type { CodeHealthContext } from './context.js';
import { CatalogViolationsRule } from './rules/catalog-violations.rule.js';

export type { CodeHealthContext } from './context.js';
export { CatalogViolationsRule } from './rules/catalog-violations.rule.js';

const defaultRuleSettings: RuleSettingsMap = {
	'catalog-violations': {
		enabled: true,
		severity: 'error',
		options: { workspaceFile: 'pnpm-workspace.yaml' },
	},
};

export function createDefaultRunner(settings?: RuleSettingsMap): RuleRunner<CodeHealthContext> {
	const runner = new RuleRunner<CodeHealthContext>();
	runner.registerRule(new CatalogViolationsRule());
	runner.applySettings({ ...defaultRuleSettings, ...settings });
	return runner;
}
