import type { TestRequirements } from '../Types';

// #region Mock Builder Responses

const STREAM_SEPARATOR = '⧉⇋⇋➽⌑⧉§§\n';

/**
 * Telegram node definition reused across multi-node fixtures.
 */
const telegramNode = {
	id: 'telegram-1',
	name: 'Telegram',
	type: 'n8n-nodes-base.telegram',
	typeVersion: 1.2,
	position: [440, 0],
	parameters: {
		resource: 'message',
		operation: 'sendMessage',
		chatId: '123456789',
		text: 'Hello from n8n!',
	},
};

/**
 * Schedule Trigger node definition reused across multi-node fixtures.
 */
const scheduleTriggerNode = {
	id: 'schedule-trigger-1',
	name: 'Schedule Trigger',
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1.2,
	position: [0, 0],
	parameters: {
		rule: { interval: [{ field: 'hours', hoursInterval: 1 }] },
	},
};

/**
 * Workflow with a Schedule Trigger (no credentials) and a Slack node (requires slackApi credential).
 * The Slack node uses concrete parameter values so that selecting a credential alone completes the card.
 */
const wizardWorkflowNodes = {
	nodes: [
		scheduleTriggerNode,
		{
			id: 'slack-1',
			name: 'Slack',
			type: 'n8n-nodes-base.slack',
			typeVersion: 2.2,
			position: [220, 0],
			parameters: {
				resource: 'message',
				operation: 'send',
				channelId: {
					__rl: true,
					mode: 'id',
					value: 'C01234567',
				},
				messageType: 'text',
				text: 'Hello from n8n!',
			},
		},
	],
	connections: {
		'Schedule Trigger': {
			main: [[{ node: 'Slack', type: 'main', index: 0 }]],
		},
	},
};

/**
 * Builder streaming response that creates the wizard workflow.
 * Uses the json-lines format with STREAM_SEPARATOR.
 */
export function createBuilderStreamingResponse(
	workflowData: Record<string, unknown> = wizardWorkflowNodes,
): string {
	const chunk = {
		sessionId: 'test-wizard-session',
		messages: [
			{
				type: 'message',
				role: 'assistant',
				text: "I've created your workflow with a Schedule Trigger and Slack integration.",
			},
			{
				type: 'workflow-updated',
				role: 'assistant',
				codeSnippet: JSON.stringify(workflowData),
			},
		],
	};
	return JSON.stringify(chunk) + STREAM_SEPARATOR;
}

/**
 * Builder response with a placeholder value in the Slack node + a Telegram node.
 * Produces 2 visible cards after trigger-only filter: Slack (with placeholder) + Telegram.
 * Navigating to the Slack card triggers lazy placeholder clearing.
 *
 * Uses operation: 'post' (the real Slack V2 operation for sending messages) so that the
 * `text` parameter's displayOptions match and the parameter input is rendered in the card.
 */
export function createBuilderResponseWithPlaceholderAndTelegram(): string {
	const workflow = {
		nodes: [
			wizardWorkflowNodes.nodes[0], // Schedule Trigger
			{ ...telegramNode, position: [220, 0] as [number, number] },
			{
				...wizardWorkflowNodes.nodes[1], // Slack (after Telegram in execution order)
				position: [440, 0] as [number, number],
				parameters: {
					resource: 'message',
					operation: 'post',
					channelId: { __rl: true, mode: 'id', value: 'C01234567' },
					messageType: 'text',
					text: '<__PLACEHOLDER_VALUE__notification message__>',
				},
			},
		],
		connections: {
			'Schedule Trigger': {
				main: [[{ node: 'Telegram', type: 'main', index: 0 }]],
			},
			Telegram: {
				main: [[{ node: 'Slack', type: 'main', index: 0 }]],
			},
		},
	};
	return createBuilderStreamingResponse(workflow);
}

/**
 * 3-node workflow: Schedule Trigger → Slack → Telegram.
 * After trigger filter: 2 visible cards (Slack + Telegram).
 */
export function createBuilderResponseTwoCards(): string {
	const workflow = {
		nodes: [...wizardWorkflowNodes.nodes, telegramNode],
		connections: {
			'Schedule Trigger': {
				main: [[{ node: 'Slack', type: 'main', index: 0 }]],
			},
			Slack: {
				main: [[{ node: 'Telegram', type: 'main', index: 0 }]],
			},
		},
	};
	return createBuilderStreamingResponse(workflow);
}

/**
 * Follow-up response that INSERTS a Telegram node between the trigger and Slack.
 * Execution order becomes: Schedule Trigger → Telegram → Slack.
 * Used to test that the wizard starts from the new (incomplete) node rather than
 * skipping past it to after the last completed node.
 */
export function createBuilderFollowUpWithInsertedNode(): string {
	const workflow = {
		nodes: [
			wizardWorkflowNodes.nodes[0], // Schedule Trigger
			{ ...telegramNode, position: [220, 0] as [number, number] }, // Telegram (inserted)
			{ ...wizardWorkflowNodes.nodes[1], position: [440, 0] as [number, number] }, // Slack (shifted)
		],
		connections: {
			'Schedule Trigger': {
				main: [[{ node: 'Telegram', type: 'main', index: 0 }]],
			},
			Telegram: {
				main: [[{ node: 'Slack', type: 'main', index: 0 }]],
			},
		},
	};
	return createBuilderStreamingResponse(workflow);
}

