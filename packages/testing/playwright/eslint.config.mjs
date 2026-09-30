import { backendConfig } from '@n8n/eslint-config/backend';
import playwrightPlugin from 'eslint-plugin-playwright';

import { legacyFilenameCaseFiles } from './lint-filename-debt.mjs';

export default [
	...backendConfig,
	playwrightPlugin.configs['flat/recommended'],
	{
		ignores: [
			'playwright-report/**/*',
			'ms-playwright-cache/**/*',
			// Downloaded browser bundles. Gitignored, but flat config does not read
			// .gitignore, and Chromium ships loose .js files under resources/.
			'.playwright-browsers/**/*',
			'coverage/**/*',
			'scripts/**/*',
			'janitor.config.mjs',
		],
	},
	{
		rules: {
			'no-empty-pattern': 'error',
			'playwright/expect-expect': 'warn',
			'playwright/max-nested-describe': 'warn',
			'playwright/no-conditional-in-test': 'error',
			'playwright/no-skipped-test': 'warn',
			'import-x/no-extraneous-dependencies': [
				'error',
				{
					devDependencies: ['**/tests/**', '**/e2e/**', '**/playwright/**'],
					optionalDependencies: false,
				},
			],
		},
	},
	{
		files: legacyFilenameCaseFiles,
		rules: { 'unicorn/filename-case': 'off' },
	},
	{
		files: [
			'fixtures/langsmith.ts',
			'fixtures/quarantine.ts',
			'tests/cli-workflows/workflow-tests.spec.ts',
			'tests/e2e/chat-hub/fixtures.ts',
			'tests/e2e/instance-ai/fixtures.ts',
			'tests/e2e/instance-ai/instance-ai-workflow-setup.spec.ts',
			'tests/e2e/workflows/editor/execution/fixtures.ts',
			'tests/framework/consumers.ts',
		],
		rules: { 'no-empty-pattern': 'off' },
	},
	{
		files: [
			'composables/BuilderWizardComposer.ts',
			'helpers/ClipboardHelper.ts',
			'pages/PublicFormPage.ts',
			'pages/SettingsUsersPage.ts',
			'pages/SourceControlPushModal.ts',
			'reporters/ci-metrics.test.ts',
			'services/tag-api-helper.ts',
			'services/variables-api-helper.ts',
			'tests/cli-workflows/setup-workflow-tests.ts',
			'tests/e2e/projects/projects.spec.ts',
			'tests/e2e/workflows/editor/expressions/quickjs-engine.spec.ts',
			'tests/e2e/workflows/executions/list.spec.ts',
			'tests/e2e/workflows/templates/templates.spec.ts',
			'tests/evals/_smoke/langsmith-fixture.spec.ts',
			'tests/evals/instance-ai/weather-alert.spec.ts',
			'tests/infrastructure/benchmarks/ui/executions-list-customer-scale.spec.ts',
			'utils/benchmark/kafka-driver.ts',
		],
		rules: { '@typescript-eslint/promise-function-async': 'off' },
	},
];
