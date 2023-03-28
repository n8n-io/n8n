import type { IWebhookFunctions } from 'n8n-core';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

export class FormTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Form Trigger',
		name: 'formTrigger',
		icon: 'file:form.svg',
		group: ['trigger'],
		version: 1,
		description: 'Tiggers workflow when form is submitted.',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'On form submission',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Form',
				name: 'formId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				placeholder: 'Select a form...',
				modes: [
					{
						displayName: 'Form',
						name: 'form',
						type: 'list',
						placeholder: 'Select a form...',
						typeOptions: {
							resource: 'form',
							searchable: true,
						},
					},
				],
				required: true,
				description: 'The form to listen to',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'hidden',
				noDataExpression: true,
				options: [
					{
						name: 'On Form Submission',
						value: 'form_submission',
						description: 'When form is submitted',
						action: 'When form is submitted',
					},
				],
				default: 'form_submission',
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				isFullPath: true,
				path: 'form/1',
				responseCode: '200',
				responseMode: 'onReceived',
				responseData: 'ok',
				responseBinaryPropertyName: '={{$parameter["responseBinaryPropertyName"]}}',
				responseContentType: '={{$parameter["options"]["responseContentType"]}}',
				responsePropertyName: '={{$parameter["options"]["responsePropertyName"]}}',
				responseHeaders: '={{$parameter["options"]["responseHeaders"]}}',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const response: INodeExecutionData = {
			json: {
				...this.getBodyData(),
			},
		};

		return {
			workflowData: [[response]],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return this.prepareOutputData(items);
	}
}