/**
 * Multi-trigger workflow: Morning Schedule → Slack, plus a standalone Telegram Trigger.
 * After trigger filter: 2 visible cards (Slack + Telegram Listener).
 * The Morning Schedule trigger card is filtered out as trigger-only.
 * Only non-trigger nodes get an execute button; Telegram Listener (a trigger) does not.
 */
export function createBuilderResponseMultipleTriggers(): string {
	const workflow = {
		nodes: [
			{
				...scheduleTriggerNode,
				name: 'Morning Schedule',
				parameters: {
					rule: { interval: [{ field: 'hours', hoursInterval: 8 }] },
				},
			},
			{
				id: 'slack-1',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.2,
				position: [220, 0],
				parameters: {
					resource: 'message',
					operation: 'send',
					channelId: { __rl: true, mode: 'id', value: 'C01234567' },
					messageType: 'text',
					text: 'Good morning!',
				},
			},
			{
				id: 'telegram-trigger-1',
				name: 'Telegram Listener',
				type: 'n8n-nodes-base.telegramTrigger',
				typeVersion: 1.2,
				position: [0, 300],
				parameters: {
					updates: ['message'],
				},
			},
		],
		connections: {
			'Morning Schedule': {
				main: [[{ node: 'Slack', type: 'main', index: 0 }]],
			},
		},
	};
	return createBuilderStreamingResponse(workflow);
}

/**
 * Workflow with two Slack nodes sharing the same credential type (slackApi).
 * Execution order: Schedule Trigger → Slack Alerts → Slack Reports.
 * After trigger filter: 1 card (slackApi credential, grouping both nodes).
 * The card should show "Used in 2 nodes" hint.
 */
export function createBuilderResponseSharedCredential(): string {
	const workflow = {
		nodes: [
			scheduleTriggerNode,
			{
				id: 'slack-alerts',
				name: 'Slack Alerts',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.2,
				position: [220, 0],
				parameters: {
					resource: 'message',
					operation: 'send',
					channelId: { __rl: true, mode: 'id', value: 'C-ALERTS' },
					messageType: 'text',
					text: 'Alert!',
				},
			},
			{
				id: 'slack-reports',
				name: 'Slack Reports',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.2,
				position: [440, 0],
				parameters: {
					resource: 'message',
					operation: 'send',
					channelId: { __rl: true, mode: 'id', value: 'C-REPORTS' },
					messageType: 'text',
					text: 'Daily report',
				},
			},
		],
		connections: {
			'Schedule Trigger': {
				main: [[{ node: 'Slack Alerts', type: 'main', index: 0 }]],
			},
			'Slack Alerts': {
				main: [[{ node: 'Slack Reports', type: 'main', index: 0 }]],
			},
		},
	};
	return createBuilderStreamingResponse(workflow);
}

/**
 * Branching workflow: Schedule Trigger → If → Slack (true) / Telegram (false).
 * After trigger filter: 2 cards (Slack credential + Telegram credential).
 * Tests that cards appear for nodes across different conditional branches.
 */
export function createBuilderResponseBranchingWorkflow(): string {
	const workflow = {
		nodes: [
			scheduleTriggerNode,
			{
				id: 'if-1',
				name: 'Check Condition',
				type: 'n8n-nodes-base.if',
				typeVersion: 2,
				position: [220, 0],
				parameters: {
					conditions: {
						options: { caseSensitive: true, leftValue: '' },
						conditions: [
							{
								leftValue: '={{ $json.value }}',
								rightValue: 'yes',
								operator: { type: 'string', operation: 'equals' },
							},
						],
						combinator: 'and',
					},
				},
			},
			{
				id: 'slack-1',
				name: 'Slack Notification',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.2,
				position: [440, -100],
				parameters: {
					resource: 'message',
					operation: 'send',
					channelId: { __rl: true, mode: 'id', value: 'C01234567' },
					messageType: 'text',
					text: 'Condition met!',
				},
			},
			{
				id: 'telegram-1',
				name: 'Telegram Fallback',
				type: 'n8n-nodes-base.telegram',
				typeVersion: 1.2,
				position: [440, 100],
				parameters: {
					resource: 'message',
					operation: 'sendMessage',
					chatId: '123456789',
					text: 'Condition not met',
				},
			},
		],
		connections: {
			'Schedule Trigger': {
				main: [[{ node: 'Check Condition', type: 'main', index: 0 }]],
			},
			'Check Condition': {
				main: [
					[{ node: 'Slack Notification', type: 'main', index: 0 }],
					[{ node: 'Telegram Fallback', type: 'main', index: 0 }],
				],
			},
		},
	};
	return createBuilderStreamingResponse(workflow);
}

// #endregion

// #region Test Requirements

export const builderWizardRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
			aiBuilder: { enabled: true, setup: true },
		},
		features: {
			aiAssistant: true,
			aiBuilder: true,
		},
	},
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '079_ai_builder_setup_wizard': 'variant' }),
	},
};

// #endregion
