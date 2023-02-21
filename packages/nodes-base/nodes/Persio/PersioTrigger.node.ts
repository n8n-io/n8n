import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { persioApiRequest } from './GenericFunctions';

export class PersioTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Persio Trigger',
		name: 'persioTrigger',
		icon: 'file:Persio.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Persio events occur',
		defaults: {
			name: 'Persio Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'persioApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'hook',
				url: '/subscription',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'eventsUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Add Event',
				default: {},
				options: [
					{
						displayName: 'Event',
						name: 'eventValues',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'options',
								options: [
									{
										name: 'User Updated',
										value: 'user.updated',
										description: 'To get notified if any user is updated',
									},
									{
										name: 'User Specific Attribute Updated',
										value: 'user.specific.attribute.updated',
										description: 'To get notified if any user attirbute is updated',
									},
									{
										name: 'User Created',
										value: 'user.created',
										description: 'To get notified if any user is created',
									},
								],
								default: '',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Attribute',
						name: 'attribute',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const uri = 'https://api.persio.io/v1';

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const currentWebhookUrl = this.getNodeWebhookUrl('default') as string;

				const subscriptions = await persioApiRequest.call(
					this,
					'GET',
					`${uri}/subscription/hook`,
					{},
				);

				for (const subscription of subscriptions.message) {
					if (subscription.hook_url === currentWebhookUrl) {
						await persioApiRequest.call(this, 'DELETE', `${uri}/subscription/hook`, {
							id: subscription.id,
						});
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const uri = 'https://api.persio.io/v1';
				const hook_url = this.getNodeWebhookUrl('default');
				const event = (this.getNodeParameter('eventsUi') as IDataObject)
					?.eventValues as IDataObject;
				console.log(event);
				const event_type = event.name;
				let body: IDataObject = {
					hook_url,
					event_type,
				};

				if (event_type === 'user.specific.attribute.updated') {
					const attribute = this.getNodeParameter('additionalFields.attribute') as string;
					body = {
						...body,
						attribute,
					};
				}

				await persioApiRequest.call(this, 'POST', `${uri}/subscription/hook`, body);

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const uri = 'https://api.persio.io/v1';
				const currentWebhookUrl = this.getNodeWebhookUrl('default') as string;

				const subscriptions = await persioApiRequest.call(
					this,
					'GET',
					`${uri}/subscription/hook`,
					{},
				);

				for (const subscription of subscriptions.message) {
					if (subscription.hook_url === currentWebhookUrl) {
						await persioApiRequest.call(this, 'DELETE', `${uri}/subscription/hook`, {
							id: subscription.id,
						});
					}
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();

		const returnData: IDataObject[] = [];

		returnData.push({
			body: bodyData,
			headers: this.getHeaderData(),
			query: this.getQueryData(),
		});

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
