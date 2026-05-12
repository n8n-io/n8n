import { trigger } from '@n8n/workflow-sdk';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import type { PayloadSize, NodeOutputSize } from './types';
import { PAYLOAD_PROFILES, generatePayload } from './types';
import { buildChainedWorkflow } from './workflow-builder';

type WebhookResponseMode = 'onReceived' | 'lastNode';

export interface WebhookSetupContext {
	scenario: {
		nodeCount: number;
		payloadSize: PayloadSize;
		nodeOutputSize?: NodeOutputSize;
		responseMode?: WebhookResponseMode;
	};
}

export interface WebhookHandle {
	workflow: Partial<IWorkflowBase>;
	payload: object;
}

/**
 * Sets up a webhook-triggered benchmark workflow.
 * Returns a handle with the workflow definition and payload to send.
 */
export function setupWebhook(ctx: WebhookSetupContext): WebhookHandle {
	const path = `bench-${nanoid()}`;
	const {
		nodeCount,
		payloadSize,
		nodeOutputSize = 'noop',
		responseMode = 'onReceived',
	} = ctx.scenario;

	const webhookTrigger = trigger({
		type: 'n8n-nodes-base.webhook',
		version: 2,
		config: {
			name: 'Webhook',
			parameters: {
				httpMethod: 'POST',
				path,
				responseMode,
				options: {},
			},
		},
	});

	const label = nodeOutputSize === 'noop' ? 'noop' : `${nodeOutputSize}/node`;
	const workflow = buildChainedWorkflow(
		`Webhook Bench (${nodeCount} nodes, ${label}, ${responseMode})`,
		webhookTrigger,
		nodeCount,
		nodeOutputSize,
	);

	const payload = generatePayload(PAYLOAD_PROFILES[payloadSize]);

	return {
		workflow,
		payload,
	};
}
