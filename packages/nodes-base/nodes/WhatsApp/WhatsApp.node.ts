import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import { mediaFields, mediaTypeFields } from './MediaDescription';
import { messageFields, messageTypeFields } from './MessagesDescription';
import { sendAndWaitWebhooksDescription } from '../../utils/sendAndWait/descriptions';
import {
	configureWaitTillDate,
	getSendAndWaitConfig,
	getSendAndWaitProperties,
	sendAndWaitWebhook,
} from '../../utils/sendAndWait/utils';

const WHATSAPP_CREDENTIALS_TYPE = 'whatsAppApi';
const WHATSAPP_BASE_URL = 'https://graph.facebook.com/v13.0/';

export class WhatsApp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp Business Cloud',
		name: 'whatsApp',
		icon: 'file:whatsapp.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{ $parameter["resource"] + ": " + $parameter["operation"] }}',
		description: 'Access WhatsApp API',
		defaults: {
			name: 'WhatsApp Business Cloud',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		webhooks: sendAndWaitWebhooksDescription,
		credentials: [
			{
				name: 'whatsAppApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: WHATSAPP_BASE_URL,
		},
		declarativeRunExceptions: [
			{
				resource: 'message',
				operation: SEND_AND_WAIT_OPERATION,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Media',
						value: 'media',
					},
				],
				default: 'message',
			},
			...messageFields,
			...mediaFields,
			...messageTypeFields,
			...mediaTypeFields,
			...getSendAndWaitProperties([], 'message', undefined, {
				noButtonStyle: true,
				defaultApproveLabel: '✓ Approve',
				defaultDisapproveLabel: '✗ Decline',
			}).filter((p) => p.name !== 'subject'),
		],
	};

	webhook = sendAndWaitWebhook;

	async execute(this: IExecuteFunctions) {
		const phoneNumberId = this.getNodeParameter('phoneNumberId', 0) as string;
		const recipientPhoneNumber = (
			this.getNodeParameter('recipientPhoneNumber', 0) as string
		).replace(/[\-\(\)\+]/g, '');

		const config = getSendAndWaitConfig(this);

		const buttons = config.options.map((option) => {
			return `*${option.label}:*\n_${config.url}?approved=${option.value}_\n\n`;
		});

		await this.helpers.requestWithAuthentication.call(this, WHATSAPP_CREDENTIALS_TYPE, {
			baseURL: WHATSAPP_BASE_URL,
			method: 'POST',
			url: `${phoneNumberId}/messages`,
			body: {
				messaging_product: 'whatsapp',
				text: {
					body: `${config.message}\n\n${buttons.join('')}`,
				},
				type: 'text',
				to: recipientPhoneNumber,
			},
		});

		const waitTill = configureWaitTillDate(this);

		await this.putExecutionToWait(waitTill);
		return [this.getInputData()];
	}
}
