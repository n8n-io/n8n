import type { TestRequirements } from '../Types';

// #region Mock Builder Responses

const STREAM_SEPARATOR = '⧉⇋⇋➽⌑⧉§§\n';

/**
 * Workflow with a Schedule Trigger (no credentials) and a Slack node (requires slackApi credential).
 * The Slack node uses concrete parameter values so that selecting a credential alone completes the card.
 */
const wizardWorkflowNodes = {
	nodes: [
		{
			id: 'schedule-trigger-1',
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1.2,
			position: [0, 0],
			parameters: {
				rule: { interval: [{ field: 'hours', hoursInterval: 1 }] },
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
				channelId: {
					__rl: true,
					mode: 'id',
					value: 'C01234567',
				},
				messageType: 'text',
				text: 'Hello from n8n!',
			},
			credentials: {
				slackApi: { id: '', name: '' },
			},
		},
	],
	connections: {
		'Schedule Trigger': {
			main: [[{ node: 'Slack', type: 'main', index: 0 }]],
		},
	},
	pinData: {
		'Schedule Trigger': [{ json: { timestamp: '2024-01-01T00:00:00Z' } }],
		Slack: [{ json: { ok: true, ts: '1234567890.123456' } }],
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
 * Builder response that creates the workflow WITHOUT pinned data on the trigger.
 * Used for tests that need to execute the trigger step (pinned data triggers a confirmation dialog).
 */
export function createBuilderResponseWithoutTriggerPinData(): string {
	const workflow = {
		...wizardWorkflowNodes,
		pinData: {
			Slack: wizardWorkflowNodes.pinData.Slack,
		},
	};
	return createBuilderStreamingResponse(workflow);
}

/**
 * Second builder response — modifies a parameter on Slack node.
 * Used to test wizard remount and skip-to-first-incomplete behavior.
 */
export function createBuilderFollowUpResponse(): string {
	const updatedWorkflow = {
		...wizardWorkflowNodes,
		nodes: wizardWorkflowNodes.nodes.map((node) =>
			node.id === 'slack-1'
				? {
						...node,
						parameters: {
							...node.parameters,
							text: 'Updated message from n8n!',
						},
					}
				: node,
		),
	};

	const chunk = {
		sessionId: 'test-wizard-session',
		messages: [
			{
				type: 'message',
				role: 'assistant',
				text: "I've updated the Slack message text.",
			},
			{
				type: 'workflow-updated',
				role: 'assistant',
				codeSnippet: JSON.stringify(updatedWorkflow),
			},
		],
	};
	return JSON.stringify(chunk) + STREAM_SEPARATOR;
}

/**
 * Builder response with a placeholder value in the Slack node's text parameter.
 * The placeholder format (<__PLACEHOLDER_VALUE__...>) is detected by the wizard
 * and creates a credential+parameter card (requires BOTH credential and text to be filled).
 * No Slack pinned data so that placeholder detection works correctly.
 */
export function createBuilderResponseWithPlaceholder(): string {
	const workflow = {
		...wizardWorkflowNodes,
		nodes: wizardWorkflowNodes.nodes.map((node) =>
			node.id === 'slack-1'
				? {
						...node,
						parameters: {
							resource: 'message',
							operation: 'post',
							select: 'channel',
							channelId: {
								__rl: true,
								mode: 'id',
								value: 'C01234567',
							},
							messageType: 'text',
							text: '<__PLACEHOLDER_VALUE__notification message__>',
						},
					}
				: node,
		),
		pinData: {
			'Schedule Trigger': wizardWorkflowNodes.pinData['Schedule Trigger'],
		},
	};
	return createBuilderStreamingResponse(workflow);
}

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
	credentials: {
		telegramApi: { id: '', name: '' },
	},
};

/**
 * 3-node workflow: Schedule Trigger → Slack → Telegram.
 * Creates 3 cards: trigger-only, credential (slackApi), credential (telegramApi).
 * Used for testing auto-advance when a middle card completes.
 */
export function createBuilderResponseThreeCards(): string {
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
		pinData: {
			...wizardWorkflowNodes.pinData,
			Telegram: [{ json: { ok: true, result: { message_id: 123 } } }],
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
		pinData: {
			...wizardWorkflowNodes.pinData,
			Telegram: [{ json: { ok: true, result: { message_id: 123 } } }],
		},
	};

	const chunk = {
		sessionId: 'test-wizard-session',
		messages: [
			{
				type: 'message',
				role: 'assistant',
				text: "I've added a Telegram notification before the Slack message.",
			},
			{
				type: 'workflow-updated',
				role: 'assistant',
				codeSnippet: JSON.stringify(workflow),
			},
		],
	};
	return JSON.stringify(chunk) + STREAM_SEPARATOR;
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
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '077_ai_builder_setup_wizard': 'variant' }),
	},
};

// #endregion
