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
		helpers: ['helpers/**/*.ts', 'utils/**/*.ts', 'config/**/*.ts', 'tests/**/fixtures.ts'],
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
		'scope-lockdown': {
			enabled: true,
			severity: 'error',
			allowPatterns: [
				// These entry buttons render in the workflow overlay and canvas controls.
				/^pages\/AIAssistantPage\.ts:AIAssistantPage: this\.page\.getByTestId\('ask-assistant-floating-button'\)$/,
				/^pages\/AIAssistantPage\.ts:AIAssistantPage: this\.page\.getByTestId\('ask-assistant-canvas-action-button'\)$/,
				// Error help starts in the node error view, outside the assistant sidebar.
				/^pages\/AIAssistantPage\.ts:AIAssistantPage: this\.page\.getByTestId\('node-error-view-ask-assistant-button'\)\.locator\('button'\)\.first\(\)$/,
				// The new-session modal appends to the body.
				/^pages\/AIAssistantPage\.ts:AIAssistantPage: this\.page\.getByTestId\('new-assistant-session-modal'\)$/,
				// Credential help starts in the credential editor, outside the assistant sidebar.
				/^pages\/AIAssistantPage\.ts:AIAssistantPage: this\.page\.getByTestId\('credential-edit-ask-assistant-button'\)\.locator\('button'\)$/,
				// Setup and opt-in dialogs render outside the Assistant container.
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\.getByRole\('dialog', \{ name: 'Set up n8n Assistant' \}\)$/,
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\.getByRole\('dialog'\)\.filter\(\{ hasText: 'Try new n8n Assistant' \}\)$/,
				// The Assistant entry button is in the global sidebar, outside the chat.
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\s*\.getByTestId\('project-instance-ai-menu-item'\)\s*\.getByRole\('menuitem', \{ name: 'Assistant', exact: true \}\)$/,
				// Chat history and composer menus render in portals.
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\.getByTestId\('instance-ai-thread-list'\)$/,
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\.getByRole\('menuitem', \{ name: 'Connect services', exact: true \}\)\.click\(\)$/,
				// The Connectors dialog and its credential popover render outside the chat.
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\.getByRole\('dialog', \{ name: 'Connectors', exact: true \}\)$/,
				// Playwright evaluates this `has` locator relative to each visible popover.
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\.getByTestId\('tool-credential-picker-search'\)$/,
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\.getByTestId\('tool-credential-picker-create'\)$/,
				// Mention menus and their submenus use separate portals.
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\.getByTestId\('instance-ai-mention-menu-content'\)$/,
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\.getByRole\('menuitem', \{ name \}\)$/,
				// The preview NDV teleports to #app-modals, outside the chat and canvas.
				/^pages\/InstanceAiPage\.ts:InstanceAiPage: this\.page\.getByRole\('dialog'\)\.getByTestId\('output-panel'\)$/,
				// The fullscreen code editor dialog teleports outside the NDV.
				/^pages\/NodeDetailsViewPage\.ts:NodeDetailsViewPage: this\.page\.getByRole\('dialog'\)\.filter\(\{\s*has: this\.page\.getByTestId\('code-editor-fullscreen'\),\s*\}\)$/,
				// Playwright evaluates this `has` locator relative to each dialog.
				/^pages\/NodeDetailsViewPage\.ts:NodeDetailsViewPage: this\.page\.getByTestId\('code-editor-fullscreen'\)$/,
				// The error-workflow list is teleported outside the settings content.
				/^pages\/WorkflowSettingsModal\.ts:WorkflowSettingsModal: this\.page\.getByRole\('listbox'\)\.filter\(\{ visible: true \}\)$/,
				// The save button is in the footer, outside the settings content slot.
				/^pages\/WorkflowSettingsModal\.ts:WorkflowSettingsModal: this\.page\.getByTestId\('workflow-settings-save-button'\)\.getByRole\('button'\)$/,
				// The sharing select teleports its options to the body.
				/^pages\/WorkflowSharingModal\.ts:WorkflowSharingModal: this\.page\.locator\('\.el-select-dropdown__item'\)\.filter\(\{ hasText: text \}\)$/,
				// Dismiss the navigation menu with a click outside it.
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.locator\('body'\)\.click\(\)$/,
				// This filter intersects with a menu item in the visible portal menu.
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.locator\('\[aria-haspopup="menu"\]'\)$/,
				// Project tabs render in the main content header, outside the sidebar.
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('project-tabs'\)\.getByRole\('tab', \{ name: 'Workflows' \}\)\.click\(\)$/,
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('project-tabs'\)\.getByRole\('tab', \{ name: 'Credentials' \}\)\.click\(\)$/,
				// The account menu and its help submenu render in portals.
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('main-sidebar-account-menu'\)$/,
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('main-sidebar-log-out'\)$/,
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('main-sidebar-account-help'\)$/,
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('main-sidebar-account-whats-new'\)$/,
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('main-sidebar-help-about'\)\.click\(\)$/,
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('main-sidebar-account-cloud-console'\)$/,
				// Global modals and banners render outside the sidebar.
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('about-modal'\)$/,
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('banners-TRIAL'\)$/,
				/^pages\/SidebarPage\.ts:SidebarPage: this\.page\.getByTestId\('whats-new-modal-next-versions-link'\)$/,
			],
		},
		'selector-purity': { enabled: true, severity: 'error' },
		deduplication: { enabled: true, severity: 'warning' },
		'duplicate-logic': {
			// Benchmark profiles repeat the same steps so their results are comparable.
			excludeTestBodyPaths: [/^tests\/infrastructure\/benchmarks(?:-local)?\//],
		},
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
				// Network mocks, network waits, and popup waits do not touch the DOM.
				// The `$` anchor keeps a locator on the call result reported.
				/\.page\.(route|unroute|waitForRequest|waitForResponse|waitForEvent)$/,
				// A composable can open a tab or get the browser from the context.
				// The rule checks each prefix of a chain, so `context` must also match alone.
				/\.page\.context(\(\)\.(newPage|browser))?$/,
			],
		},
		'api-purity': { enabled: true, severity: 'warning' },
		// Enforce facade pattern - access pages through n8n.* instead of new *Page()
		'no-direct-page-instantiation': { enabled: true, severity: 'error' },
	},

	orchestration: {
		metricsPath: '../../../../.github/test-metrics/playwright.json',
		specFilter: 'tests/e2e/',
	},

	tcr: {
		testCommand: 'pnpm test:local',
		workerCount: 1,
		allowedTestCommands: ['pnpm test:local', 'pnpm test:container:sqlite'],
	},
});
