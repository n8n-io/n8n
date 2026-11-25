import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';

/**
 * The additional data that both runners give to nodes. Only the fields that the
 * catalog nodes read are set. It is the same for both engines, so a difference
 * comes from the engine and not from the setup.
 */
export function parityAdditionalData(
	executionId: string,
	extra: Partial<IWorkflowExecuteAdditionalData> = {},
): IWorkflowExecuteAdditionalData {
	const data: Partial<IWorkflowExecuteAdditionalData> = {
		executionId,
		restApiUrl: 'http://localhost:5678/rest',
		instanceBaseUrl: 'http://localhost:5678',
		webhookBaseUrl: 'http://localhost:5678/webhook',
		webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
		webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
		formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
		variables: {},
		currentNodeExecutionIndex: 0,
		// No run data of another execution, as the engine v2 data plane answers.
		getRunExecutionData: async () => await Promise.resolve(undefined),
		...extra,
	};
	// A partial object: the nodes in the catalog read no other field.
	return data as IWorkflowExecuteAdditionalData;
}
