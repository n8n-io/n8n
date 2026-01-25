/**
 * Janitor Configuration
 *
 * This file defines the patterns and conventions for your Playwright test architecture.
 * Customize these values to match your project's structure and naming conventions.
 */

export interface JanitorConfig {
	/**
	 * Directory patterns for different artifact types
	 * Use glob patterns relative to the playwright root
	 */
	patterns: {
		pages: string[];
		components: string[];
		flows: string[]; // composables/actions/flows - whatever you call them
		tests: string[];
		services: string[];
		fixtures: string[];
		helpers: string[];
		factories: string[];
		testData: string[]; // Static test data files (JSON, etc.)
	};

	/**
	 * Files to exclude from page analysis (facades, base classes)
	 */
	excludeFromPages: string[];

	/**
	 * Facade files - aggregators that import many things but don't represent real usage
	 * Impact analysis will switch to property-access tracing when hitting these
	 */
	facades: string[];

	/**
	 * The fixture object name used in tests (e.g., 'n8n', 'app', 'po')
	 * This is the object that provides page objects: this.{fixture}.canvas, etc.
	 */
	fixtureObjectName: string;

	/**
	 * Pattern to detect direct page access that should be flagged
	 * e.g., this.n8n.page.getByTestId() or this.app.page.locator()
	 */
	directPageAccessPattern: RegExp;

	/**
	 * Pattern to detect page object usage (for tracking which pages a flow uses)
	 */
	pageObjectUsagePattern: RegExp;

	/**
	 * The API fixture/helper object name (e.g., 'api', 'apiHelpers')
	 * This is the object that provides API services: this.{api}.workflows, etc.
	 */
	apiFixtureName: string;

	/**
	 * Patterns that indicate raw API calls that should go through services
	 * e.g., request.get(), request.post(), fetch()
	 */
	rawApiPatterns: RegExp[];

	/**
	 * What you call the middle layer (composables, actions, flows, scenarios)
	 */
	flowLayerName: string;

	/**
	 * Architecture layers for documentation (top to bottom)
	 */
	architectureLayers: string[];

	/**
	 * Rule-specific configuration
	 * Override severity, disable rules, or add allow patterns
	 */
	rules: {
		[ruleId: string]: {
			/** Set to false to disable the rule entirely */
			enabled?: boolean;
			/** Override the default severity */
			severity?: 'error' | 'warning' | 'off';
			/** Patterns to allow (won't be flagged) */
			allowPatterns?: RegExp[];
		};
	};
}

/**
 * Default configuration for n8n Playwright tests
 * Fork this and customize for your project
 */
export const defaultConfig: JanitorConfig = {
	patterns: {
		pages: ['pages/**/*.ts'],
		components: ['pages/components/**/*.ts'],
		flows: ['composables/**/*.ts'], // Change to 'actions/**/*.ts' or 'flows/**/*.ts'
		tests: ['tests/**/*.spec.ts'],
		services: ['services/**/*.ts'],
		fixtures: ['fixtures/**/*.ts'],
		helpers: ['helpers/**/*.ts', 'utils/**/*.ts'],
		factories: ['test-data/**/*.ts', 'factories/**/*.ts'],
		testData: ['workflows/**/*', 'expectations/**/*'], // Static test data files (any format)
	},

	excludeFromPages: [
		'n8nPage.ts', // Facade
		'BasePage.ts', // Base class
		'BaseModal.ts',
		'BaseComponent.ts',
	],

	facades: ['pages/n8nPage.ts', 'fixtures/base.ts'],

	fixtureObjectName: 'n8n', // Change to 'app', 'po', etc.

	// Matches: this.n8n.page.something or n8n.page.something
	directPageAccessPattern: /(?:this\.)?n8n\.page\.\w+/,

	// Matches: this.n8n.canvas, this.n8n.ndv (extracts 'canvas', 'ndv')
	pageObjectUsagePattern: /this\.n8n\.(\w+)/g,

	apiFixtureName: 'api', // The API services fixture name

	// Patterns that indicate raw API calls (should use services instead)
	rawApiPatterns: [
		/\brequest\.(get|post|put|patch|delete|head)\s*\(/i,
		/\bfetch\s*\(/,
		/\.request\(\s*['"`]/,
	],

	flowLayerName: 'Composable', // Change to 'Action', 'Flow', 'Scenario'

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
			// Allow legitimate page-level operations in composables
			allowPatterns: [
				/\.page\.keyboard/, // Keyboard shortcuts
				/\.page\.evaluate/, // JS evaluation
				/\.page\.waitForLoadState/, // Page load waiting
				/\.page\.waitForURL/, // URL navigation waiting
				/\.page\.reload/, // Page refresh
			],
		},
		'api-purity': {
			enabled: true,
			severity: 'warning', // Warning not error - services are encouraged, not required
			allowPatterns: [
				// Add patterns here for legitimate raw API use cases
				// e.g., /webhook/, /external-api/
			],
		},
	},
};

/**
 * Example: Generic configuration for a different project
 */
export const exampleGenericConfig: JanitorConfig = {
	patterns: {
		pages: ['src/pages/**/*.ts'],
		components: ['src/components/**/*.ts'],
		flows: ['src/actions/**/*.ts'],
		tests: ['tests/**/*.spec.ts'],
		services: ['src/api/**/*.ts'],
		fixtures: ['src/fixtures/**/*.ts'],
		helpers: ['src/helpers/**/*.ts'],
		factories: ['src/factories/**/*.ts'],
		testData: ['test-data/**/*', 'fixtures/data/**/*'], // Any file format
	},

	excludeFromPages: ['AppPage.ts', 'BasePage.ts'],

	facades: ['src/pages/AppPage.ts', 'src/fixtures/test.ts'],

	fixtureObjectName: 'app',

	directPageAccessPattern: /(?:this\.)?app\.page\.\w+/,

	pageObjectUsagePattern: /this\.app\.(\w+)/g,

	apiFixtureName: 'api',

	rawApiPatterns: [/\brequest\.(get|post|put|patch|delete|head)\s*\(/i, /\bfetch\s*\(/],

	flowLayerName: 'Action',

	architectureLayers: ['Tests', 'Actions', 'Pages', 'BasePage'],

	rules: {
		// Inherit defaults, override as needed
		'no-page-in-flow': { severity: 'off' }, // Example: disable for this project
	},
};

// Load config - for now just use default, later could load from file
let currentConfig: JanitorConfig = defaultConfig;

export function getConfig(): JanitorConfig {
	return currentConfig;
}

export function setConfig(config: Partial<JanitorConfig>): void {
	currentConfig = { ...currentConfig, ...config };
}
