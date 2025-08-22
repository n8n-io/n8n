import type { FrontendSettings } from '@n8n/api-types';

export class TestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TestError';
	}
}

/**
 * Test requirements for modern Playwright tests using hybrid API+UI approach.
 *
 * This interface allows you to declaratively specify test setup with API-driven data creation
 * and UI-focused entry points, making tests faster, more reliable, and maintainable.
 *
 * @example Basic usage
 * ```typescript
 * const requirements: TestRequirements = {
 *   setup: {
 *     projects: [{ name: 'Test Project', role: 'editor' }],
 *     credentials: [{ name: 'API Key', type: 'httpBasicAuth', data: { user: 'test', password: 'secret' } }]
 *   },
 *   entry: {
 *     type: 'imported-workflow',
 *     workflow: 'ai_assistant_test_workflow.json'
 *   },
 *   config: {
 *     features: { aiAssistant: true, sharing: true },
 *     settings: { telemetry: { enabled: false } }
 *   },
 *   intercepts: {
 *     'ai-chat': {
 *       url: '*\/rest/ai/chat',
 *       response: { sessionId: '1', messages: [] }
 *     }
 *   },
 *   storage: {
 *     'n8n-telemetry': '{"enabled": true}'
 *   }
 * };
 * ```
 *
 * @example Webhook testing with import result
 * ```typescript
 * const result = await setupRequirements({
 *   entry: { type: 'imported-workflow', workflow: 'webhook_test.json' }
 * });
 * // result contains { webhookId, webhookPath, workflowId } for webhook testing
 * const webhookUrl = `/webhook/${result?.webhookPath}`;
 * ```
 */
export interface TestRequirements {
	/**
	 * API-driven setup performed before UI navigation (fast and reliable)
	 */
	setup?: {
		/** Workflows to create via API */
		workflows?: Array<{
			name: string;
			nodes?: unknown[];
			connections?: unknown;
			settings?: unknown;
			tags?: string[];
		}>;

		/** Credentials to create via API */
		credentials?: Array<{
			name: string;
			type: string;
			data: Record<string, unknown>;
		}>;

		/** Projects to create via API */
		projects?: Array<{
			name: string;
			role?: 'admin' | 'editor' | 'viewer';
		}>;
	};

	/**
	 * UI entry point for the test (replaces old workflow import pattern)
	 *
	 * When using 'imported-workflow' type, setupRequirements returns workflow import details
	 * including webhookId, webhookPath, and workflowId for use in webhook testing.
	 */
	entry?: {
		/** Type of entry point */
		type: 'home' | 'blank-canvas' | 'new-project' | 'imported-workflow';
		/** Workflow file to import (required for imported-workflow type) */
		workflow?: string;
		/** Project configuration (for new-project type) */
		projectId?: string;
	};

	/**
	 * Configuration settings for the test environment
	 */
	config?: {
		/** Frontend settings to override (merged with default settings) */
		settings?: Partial<FrontendSettings>;

		/** Feature flags to enable/disable for the test */
		features?: Record<string, boolean>;
	};

	/**
	 * API route intercepts and their mock responses
	 *
	 * @example
	 * ```typescript
	 * intercepts: {
	 *   'ai-chat': {
	 *     url: '*\/rest/ai/chat',
	 *     response: {
	 *       sessionId: '1',
	 *       messages: [{ role: 'assistant', type: 'message', text: 'Hello!' }]
	 *     }
	 *   },
	 *   'become-creator': {
	 *     url: '*\/rest/cta/become-creator',
	 *     response: true
	 *   },
	 *   'credentials-test': {
	 *     url: '*\/rest/credentials/test',
	 *     response: { data: { status: 'success', message: 'Tested successfully' } }
	 *   }
	 * }
	 * ```
	 */
	intercepts?: Record<string, InterceptConfig>;

	/**
	 * Browser storage values to set before the test
	 *
	 * Supports localStorage, sessionStorage, and other browser storage APIs
	 *
	 * @example
	 * ```typescript
	 * storage: {
	 *   'n8n-telemetry': '{"enabled": true}',
	 *   'n8n-instance-id': 'test-instance-id'
	 * }
	 * ```
	 */
	storage?: Record<string, string>;
}

/**
 * Configuration for API route interception in Playwright
 *
 * @example
 * ```typescript
 * {
 *   url: '*\/rest/ai/chat',
 *   response: { sessionId: '1', messages: [] },
 *   status: 200
 * }
 * ```
 *
 * @example Network error simulation
 * ```typescript
 * {
 *   url: '*\/rest/credentials/test',
 *   forceNetworkError: true
 * }
 * ```
 */
export interface InterceptConfig {
	/** URL pattern to intercept (supports wildcards) */
	url: string;

	/** Mock response data */
	response?: unknown;

	/** HTTP status code to return (default: 200) */
	status?: number;

	/** HTTP headers to return */
	headers?: Record<string, string>;

	/** Content type for the response (default: 'application/json') */
	contentType?: string;

	/** Force network error instead of mock response */
	forceNetworkError?: boolean;
}
