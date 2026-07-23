import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { lineApiRequest } from './MessagingGenericFunctions';
import { customApiCallFields } from './descriptions/CustomApiCallDescription';
import { messageOperations, messageFields } from './descriptions/MessageDescription';

export class LineMessagingApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LINE',
		name: 'lineMessagingApi',
		icon: 'file:line.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["resource"] === "customApiCall" ? "Custom API Call" : $parameter["operation"]}}',
		description: 'Send messages using the LINE Messaging API',
		codex: {
			categories: ['Communication'],
			subcategories: {
				Communication: ['LINE'],
				LINE: ['Actions'],
			},
		},
		defaults: { name: 'LINE' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'lineApi', required: true }],
		properties: [
			// ─── Resource ────────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Message', value: 'message', description: 'Send a message to users' },
					{
						name: 'Custom API Call',
						value: 'customApiCall',
						description: 'Make a custom authenticated request to the LINE API',
					},
				],
				default: 'message',
			},
			// ─── Operations & Fields ──────────────────────────────────────
			...messageOperations,
			...messageFields,
			...customApiCallFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;

				if (resource === 'customApiCall') {
					const method = this.getNodeParameter('method', i) as 'GET' | 'POST' | 'DELETE';
					const endpoint = this.getNodeParameter('endpoint', i) as string;

					const queryParametersRaw = this.getNodeParameter(
						'queryParameters.parameter',
						i,
						[],
					) as Array<{ name: string; value: string }>;
					const qs: IDataObject = {};
					for (const { name, value } of queryParametersRaw) {
						qs[name] = value;
					}

					let body: IDataObject | undefined;
					if (method === 'POST') {
						const bodyRaw = this.getNodeParameter('body', i, '{}') as string;
						body = typeof bodyRaw === 'string' ? (JSON.parse(bodyRaw) as IDataObject) : bodyRaw;
					}

					const res = await lineApiRequest.call(
						this,
						method,
						endpoint,
						body,
						Object.keys(qs).length ? qs : undefined,
					);
					returnData.push({ json: res ?? {}, pairedItem: { item: i } });
					continue;
				}

				const operation = this.getNodeParameter('operation', i) as string;
				const messagesRaw = this.getNodeParameter('messages', i);
				const messages =
					typeof messagesRaw === 'string'
						? (JSON.parse(messagesRaw) as IDataObject[])
						: (messagesRaw as IDataObject[]);

				let endpoint: string;
				let body: IDataObject;

				if (operation === 'reply') {
					const replyToken = this.getNodeParameter('replyToken', i) as string;
					endpoint = '/v2/bot/message/reply';
					body = { replyToken, messages };
				} else if (operation === 'push') {
					const userId = this.getNodeParameter('userId', i) as string;
					endpoint = '/v2/bot/message/push';
					body = { to: userId, messages };
				} else if (operation === 'multicast') {
					const to = (this.getNodeParameter('userIds', i) as string)
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean);
					endpoint = '/v2/bot/message/multicast';
					body = { to, messages };
				} else {
					endpoint = '/v2/bot/message/broadcast';
					body = { messages };
				}

				const res = await lineApiRequest.call(this, 'POST', endpoint, body);
				returnData.push({ json: res ?? {}, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
