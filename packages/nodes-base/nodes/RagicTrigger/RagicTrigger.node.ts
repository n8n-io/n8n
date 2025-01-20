import {
	type INodeType,
	type INodeTypeDescription,
	type IHookFunctions,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type NodeConnectionType,
	jsonParse,
} from 'n8n-workflow';

export class RagicTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ragic Trigger',
		name: 'ragicTrigger',
		icon: 'file:Ragic.svg',
		group: ['trigger'],
		version: 1,
		description: 'Webhook Trigger for Ragic',
		defaults: {
			name: 'Ragic_Trigger',
		},
		inputs: [],
		outputs: ['main'] as NodeConnectionType[],
		credentials: [
			{
				name: 'ragicTriggerApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default', // Webhook 的名稱
				httpMethod: 'POST', // 支援的 HTTP 方法
				responseMode: 'onReceived', // 回應模式（即時處理請求）
				path: 'default', // Webhook 的路徑（URL 的一部分）
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Create Records',
						value: 'create',
					},
					{
						name: 'Update Records',
						value: 'update',
					},
					{
						name: 'Create & Update Records',
						value: 'CreateUpdate',
					},
				],
				default: 'create',
				description: 'The Event of this trigger node listen to',
				required: true,
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// 獲取請求數據
		const bodyData = this.getBodyData();

		return {
			workflowData: [
				this.helpers.returnJsonArray({
					bodyData,
				}),
			],
		};
	}

	// 定義 webhookMethods
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('ragicTriggerApi');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const apiKey = credentials?.apiKey as string;
				const sheetUrl = credentials?.sheetUrl as string;
				const sheetUrlSection = sheetUrl.split('/');
				const server = sheetUrlSection[2];
				const apName = sheetUrlSection[3];
				const path = '/' + sheetUrlSection[4];
				const sheetIndex = sheetUrlSection[5];
				const event = this.getNodeParameter('event', 0) as string;
				let url = `https://${server}/sims/webhooks.jsp?n8n`;
				url += `&ap=${apName}`;
				url += `&path=${path}`;
				url += `&si=${sheetIndex}`;
				url += `&url=${webhookUrl}`;
				url += `&event=${event}`;
				const responseString = (await this.helpers.request({
					method: 'GET',
					url,
					headers: {
						Authorization: `Basic ${apiKey}`,
					},
				})) as string;
				const responseJSONArray = jsonParse(responseString) as [];
				for (let index = 0; index < responseJSONArray.length; index++) {
					// eslint-disable-next-line @typescript-eslint/dot-notation
					const subscribedUrl = responseJSONArray[index]['url'];
					// eslint-disable-next-line @typescript-eslint/dot-notation
					const subscribedWebhookEvent = responseJSONArray[index]['event'];
					if (subscribedUrl === webhookUrl && subscribedWebhookEvent === event) return true;
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('ragicTriggerApi');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const apiKey = credentials?.apiKey as string;
				const sheetUrl = credentials?.sheetUrl as string;
				const sheetUrlSection = sheetUrl.split('/');
				const server = sheetUrlSection[2];
				const apName = sheetUrlSection[3];
				const path = '/' + sheetUrlSection[4];
				const sheetIndex = sheetUrlSection[5];
				const event = this.getNodeParameter('event', 0) as string;
				let url = `https://${server}/sims/webhookSubscribe.jsp?n8n`;
				url += `&ap=${apName}`;
				url += `&path=${path}`;
				url += `&si=${sheetIndex}`;
				url += `&url=${webhookUrl}`;
				url += `&event=${event}`;
				await this.helpers.request({
					method: 'GET',
					url,
					headers: {
						Authorization: `Basic ${apiKey}`,
					},
					json: true,
				});

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('ragicTriggerApi');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const apiKey = credentials?.apiKey as string;
				const sheetUrl = credentials?.sheetUrl as string;
				const sheetUrlSection = sheetUrl.split('/');
				const server = sheetUrlSection[2];
				const apName = sheetUrlSection[3];
				const path = '/' + sheetUrlSection[4];
				const sheetIndex = sheetUrlSection[5];
				const event = this.getNodeParameter('event', 0) as string;
				let url = `https://${server}/sims/webhookUnsubscribe.jsp?n8n`;
				url += `&ap=${apName}`;
				url += `&path=${path}`;
				url += `&si=${sheetIndex}`;
				url += `&url=${webhookUrl}`;
				url += `&event=${event}`;
				await this.helpers.request({
					method: 'GET',
					url,
					headers: {
						Authorization: `Basic ${apiKey}`,
					},
					json: true,
				});
				return true;
			},
		},
	};
}
