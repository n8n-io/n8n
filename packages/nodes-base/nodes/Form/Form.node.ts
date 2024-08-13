import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookFunctions,
} from 'n8n-workflow';
import { WAIT_TIME_UNLIMITED, Node } from 'n8n-workflow';

import { formDescription, formFields, formTitle } from '../Form/common.descriptions';
import { prepareFormReturnItem, renderForm } from '../Form/utils';

import type { FormField } from './interfaces';

export class Form extends Node {
	description: INodeTypeDescription = {
		displayName: 'n8n Form Page',
		name: 'form',
		icon: 'file:form.svg',
		group: ['input'],
		version: 1,
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
				responseMode: 'onReceived',
				path: '',
				restartWebhook: true,
				isFullPath: true,
				isForm: true,
			},
		],
		properties: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'n8n Form Trigger node must be set before this node',
				name: 'triggerNotice',
				type: 'notice',
				default: '',
			},
			formTitle,
			formDescription,
			formFields,
			{
				displayName: 'Resume Form Url',
				name: 'resumeFormUrl',
				type: 'hidden',
				default: '={{ $execution.resumeFormUrl }}',
			},
		],
	};

	async webhook(context: IWebhookFunctions) {
		const res = context.getResponseObject();

		const mode = context.getMode() === 'manual' ? 'test' : 'production';
		const fields = context.getNodeParameter('formFields.values', []) as FormField[];
		const method = context.getRequestObject().method;

		if (method === 'GET') {
			const title = context.getNodeParameter('formTitle', '') as string;
			const description = context.getNodeParameter('formDescription', '') as string;
			const responseMode = 'onReceived';

			let redirectUrl;

			const connectedNodes = context.getChildNodes(context.getNode().name);

			const hasNextPage = connectedNodes.some((node) => node.type === 'n8n-nodes-base.form');

			if (hasNextPage) {
				redirectUrl = context.getNodeParameter('resumeFormUrl', '') as string;
			}

			renderForm({
				context,
				res,
				formTitle: title,
				formDescription: description,
				formFields: fields,
				responseMode,
				mode,
				redirectUrl,
				appendAttribution: true,
			});

			return {
				noWebhookResponse: true,
			};
		}

		const returnItem = await prepareFormReturnItem(context, fields, mode, true);

		return {
			webhookResponse: { status: 200 },
			workflowData: [[returnItem]],
		};
	}

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const waitTill = new Date(WAIT_TIME_UNLIMITED);
		await context.putExecutionToWait(waitTill);
		return [context.getInputData()];
	}
}
