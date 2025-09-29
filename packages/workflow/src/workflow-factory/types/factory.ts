/**
 * Supported node types in the workflow factory
 */
export type SupportedNodeTypes =
	| 'n8n-nodes-base.webhook'
	| 'n8n-nodes-base.set'
	| 'n8n-nodes-base.respondToWebhook'
	| 'n8n-nodes-base.code'
	| 'n8n-nodes-base.manualTrigger';

import type {
	WebhookNodeParameters,
	SetNodeParameters,
	RespondToWebhookNodeParameters,
	CodeNodeParameters,
	ManualTriggerNodeParameters,
} from '../nodes';

/**
 * Type mapping for node-specific parameters
 */
export type NodeParametersFor<T extends SupportedNodeTypes> = T extends 'n8n-nodes-base.webhook'
	? WebhookNodeParameters
	: T extends 'n8n-nodes-base.set'
		? SetNodeParameters
		: T extends 'n8n-nodes-base.respondToWebhook'
			? RespondToWebhookNodeParameters
			: T extends 'n8n-nodes-base.code'
				? CodeNodeParameters
				: T extends 'n8n-nodes-base.manualTrigger'
					? ManualTriggerNodeParameters
					: never;
