import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import { createMessage, WHATSAPP_BASE_URL } from './GenericFunctions';
import { mediaFields, mediaTypeFields } from './MediaDescription';
import { sanitizePhoneNumber } from './MessageFunctions';
import { messageFields, messageTypeFields } from './MessagesDescription';
import type { WhatsAppTemplate, WhatsAppTemplateListResponse } from './types';
import { configureWaitTillDate } from '../../utils/sendAndWait/configureWaitTillDate.util';
import { sendAndWaitWebhooksDescription } from '../../utils/sendAndWait/descriptions';
import {
	getSendAndWaitConfig,
	getSendAndWaitProperties,
	SEND_AND_WAIT_WAITING_TOOLTIP,
	sendAndWaitWebhook,
} from '../../utils/sendAndWait/utils';

const WHATSAPP_CREDENTIALS_TYPE = 'whatsAppApi';

export class WhatsApp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp Business Cloud',
		name: 'whatsApp',
		icon: 'file:whatsapp.svg',
		group: ['output'],
		version: [1, 1.1],
		defaultVersion: 1.1,
		subtitle: '={{ $parameter["resource"] + ": " + $parameter["operation"] }}',
		description: 'Access WhatsApp API',
		defaults: {
			name: 'WhatsApp Business Cloud',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		waitingNodeTooltip: SEND_AND_WAIT_WAITING_TOOLTIP,
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

	methods = {
		loadOptions: {
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials(WHATSAPP_CREDENTIALS_TYPE);
				if (typeof credentials.businessAccountId !== 'string') return [];

				const templates: WhatsAppTemplate[] = [];
				let after: string | undefined;

				do {
					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						WHATSAPP_CREDENTIALS_TYPE,
						{
							baseURL: WHATSAPP_BASE_URL,
							url: `${credentials.businessAccountId}/message_templates`,
							method: 'GET',
							qs: after ? { after } : {},
						},
					)) as WhatsAppTemplateListResponse;

					templates.push(...response.data);
					after = response.paging?.next ? response.paging.cursors?.after : undefined;
				} while (after);

				return templates
					.map(({ name, language }) => ({
						name: `${name} - ${language}`,
						value: `${name}|${language}`,
					}))
					.sort((a, b) => {
						const aName = a.name.toLowerCase();
						const bName = b.name.toLowerCase();
						return aName < bName ? -1 : aName > bName ? 1 : 0;
					});
			},
		},
	};

	customOperations = {
		message: {
			async [SEND_AND_WAIT_OPERATION](this: IExecuteFunctions) {
				const phoneNumberId = this.getNodeParameter('phoneNumberId', 0) as string;

				const recipientPhoneNumber = sanitizePhoneNumber(
					this.getNodeParameter('recipientPhoneNumber', 0) as string,
				);

				const config = getSendAndWaitConfig(this);
				const instanceId = this.getInstanceId();

				try {
					await this.helpers.httpRequestWithAuthentication.call(
						this,
						WHATSAPP_CREDENTIALS_TYPE,
						createMessage(config, phoneNumberId, recipientPhoneNumber, instanceId),
					);
				} catch (error) {
					if (this.continueOnFail()) {
						return [[{ json: { error: (error as Error).message } }]];
					}
					throw new NodeOperationError(this.getNode(), error as Error);
				}

				const waitTill = configureWaitTillDate(this);

				await this.putExecutionToWait(waitTill);
				return [this.getInputData()];
			},
		},
	};
}
