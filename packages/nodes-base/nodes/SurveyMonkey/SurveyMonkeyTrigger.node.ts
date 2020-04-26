import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	idsExist,
	surveyMonkeyApiRequest,
	surveyMonkeyRequestAllItems,
} from './GenericFunctions';

import {
	createHmac,
} from 'crypto';

export class SurveyMonkeyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SurveyMonkey Trigger',
		name: 'surveyMonkeyTrigger',
		icon: 'file:surveyMonkey.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Survey Monkey events occure.',
		defaults: {
			name: 'SurveyMonkey Trigger',
			color: '#53b675',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'surveyMonkeyApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'HEAD',
				responseMode: 'onReceived',
				path: 'webhook',
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Collector Created',
						value: 'collector_created',
						description: 'A collector is created',
					},
					{
						name: 'Collector Updated',
						value: 'collector_updated',
						description: 'A collector is updated',
					},
					{
						name: 'Collector Deleted',
						value: 'collector_deleted',
						description: 'A collector is deleted',
					},
					{
						name: 'Response Completed',
						value: 'response_completed',
						description: 'A survey response is completed',
					},
					{
						name: 'Response Created',
						value: 'response_created',
						description: 'A respondent begins a survey',
					},
					{
						name: 'Response Deleted',
						value: 'response_deleted',
						description: 'A response is deleted',
					},
					{
						name: 'Response Desqualified',
						value: 'response_desqualified',
						description: 'A survey response is disqualified ',
					},
					{
						name: 'Response Overquota',
						value: 'response_overquota',
						description: `A response is over a survey’s quota`,
					},
					{
						name: 'Response Updated',
						value: 'response_updated',
						description: 'A survey response is updated',
					},
					{
						name: 'Survey Created',
						value: 'survey_created',
						description: 'A survey is created',
					},
					{
						name: 'Survey Deleted',
						value: 'survey_deleted',
						description: 'A survey is deleted',
					},
					{
						name: 'Survey Updated',
						value: 'survey_updated',
						description: 'A survey is updated',
					},
				],
				default: '',
				required: true,
			},
			{
				displayName: 'Type',
				name: 'objectType',
				type: 'options',
				options: [
					{
						name: 'Collector',
						value: 'collector',
					},
					{
						name: 'Survey',
						value: 'survey',
					},
				],
				default: '',
				required: true,
			},
			{
				displayName: 'Survey IDs',
				name: 'surveyIds',
				type: 'multiOptions',
				displayOptions: {
					show: {
						objectType: [
							'survey',
						],
					},
					hide: {
						event: [
							'survey_created',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getSurveys',
				},
				options: [],
				default: [],
				required: true,
			},
			{
				displayName: 'Survey ID',
				name: 'surveyId',
				type: 'options',
				displayOptions: {
					show: {
						objectType: [
							'collector',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getSurveys',
				},
				default: [],
				required: true,
			},
			{
				displayName: 'Collector IDs',
				name: 'collectorIds',
				type: 'multiOptions',
				displayOptions: {
					show: {
						objectType: [
							'collector',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getCollectors',
					loadOptionsDependsOn: [
						'surveyId',
					],
				},
				options: [],
				default: [],
				required: true,
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				displayOptions: {
					show: {
						event: [
							'response_completed',
						],
					},
				},
				default: true,
				description: 'By default the webhook-data only contain the IDs. If this option gets activated it<br />will resolve the data automatically.',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the survey's collectors to display them to user so that he can
			// select them easily
			async getCollectors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const surveyId = this.getCurrentNodeParameter('surveyId');
				const returnData: INodePropertyOptions[] = [];
				const collectors = await surveyMonkeyRequestAllItems.call(this, 'data', 'GET', `/surveys/${surveyId}/collectors`);
				for (const collector of collectors) {
					const collectorName = collector.name;
					const collectorId = collector.id;
					returnData.push({
						name: collectorName,
						value: collectorId,
					});
				}
				return returnData;
			},

			// Get all the surveys to display them to user so that he can
			// select them easily
			async getSurveys(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const surveys = await surveyMonkeyRequestAllItems.call(this, 'data', 'GET', '/surveys');
				for (const survey of surveys) {
					const surveyName = survey.title;
					const surveyId = survey.id;
					returnData.push({
						name: surveyName,
						value: surveyId,
					});
				}
				return returnData;
			},
		},
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const objectType = this.getNodeParameter('objectType') as string;
				const event = this.getNodeParameter('event') as string;
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = '/webhooks';

				const responseData = await surveyMonkeyRequestAllItems.call(this, 'data', 'GET', endpoint, {});

				const webhookUrl = this.getNodeWebhookUrl('default');

				const ids: string[] = [];

				if (objectType === 'survey') {
					const surveyIds = this.getNodeParameter('surveyIds') as string[];
					ids.push.apply(ids, surveyIds);
				} else if (objectType === 'collector') {
					const collectorIds = this.getNodeParameter('collectorIds') as string[];
					ids.push.apply(ids, collectorIds);
				}

				for (const webhook of responseData) {
					const webhookDetails = 	await surveyMonkeyApiRequest.call(this, 'GET', `/webhooks/${webhook.id}`);
					if (webhookDetails.subscription_url === webhookUrl
					&& idsExist(webhookDetails.object_ids as string[], ids as string[])
					&& webhookDetails.event_type === event) {
						// Set webhook-id to be sure that it can be deleted
						const webhookData = this.getWorkflowStaticData('node');
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const objectType = this.getNodeParameter('objectType') as string;
				const endpoint = '/webhooks';
				const ids: string[] = [];

				if (objectType === 'survey') {
					const surveyIds = this.getNodeParameter('surveyIds') as string[];
					ids.push.apply(ids, surveyIds);
				} else if (objectType === 'collector') {
					const collectorIds = this.getNodeParameter('collectorIds') as string[];
					ids.push.apply(ids, collectorIds);
				}

				const body: IDataObject = {
					name: `n8n - Webhook [${event}]`,
					object_type: objectType,
					object_ids: ids,
					subscription_url: webhookUrl,
					event_type: event,
				};

				if (objectType === 'collector' && event === 'collector_created') {
					throw new Error('Type collector cannot be used with collector created event');
				}

				if (objectType === 'survey' && event === 'survey_created') {
					delete body.object_type;
				}

				let responseData: IDataObject = {};

				responseData = await surveyMonkeyApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.id as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {

					const endpoint = `/webhooks/${webhookData.webhookId}`;

					try {
						await surveyMonkeyApiRequest.call(this, 'DELETE', endpoint);
					} catch (e) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const event = this.getNodeParameter('event') as string;
		const objectType = this.getNodeParameter('objectType') as string;
		const credentials = this.getCredentials('surveyMonkeyApi') as IDataObject;
		const headerData = this.getHeaderData() as IDataObject;
		const req = this.getRequestObject();
		const webhookName = this.getWebhookName();

		if (webhookName === 'setup') {
			// It is a create webhook confirmation request
			return {};
		}

		if (headerData['sm-signature'] === undefined) {
			return {};
		}

		return new Promise((resolve, reject) => {
			const data: Buffer[] = [];

			req.on('data', (chunk) => {
				data.push(chunk);
			});

			req.on('end', async () => {

				const computedSignature = createHmac('sha1', `${credentials.clientId}&${credentials.clientSecret}`).update(data.join('')).digest('base64');
				if (headerData['sm-signature'] !== computedSignature) {
				// Signature is not valid so ignore call
					return {};
				}

				let responseData = JSON.parse(data.join(''));
				let endpoint = '';

				if (event === 'response_completed') {
					const resolveData = this.getNodeParameter('resolveData') as boolean;
					if (resolveData) {
						if (objectType === 'survey') {
							endpoint = `/surveys/${responseData.resources.survey_id}/responses/${responseData.object_id}/details`;
						} else {
							endpoint = `/collectors/${responseData.resources.collector_id}/responses/${responseData.object_id}/details`;
						}
						responseData = await surveyMonkeyApiRequest.call(this, 'GET', endpoint);
					}
				}

				const returnItem: INodeExecutionData = {
					json: responseData,
				};

				return resolve({
					workflowData: [
						[
							returnItem,
						],
					],
				});
			});

			req.on('error', (err) => {
				throw new Error(err.message);
			});
		});
	}
}
