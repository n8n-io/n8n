import { IHookFunctions, IWebhookFunctions } from 'n8n-core';
import { IDataObject, INodeType, INodeTypeDescription, IWebhookResponseData } from 'n8n-workflow';
import { microsoftApiRequest, microsoftApiRequestAllItems } from './GenericFunctions';

export class MicrosoftOutlookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Outlook Trigger',
		name: 'microsoftOutlookTrigger',
		icon: 'file:outlook.svg',
		// subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Handle Microsoft Outlook events via webhooks',
		group: ['trigger'],
		version: 1,
		defaults: {
			name: 'Microsoft Outlook Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftOutlookOAuth2Api',
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
		properties: [],
	};
	methods = {
		loadOptions: {},
	};

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					return false;
				}

				const subscriptions = (
					((await microsoftApiRequest.call(
						this,
						'GET',
						``,
						undefined,
						{},
						'https://graph.microsoft.com/v1.0/subscriptions',
					)) as IDataObject) || {}
				).value as IDataObject[];

				if (subscriptions) {
					for (const subscription of subscriptions) {
						if (subscription.id === webhookData.webhookId) {
							return true;
						}
					}
				}
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const webhookData = this.getWorkflowStaticData('node');

				const body: IDataObject = {
					changeType: 'created,updated,deleted',
					notificationUrl: webhookUrl,
					resource: '/me/events',
					expirationDateTime: '2023-07-07T21:42:18.2257768+00:00',
					clientState: 'secretClientValue',
				};

				const uri = `https://graph.microsoft.com/v1.0/subscriptions`;

				const { id } = await microsoftApiRequest.call(this, 'POST', ``, body, {}, uri);

				webhookData.webhookId = id;
				console.log('webhookData', webhookData);
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const uri = `https://graph.microsoft.com/v1.0/subscriptions/${webhookData.webhookId}`;
				try {
					await microsoftApiRequest.call(this, 'DELETE', ``, undefined, {}, uri);
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		if (req.query.validationToken) {
			res.status(200).send(req.query.validationToken);
			return {
				noWebhookResponse: true,
			};
		}
		return {
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}
