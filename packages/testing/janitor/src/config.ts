/**
 * Janitor Configuration
 *
 * This file defines the patterns and conventions for your Playwright test architecture.
 * Customize these values to match your project's structure and naming conventions.
 */

import type { FilePatterns, FacadeConfig, RuleSettings, RuleId } from './types.js';

/**
 * Complete janitor configuration.
 * Use `defineConfig()` to create a config with sensible defaults.
 */
export interface JanitorConfig {
	/**
	 * Root directory for the Playwright test suite (absolute path).
	 * All patterns are resolved relative to this directory.
	 */
	rootDir: string;

	/**
	 * Directory patterns for different artifact types.
	 * Use glob patterns relative to rootDir.
	 */
	patterns: FilePatterns;

	/**
	 * Files to exclude from page analysis (facades, base classes).
	 * @example ['BasePage.ts', 'AppPage.ts']
	 */
	excludeFromPages: string[];

	/**
	 * Facade configuration - the main aggregator that exposes page objects.
	 * The facade is the central page object that tests interact with.
	 */
	facade: FacadeConfig;

	/**
	 * The fixture object name used in tests.
	 * This is the object that provides page objects in test functions.
	 * @example 'app' for `test('...', async ({ app }) => ...)`
	 */
	fixtureObjectName: string;

	/**
	 * The API fixture/helper object name.
	 * This is the object that provides API services.
	 * @example 'api' for `test('...', async ({ api }) => ...)`
	 */
	apiFixtureName: string;

	/**
	 * Patterns that indicate raw API calls that should go through services.
	 * @example [/\brequest\.(get|post)\s*\(/i, /\bfetch\s*\(/]
	 */
	rawApiPatterns: RegExp[];

	/**
	 * What you call the middle layer between tests and pages.
	 * Used in error messages and suggestions.
	 * @example 'Composable', 'Action', 'Flow', 'Scenario'
	 */
	flowLayerName: string;

	/**
	 * Architecture layers for documentation (top to bottom).
	 * @example ['Tests', 'Composables', 'Pages', 'BasePage']
	 */
	architectureLayers: string[];

	/**
	 * Rule-specific configuration.
	 * Override severity, disable rules, or add allow patterns.
	 */
	rules: {
		[K in RuleId]?: RuleSettings;
	};

	/** TCR configuration */
	tcr: {
		/** Test command. File paths will be appended. @default 'npx playwright test' */
		testCommand: string;
		/** Number of Playwright workers. Always appended to test command. @default 1 */
		workerCount?: number;
		/** Allowlist of permitted test commands. When set, --test-command must match. */
		allowedTestCommands?: string[];
	};
}

/**
 * Minimal default configuration.
 * Projects should provide their own config via defineConfig().
 */
export const defaultConfig: Omit<JanitorConfig, 'rootDir'> = {
	patterns: {
		pages: ['pages/**/*.ts'],
		components: ['pages/components/**/*.ts'],
		flows: ['composables/**/*.ts'],
		tests: ['tests/**/*.spec.ts'],
		services: ['services/**/*.ts'],
		fixtures: ['fixtures/**/*.ts'],
		helpers: ['helpers/**/*.ts', 'utils/**/*.ts'],
		factories: ['test-data/**/*.ts', 'factories/**/*.ts'],
		testData: ['workflows/**/*', 'expectations/**/*'],
	},

	excludeFromPages: ['BasePage.ts', 'BaseModal.ts', 'BaseComponent.ts'],

	facade: {
		file: 'pages/AppPage.ts',
		className: 'AppPage',
		excludeTypes: ['Page', 'APIRequestContext'],
	},

	fixtureObjectName: 'app',

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
		'scope-lockdown': {
			enabled: true,
			severity: 'error',
			navigationMethods: ['goto', 'navigate', 'visit', 'open'],
		},
		'selector-purity': { enabled: true, severity: 'error', allowInExpect: true },
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
		'test-data-hygiene': { enabled: true, severity: 'warning' },
		// Opt-in rule: enforces facade pattern for page object access
		// Enable in projects that use a facade pattern (e.g., n8n.canvas instead of new CanvasPage())
		'no-direct-page-instantiation': { enabled: false, severity: 'error' },
	},

	tcr: {
		testCommand: 'npx playwright test',
	},
};

/** Runtime configuration holder */
let currentConfig: JanitorConfig | null = null;

/**
 * Input type for defineConfig - rootDir is required, everything else optional.
 */
export type DefineConfigInput = Partial<JanitorConfig> & { rootDir: string };

/**
 * Define a janitor configuration (for use in janitor.config.ts files).
 * Merges provided config with sensible defaults.
 *
 * @example
 * ```typescript
 * export default defineConfig({
 *   rootDir: __dirname,
 *   fixtureObjectName: 'app',
 *   facade: {
 *     file: 'pages/AppPage.ts',
 *     className: 'AppPage',
 *   },
 * });
 * ```
 */
export function defineConfig(config: DefineConfigInput): JanitorConfig {
	return {
		...defaultConfig,
		...config,
		patterns: { ...defaultConfig.patterns, ...config.patterns },
		facade: { ...defaultConfig.facade, ...config.facade },
		rules: { ...defaultConfig.rules, ...config.rules },
		tcr: { ...defaultConfig.tcr, ...config.tcr },
	};
}

/**
 * Get the current configuration.
 * @throws Error if configuration hasn't been set
 */
export function getConfig(): JanitorConfig {
	if (!currentConfig) {
		throw new Error(
			'Janitor configuration not initialized. Call setConfig() or load a janitor.config.ts file first.',
		);
	}
	return currentConfig;
}

/**
 * Set the runtime configuration.
 */
export function setConfig(config: JanitorConfig): void {
	currentConfig = config;
}

/**
 * Check if configuration has been initialized.
 */
export function hasConfig(): boolean {
	return currentConfig !== null;
}

/**
 * Reset configuration (mainly for testing).
 */
export function resetConfig(): void {
	currentConfig = null;
}
