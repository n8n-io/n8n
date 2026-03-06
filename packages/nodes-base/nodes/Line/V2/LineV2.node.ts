import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { lineApiRequest } from './GenericFunctions';
import { messageOperations, messageFields } from './descriptions/MessageDescription';

export class LineV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			subtitle: '={{$parameter["operation"]}}',
			description: 'Send messages using the LINE Messaging API',
			defaults: { name: 'Line' },
			usableAsTool: true,
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [{ name: 'lineApi', required: true }],
			properties: [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [{ name: 'Message', value: 'message', description: 'Send a message to users' }],
					default: 'message',
				},
				...messageOperations,
				...messageFields,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
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
