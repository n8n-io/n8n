import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { workableApiRequest } from './GenericFunctions';

import { snakeCase } from 'change-case';

export class WorkableTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Workable Trigger',
		name: 'workableTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:workable.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["triggerOn"]}}',
		description: 'Starts the workflow when Workable events occur',
		defaults: {
			name: 'Workable Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'workableApi',
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
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				options: [
					{
						name: 'Candidate Created',
						value: 'candidateCreated',
					},
					{
						name: 'Candidate Moved',
						value: 'candidateMoved',
					},
				],
				default: '',
				required: true,
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				options: [
					{
						displayName: 'Job Name or ID',
						name: 'job',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getJobs',
						},
						default: '',
						description:
							'Get notifications only for one job. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Stage Name or ID',
						name: 'stage',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getStages',
						},
						default: '',
						description:
							'Get notifications for specific stages. e.g. \'hired\'. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getJobs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { jobs } = await workableApiRequest.call(this, 'GET', '/jobs');
				for (const job of jobs) {
					returnData.push({
						name: job.full_title,
						value: job.shortcode,
					});
				}
				return returnData;
			},
			async getStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { stages } = await workableApiRequest.call(this, 'GET', '/stages');
				for (const stage of stages) {
					returnData.push({
						name: stage.name,
						value: stage.slug,
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
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const { subscriptions } = await workableApiRequest.call(this, 'GET', '/subscriptions');
				for (const subscription of subscriptions) {
					if (subscription.target === webhookUrl) {
						webhookData.webhookId = subscription.id as string;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = (await this.getCredentials('workableApi')) as {
					accessToken: string;
					subdomain: string;
				};
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const triggerOn = this.getNodeParameter('triggerOn') as string;
				const { stage, job } = this.getNodeParameter('filters') as IDataObject;
				const endpoint = '/subscriptions';

				const body: IDataObject = {
					event: snakeCase(triggerOn).toLowerCase(),
					args: {
						account_id: credentials.subdomain,
						...(job && { job_shortcode: job }),
						...(stage && { stage_slug: stage }),
					},
					target: webhookUrl,
				};

				const responseData = await workableApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/subscriptions/${webhookData.webhookId}`;
					try {
						await workableApiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
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
		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
