import { createHmac } from 'crypto';
import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

export class LineMessagingApiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LINE Messaging API Trigger',
		name: 'lineMessagingApiTrigger',
		icon: 'file:line.png',
		group: ['trigger'],
		version: 1,
		description: 'LINE Messaging API の Webhook イベントを受信してワークフローを開始する',
		codex: {
			categories: ['Communication'],
			subcategories: {
				Communication: ['LINE Messaging API'],
				'LINE Messaging API': ['Triggers'],
			},
		},
		defaults: { name: 'LINE Messaging API' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'lineApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'line-webhook',
			},
		],
		triggerPanel: {
			header: 'LINE Webhook イベントを待機',
			executionsHelp: {
				active: 'Webhook が有効です。LINE Developers Console で Webhook URL を設定してください。',
				inactive: 'ワークフローを有効化すると Webhook URL が発行されます。',
			},
		},
		properties: [
			{
				displayName: 'Event Types',
				name: 'events',
				type: 'multiOptions',
				options: [
					{ name: 'Message', value: 'message' },
					{ name: 'Follow', value: 'follow' },
					{ name: 'Unfollow', value: 'unfollow' },
					{ name: 'Postback', value: 'postback' },
				],
				default: ['message'],
				description: '処理する LINE イベントタイプ',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();

		const credentials = await this.getCredentials('lineApi');
		const channelSecret = (
			credentials.environment === 'test' ? credentials.testChannelSecret : credentials.channelSecret
		) as string;

		if (channelSecret) {
			const signature = req.headers['x-line-signature'] as string;
			const rawBody = (req as unknown as { rawBody: Buffer }).rawBody;

			if (!signature) {
				res.status(401).send('Missing x-line-signature header');
				return { noWebhookResponse: true };
			}

			const expectedSig = createHmac('SHA256', channelSecret).update(rawBody).digest('base64');

			if (signature !== expectedSig) {
				res.status(401).send('Invalid signature');
				return { noWebhookResponse: true };
			}
		}

		const body = this.getBodyData() as { events?: IDataObject[] };
		const events = body.events ?? [];

		if (events.length === 0) {
			res.status(200).send('OK');
			return { noWebhookResponse: true };
		}

		const selectedEvents = this.getNodeParameter('events') as string[];
		const filtered = events.filter((e) => selectedEvents.includes(e.type as string));

		if (filtered.length === 0) {
			res.status(200).send('OK');
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [filtered.map((e) => ({ json: e }))],
		};
	}
}
