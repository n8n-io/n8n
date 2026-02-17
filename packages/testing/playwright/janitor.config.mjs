/**
 * n8n Playwright Janitor Configuration
 *
 * This configures the janitor for the n8n Playwright test suite.
 */
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from '@n8n/playwright-janitor';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	rootDir: __dirname,

	patterns: {
		pages: ['pages/**/*.ts'],
		components: ['pages/components/**/*.ts'],
		flows: ['composables/**/*.ts'],
		tests: ['tests/**/*.spec.ts'],
		services: ['services/**/*.ts'],
		fixtures: ['fixtures/**/*.ts'],
		helpers: [
			'helpers/**/*.ts',
			'utils/**/*.ts',
			'config/**/*.ts', // TODO: Move TestRequirements to helpers/
			'tests/**/fixtures.ts', // TODO: Consolidate colocated fixtures
		],
		factories: ['test-data/**/*.ts', 'factories/**/*.ts'],
		testData: ['workflows/**/*'],
	},

	excludeFromPages: [
		'n8nPage.ts', // Facade
		'BasePage.ts', // Base class
		'BaseModal.ts',
		'BaseComponent.ts',
	],

	facade: {
		file: 'pages/n8nPage.ts',
		className: 'n8nPage',
		excludeTypes: ['Page', 'ApiHelpers'],
	},

	fixtureObjectName: 'n8n',

	apiFixtureName: 'api',

	rawApiPatterns: [
		/\brequest\.(get|post|put|patch|delete|head)\s*\(/i,
		/\bfetch\s*\(/,
		/\.request\(\s*['"`]/,
	],

	flowLayerName: 'Composable',

	architectureLayers: ['Tests', 'Composables', 'Pages', 'BasePage'],

	rules: {
		'boundary-protection': { enabled: true, severity: 'error' },
		'scope-lockdown': { enabled: true, severity: 'error' },
		'selector-purity': { enabled: true, severity: 'error' },
		deduplication: { enabled: true, severity: 'warning' },
		'dead-code': { enabled: true, severity: 'warning' },
		'no-page-in-flow': {
			enabled: true,
			severity: 'warning',
			allowPatterns: [
				/\.page\.keyboard/,
				/\.page\.evaluate/,
				/\.page\.waitForLoadState/,
				/\.page\.waitForURL/,
				/\.page\.reload/,
			],
		},
		'api-purity': { enabled: true, severity: 'warning' },
		// Enforce facade pattern - access pages through n8n.* instead of new *Page()
		'no-direct-page-instantiation': { enabled: true, severity: 'error' },
	},

	tcr: {
		testCommand: 'pnpm test:local',
		workerCount: 1,
		allowedTestCommands: [
			'pnpm test:local',
			'pnpm test:container:sqlite',
		],
	},
});
