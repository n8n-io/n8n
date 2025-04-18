import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import { createMessage, WHATSAPP_BASE_URL } from './GenericFunctions';
import { mediaFields, mediaTypeFields } from './MediaDescription';
import { sanitizePhoneNumber } from './MessageFunctions';
import { messageFields, messageTypeFields } from './MessagesDescription';
import { configureWaitTillDate } from '../../utils/sendAndWait/configureWaitTillDate.util';
import { sendAndWaitWebhooksDescription } from '../../utils/sendAndWait/descriptions';
import {
	getSendAndWaitConfig,
	getSendAndWaitProperties,
	sendAndWaitWebhook,
} from '../../utils/sendAndWait/utils';

const WHATSAPP_CREDENTIALS_TYPE = 'whatsAppApi';

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
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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

	customOperations = {
		message: {
			async [SEND_AND_WAIT_OPERATION](this: IExecuteFunctions) {
				try {
					const phoneNumberId = this.getNodeParameter('phoneNumberId', 0) as string;

					const recipientPhoneNumber = sanitizePhoneNumber(
						this.getNodeParameter('recipientPhoneNumber', 0) as string,
					);

					const config = getSendAndWaitConfig(this);
					const instanceId = this.getInstanceId();

					await this.helpers.httpRequestWithAuthentication.call(
						this,
						WHATSAPP_CREDENTIALS_TYPE,
						createMessage(config, phoneNumberId, recipientPhoneNumber, instanceId),
					);

					const waitTill = configureWaitTillDate(this);

					await this.putExecutionToWait(waitTill);
					return [this.getInputData()];
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error);
				}
			},
		},
	};
}
