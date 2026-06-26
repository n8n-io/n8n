import {
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { sevenApiRequest } from './v2/GenericFunctions';
import { verifySignature } from './v2/helpers/signing';

const ALL_EVENTS = [
	'sms_mo',
	'dlr',
	'tracking',
	'voice_call',
	'voice_status',
	'voice_dtmf',
	'rcs',
	'wa_mo',
] as const;

export class Sms77Trigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'seven Trigger',
		name: 'sms77Trigger',
		icon: 'file:seven.svg',
		group: ['trigger'],
		version: 1,
		description: 'Receive seven webhook events (incoming SMS, DLR, voice, RCS, WhatsApp)',
		defaults: {
			name: 'seven Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'sms77Api',
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
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: [
					{ name: 'Delivery Report (DLR)', value: 'dlr' },
					{ name: 'Inbound SMS', value: 'sms_mo' },
					{ name: 'Inbound WhatsApp', value: 'wa_mo' },
					{ name: 'Performance Tracking', value: 'tracking' },
					{ name: 'RCS', value: 'rcs' },
					{ name: 'Voice Call', value: 'voice_call' },
					{ name: 'Voice DTMF', value: 'voice_dtmf' },
					{ name: 'Voice Status', value: 'voice_status' },
				],
				description: 'Webhook event types to subscribe to',
			},
			{
				displayName: 'Signing Key',
				name: 'signingKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'HMAC-SHA256 signing key from your seven account (Developer area). Leave empty to skip signature verification.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Event Filter',
						name: 'event_filter',
						type: 'string',
						default: '',
						description: 'Optional filter expression applied to webhook deliveries',
					},
					{
						displayName: 'Custom Headers (JSON)',
						name: 'headers',
						type: 'json',
						default: '',
						description: 'Custom headers to send with webhook requests',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const eventType = events.length === ALL_EVENTS.length ? 'all' : events[0];
				const webhookData = this.getWorkflowStaticData('node');

				const response = (await sevenApiRequest.call(this, 'GET', '/hooks')) as IDataObject;
				const hooks = (response?.hooks as IDataObject[]) ?? [];

				const existingIds: number[] = [];
				for (const hook of hooks) {
					if (
						hook.target_url === webhookUrl &&
						(events.includes(hook.event_type as string) ||
							(eventType === 'all' && hook.event_type === 'all'))
					) {
						existingIds.push(hook.id as number);
					}
				}

				if (existingIds.length === 0) return false;

				webhookData.hookIds = existingIds;
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
				const webhookData = this.getWorkflowStaticData('node');

				if (events.length === 0) return false;

				const eventTypes = events.length === ALL_EVENTS.length ? ['all'] : events;
				const createdIds: number[] = [];

				for (const eventType of eventTypes) {
					const body: IDataObject = {
						target_url: webhookUrl,
						event_type: eventType,
						request_method: 'json',
					};
					if (additionalFields.event_filter) body.event_filter = additionalFields.event_filter;
					if (additionalFields.headers) {
						body.headers =
							typeof additionalFields.headers === 'string'
								? additionalFields.headers
								: JSON.stringify(additionalFields.headers);
					}

					const response = (await sevenApiRequest.call(
						this,
						'POST',
						'/hooks',
						body,
					)) as IDataObject;
					if (response?.id !== undefined) {
						createdIds.push(response.id as number);
					}
				}

				if (createdIds.length === 0) return false;

				webhookData.hookIds = createdIds;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const ids = (webhookData.hookIds as number[] | undefined) ?? [];

				for (const id of ids) {
					try {
						await sevenApiRequest.call(this, 'DELETE', '/hooks', { id });
					} catch {
						// continue deleting the remaining hooks
					}
				}

				delete webhookData.hookIds;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const signingKey = this.getNodeParameter('signingKey', '') as string;

		if (signingKey && !verifySignature.call(this, signingKey)) {
			const res = this.getResponseObject();
			res.status(401).send('Unauthorized').end();
			return { noWebhookResponse: true };
		}

		const req = this.getRequestObject();
		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
		};
	}
}
