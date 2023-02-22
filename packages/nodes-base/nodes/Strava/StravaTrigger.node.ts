import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { stravaApiRequest } from './GenericFunctions';

import { randomBytes } from 'crypto';

export class StravaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Strava Trigger',
		name: 'stravaTrigger',
		icon: 'file:strava.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Strava events occur',
		defaults: {
			name: 'Strava Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'stravaOAuth2Api',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
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
				displayName: 'Object',
				name: 'object',
				type: 'options',
				options: [
					{
						name: '[All]',
						value: '*',
					},
					{
						name: 'Activity',
						value: 'activity',
					},
					{
						name: 'Athlete',
						value: 'athlete',
					},
				],
				default: '*',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: '[All]',
						value: '*',
					},
					{
						name: 'Created',
						value: 'create',
					},
					{
						name: 'Deleted',
						value: 'delete',
					},
					{
						name: 'Updated',
						value: 'update',
					},
				],
				default: '*',
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default the webhook-data only contain the Object ID. If this option gets activated, it will resolve the data automatically.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Delete If Exist',
						name: 'deleteIfExist',
						type: 'boolean',
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'Strava allows just one subscription at all times. If you want to delete the current subscription to make room for a new subcription with the current parameters, set this parameter to true. Keep in mind this is a destructive operation.',
					},
				],
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = '/push_subscriptions';

				const webhooks = await stravaApiRequest.call(this, 'GET', endpoint, {});

				for (const webhook of webhooks) {
					if (webhook.callback_url === webhookUrl) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');

				const endpoint = '/push_subscriptions';

				const body = {
					callback_url: webhookUrl,
					verify_token: randomBytes(20).toString('hex'),
				};

				let responseData;

				try {
					responseData = await stravaApiRequest.call(this, 'POST', endpoint, body);
				} catch (error) {
					const apiErrorResponse = error.cause.response;
					if (apiErrorResponse?.body?.errors) {
						const errors = apiErrorResponse.body.errors;
						for (error of errors) {
							// if there is a subscription already created
							if (error.resource === 'PushSubscription' && error.code === 'already exists') {
								const options = this.getNodeParameter('options') as IDataObject;
								//get the current subscription
								const webhooks = await stravaApiRequest.call(
									this,
									'GET',
									'/push_subscriptions',
									{},
								);

								if (options.deleteIfExist) {
									// delete the subscription
									await stravaApiRequest.call(
										this,
										'DELETE',
										`/push_subscriptions/${webhooks[0].id}`,
									);
									// now there is room create a subscription with the n8n data
									const requestBody = {
										callback_url: webhookUrl,
										verify_token: randomBytes(20).toString('hex'),
									};

									responseData = await stravaApiRequest.call(
										this,
										'POST',
										'/push_subscriptions',
										requestBody,
									);
								} else {
									error.message = `A subscription already exists [${webhooks[0].callback_url}]. If you want to delete this subcription and create a new one with the current parameters please go to options and set delete if exist to true`;
									throw error;
								}
							}
						}
					}

					if (!responseData) {
						throw error;
					}
				}

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
					const endpoint = `/push_subscriptions/${webhookData.webhookId}`;

					try {
						await stravaApiRequest.call(this, 'DELETE', endpoint);
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
		const body = this.getBodyData();
		const query = this.getQueryData() as IDataObject;
		const object = this.getNodeParameter('object');
		const event = this.getNodeParameter('event');
		const resolveData = this.getNodeParameter('resolveData') as boolean;

		let objectType, eventType;

		if (object === '*') {
			objectType = ['activity', 'athlete'];
		} else {
			objectType = [object];
		}

		if (event === '*') {
			eventType = ['create', 'update', 'delete'];
		} else {
			eventType = [event];
		}

		if (this.getWebhookName() === 'setup') {
			if (query['hub.challenge']) {
				// Is a create webhook confirmation request
				const res = this.getResponseObject();
				res.status(200).json({ 'hub.challenge': query['hub.challenge'] }).end();
				return {
					noWebhookResponse: true,
				};
			}
		}

		if (object !== '*' && !objectType.includes(body.object_type as string)) {
			return {};
		}

		if (event !== '*' && !eventType.includes(body.aspect_type as string)) {
			return {};
		}

		if (resolveData) {
			let endpoint = `/athletes/${body.object_id}/stats`;
			if (body.object_type === 'activity') {
				endpoint = `/activities/${body.object_id}`;
			}
			body.object_data = await stravaApiRequest.call(this, 'GET', endpoint);
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
