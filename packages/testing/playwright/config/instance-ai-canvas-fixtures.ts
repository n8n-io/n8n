import type { TestRequirements } from '../Types';

// #region Mock Responses

const mockThreadResponse = {
	thread: {
		id: 'thread-test-1',
		title: '',
		resourceId: 'user-1',
		workflowId: undefined,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
	created: true,
};

const mockEmptyMessages = {
	threadId: 'thread-test-1',
	messages: [],
	nextEventId: 0,
};

const mockThreadStatus = {
	hasActiveRun: false,
	isSuspended: false,
	backgroundTasks: [],
};

const mockThreadList = {
	threads: [],
	total: 0,
	page: 1,
	hasMore: false,
};

// #endregion

// #region Test Requirements

/**
 * Requirements: Instance AI module enabled on canvas.
 *
 * Activates the `instance-ai` backend module via `activeModules` and
 * intercepts every Instance AI endpoint so the panel can mount without
 * a real backend.
 */
export const instanceAiCanvasEnabledRequirements: TestRequirements = {
	config: {
		settings: {
			activeModules: ['instance-ai'],
		},
	},
	intercepts: {
		instanceAiThreads: {
			url: '**/rest/instance-ai/threads',
			response: mockThreadResponse,
		},
		instanceAiThreadList: {
			url: '**/rest/instance-ai/threads?*',
			response: mockThreadList,
		},
		instanceAiMessages: {
			url: '**/rest/instance-ai/threads/*/messages*',
			response: mockEmptyMessages,
		},
		instanceAiStatus: {
			url: '**/rest/instance-ai/threads/*/status',
			response: mockThreadStatus,
		},
		instanceAiEvents: {
			url: '**/rest/instance-ai/events/*',
			response: '',
			contentType: 'text/event-stream',
		},
		instanceAiModuleSettings: {
			url: '**/rest/module-settings',
			response: {
				'instance-ai': {
					enabled: true,
					localGateway: false,
					gatewayConnected: false,
					gatewayDirectory: null,
					localGatewayDisabled: true,
					localGatewayFallbackDirectory: null,
				},
			},
		},
	},
};

/**
 * Requirements: Instance AI module DISABLED (old builder fallback).
 *
 * Enables only the legacy AI assistant so the old panel renders instead
 * of the Instance AI canvas panel.
 */
export const instanceAiCanvasDisabledRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
		},
		features: {
			aiAssistant: true,
		},
	},
};

// #endregion
