import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	MultiPartFormData,
} from 'n8n-workflow';
import { NodeConnectionTypes, jsonParse } from 'n8n-workflow';

import { jotformApiRequest } from './GenericFunctions';

interface IQuestionData {
	name: string;
	text: string;
}

export class JotFormTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'JotForm Trigger',
		name: 'jotFormTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:jotform.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle JotForm events via webhooks',
		defaults: {
			name: 'JotForm Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'jotFormApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Form Name or ID',
				name: 'form',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default does the webhook-data use internal keys instead of the names. If this option gets activated, it will resolve the keys automatically to the actual names.',
			},
			{
				displayName: 'Only Answers',
				name: 'onlyAnswers',
				type: 'boolean',
				default: true,
				description: 'Whether to return only the answers of the form and not any of the other data',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available forms to display them to user so that they can
			// select them easily
			async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {
					limit: 1000,
				};
				const forms = await jotformApiRequest.call(this, 'GET', '/user/forms', {}, qs);

				if (!Array.isArray(forms?.content)) return [];

				for (const form of forms.content) {
					const formName = form.title;
					const formId = form.id;
					returnData.push({
						name: formName,
						value: formId,
					});
				}
				return returnData;
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const formId = this.getNodeParameter('form') as string;
				const endpoint = `/form/${formId}/webhooks`;

				try {
					const responseData = await jotformApiRequest.call(this, 'GET', endpoint);

					const webhookUrls = Object.values(responseData.content as IDataObject);
					const webhookUrl = this.getNodeWebhookUrl('default');
					if (!webhookUrls.includes(webhookUrl)) {
						return false;
					}

					const webhookIds = Object.keys(responseData.content as IDataObject);
					webhookData.webhookId = webhookIds[webhookUrls.indexOf(webhookUrl)];
				} catch (error) {
					return false;
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const formId = this.getNodeParameter('form') as string;
				const endpoint = `/form/${formId}/webhooks`;
				const body: IDataObject = {
					webhookURL: webhookUrl,
				};
				const { content } = await jotformApiRequest.call(this, 'POST', endpoint, body);
				webhookData.webhookId = Object.keys(content as IDataObject)[0];
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				let responseData;
				const webhookData = this.getWorkflowStaticData('node');
				const formId = this.getNodeParameter('form') as string;
				const endpoint = `/form/${formId}/webhooks/${webhookData.webhookId}`;
				try {
					responseData = await jotformApiRequest.call(this, 'DELETE', endpoint);
				} catch (error) {
					return false;
				}
				if (responseData.message !== 'success') {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject() as MultiPartFormData.Request;
		const formId = this.getNodeParameter('form') as string;
		const resolveData = this.getNodeParameter('resolveData', false) as boolean;
		const onlyAnswers = this.getNodeParameter('onlyAnswers', false) as boolean;

		const { data } = req.body;

		const rawRequest = jsonParse<any>(data.rawRequest as string);
		data.rawRequest = rawRequest;

		let returnData: IDataObject;
		if (!resolveData) {
			if (onlyAnswers) {
				returnData = data.rawRequest as unknown as IDataObject;
			} else {
				returnData = data;
			}

			return {
				workflowData: [this.helpers.returnJsonArray(returnData)],
			};
		}

		// Resolve the data by requesting the information via API
		const endpoint = `/form/${formId}/questions`;
		const responseData = await jotformApiRequest.call(this, 'GET', endpoint, {});

		// Create a dictionary to resolve the keys
		const questionNames: IDataObject = {};
		for (const question of Object.values<IQuestionData>(responseData.content as IQuestionData[])) {
			questionNames[question.name] = question.text;
		}

		// Resolve the keys
		let questionKey: string;
		const questionsData: IDataObject = {};
		for (const key of Object.keys(rawRequest as IDataObject)) {
			if (!key.includes('_')) {
				continue;
			}

			questionKey = key.split('_').slice(1).join('_');
			if (questionNames[questionKey] === undefined) {
				continue;
			}

			questionsData[questionNames[questionKey] as string] = rawRequest[key];
		}

		if (onlyAnswers) {
			returnData = questionsData as unknown as IDataObject;
		} else {
			// @ts-ignore
			data.rawRequest = questionsData;
			returnData = data;
		}

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
