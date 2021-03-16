import {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData
} from 'n8n-workflow';

// import {getAutomaticSecret, woocommerceApiRequest} from "../WooCommerce/GenericFunctions";

export class FutureTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Future Trigger',
		name: 'futureTrigger',
		icon: 'file:Future.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a Future broadcast events occurs.',
		defaults: {
			name: 'Future Trigger',
			color: '#72084e',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'futureApiCredentials',
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Broadcast Create',
						value: 'broadcast-create',
					},
					{
						name: 'Message Callback',
						value: 'message-callback',
					},
				],
				default: 'broadcast',
			},


		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				console.log('>>>>>>>>>>> CHECK_EXIST');

				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = '/push_subscriptions';

				console.log('webhookUrl', webhookUrl);
				console.log('webhookData', webhookData);

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				console.log('>>>>>>>>>>> CREATE');

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				console.log('>>>>>>>>>>> DELETE');

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;
		const query = this.getQueryData() as IDataObject;
		const event = this.getNodeParameter('event');

		console.log('body', body);
		console.log('query', query);
		console.log('event', event);

		return {
			workflowData: [
				this.helpers.returnJsonArray(body),
			],
		};
	}
}
