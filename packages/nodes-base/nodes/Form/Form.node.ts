import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookFunctions,
} from 'n8n-workflow';
import { WAIT_TIME_UNLIMITED } from 'n8n-workflow';

import {
	formDescription,
	formFields,
	respondWithOptions,
	formRespondMode,
	formTitle,
} from '../Form/common.descriptions';
import { formWebhook } from '../Form/utils';

import { Webhook } from '../Webhook/Webhook.node';

export class Form extends Webhook {
	authPropertyName = 'authentication';

	description: INodeTypeDescription = {
		displayName: 'n8n Form Page',
		name: 'form',
		icon: 'file:form.svg',
		group: ['input'],
		version: 1,
		subtitle: '=type: {{ $parameter["operation"] }}',
		description: 'Create a multi-step webform by adding pages to a n8n form',
		defaults: {
			name: 'Form Page',
		},
		inputs: ['main'],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: '',
				restartWebhook: true,
				isFullPath: true,
				isForm: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter["responseMode"]}}',
				responseData: '={{$parameter["responseMode"] === "lastNode" ? "noData" : undefined}}',
				path: '',
				restartWebhook: true,
				isFullPath: true,
				isForm: true,
			},
		],
		properties: [
			formTitle,
			formDescription,
			formFields,
			formRespondMode,
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						...respondWithOptions,
						displayOptions: {
							hide: {
								'/responseMode': ['responseNode'],
							},
						},
					},
					{
						displayName: 'Webhook Suffix',
						name: 'webhookSuffix',
						type: 'string',
						default: '',
						placeholder: 'webhook',
						noDataExpression: true,
						description:
							'This suffix path will be appended to the restart URL. Helpful when using multiple wait nodes.',
					},
				],
			},
		],
	};

	async webhook(context: IWebhookFunctions) {
		return await formWebhook(context, this.authPropertyName);
	}

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.configureAndPutToWait(context);
	}

	private async configureAndPutToWait(context: IExecuteFunctions) {
		const waitTill = new Date(WAIT_TIME_UNLIMITED);
		return await this.putToWait(context, waitTill);
	}

	private async putToWait(context: IExecuteFunctions, waitTill: Date) {
		await context.putExecutionToWait(waitTill);
		return [context.getInputData()];
	}
}
