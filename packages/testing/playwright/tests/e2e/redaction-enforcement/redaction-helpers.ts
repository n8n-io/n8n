import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

export const REDACT_OPTION = {
	redact: 'Redact',
	default: 'Default - Do not redact',
} as const;

const SAVE_ALL_SETTINGS = {
	saveManualExecutions: true,
	saveDataSuccessExecution: 'all',
	saveDataErrorExecution: 'all',
} as const;

export function webhookWorkflow(
	settings: Partial<IWorkflowBase['settings']> = {},
): Partial<IWorkflowBase> {
	const webhookId = nanoid();

	return {
		name: `Redaction ${nanoid(8)}`,
		nodes: [
			{
				id: nanoid(),
				name: 'Webhook',
				webhookId,
				parameters: {
					path: webhookId,
					options: {},
				},
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0] as [number, number],
			},
		],
		connections: {},
		settings: { ...SAVE_ALL_SETTINGS, ...settings },
	};
}

export function manualWorkflow(
	settings: Partial<IWorkflowBase['settings']> = {},
): Partial<IWorkflowBase> {
	return {
		name: `Manual ${nanoid(8)}`,
		nodes: [
			{
				id: nanoid(),
				name: 'Manual',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			},
		],
		connections: {},
		settings: { ...SAVE_ALL_SETTINGS, ...settings },
	};
}
