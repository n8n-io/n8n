import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

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
				name: WHATSAPP_CREDENTIALS_TYPE,
				required: true,
			},
		],
		requestDefaults: {
			baseURL: WHATSAPP_BASE_URL,
		},
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

	nonRoutingOperations = {
		message: {
			async [SEND_AND_WAIT_OPERATION](context: IExecuteFunctions) {
				const resource = context.getNodeParameter('resource', 0) as string;
				const operation = context.getNodeParameter('operation', 0) as string;
				const returnData: INodeExecutionData[] = [];

				if (resource === 'message' && operation === SEND_AND_WAIT_OPERATION) {
					try {
						const phoneNumberId = context.getNodeParameter('phoneNumberId', 0) as string;
						const recipientPhoneNumber = (
							context.getNodeParameter('recipientPhoneNumber', 0) as string
						).replace(/[\-\(\)\+]/g, '');

						const config = getSendAndWaitConfig(context);

						const buttons = config.options.map((option) => {
							return `*${option.label}:*\n_${config.url}?approved=${option.value}_\n\n`;
						});

						await context.helpers.requestWithAuthentication.call(
							context,
							WHATSAPP_CREDENTIALS_TYPE,
							{
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
							},
						);

						const waitTill = configureWaitTillDate(context);

						await context.putExecutionToWait(waitTill);
						return [context.getInputData()];
					} catch (error) {
						throw new NodeOperationError(context.getNode(), error);
					}
				}

				return [returnData];
			},
		},
	};
}
