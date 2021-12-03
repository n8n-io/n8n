import {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	formatSubmission,
	koboToolboxApiRequest,
	parseStringList
} from './GenericFunctions';

import {
	formattingOptions,
} from './descriptions';

export class KoboToolboxTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'KoboToolbox Trigger',
		name: 'koboToolboxTrigger',
		icon: 'file:koboToolbox.svg',
		group: ['trigger'],
		version: 1,
		description: 'Process KoboToolbox submissions',
		defaults: {
			name: 'KoboToolbox Trigger',
			color: '#64C0FF',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'koboToolboxApi',
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
				displayName: 'Form ID',
				name: 'asset_uid',
				type: 'string',
				required: true,
				default:'',
				description:'Form id (e.g. aSAvYreNzVEkrWg5Gdcvg)',
			},
			{...formattingOptions},
		],
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const asset_uid = this.getNodeParameter('asset_uid') as string; //tslint:disable-line:variable-name
				const {results: webhooks} = await koboToolboxApiRequest.call(this, {
					url: `/api/v2/assets/${asset_uid}/hooks/`,
				});
				for (const webhook of webhooks || []) {
					if (webhook.endpoint === webhookUrl && webhook.active === true) {
						webhookData.webhookId = webhook.uid;
						return true;
					}
				}
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const asset_uid = this.getNodeParameter('asset_uid') as string; //tslint:disable-line:variable-name

				// First check if one exists but is inactive
				const { results: webhooks } = await koboToolboxApiRequest.call(this, {
					url: `/api/v2/assets/${asset_uid}/hooks`,
				});
				for (const webhook of webhooks) {
					if (webhook.endpoint === webhookUrl) {
						await koboToolboxApiRequest.call(this, {
							method: 'PATCH',
							url: `/api/v2/assets/${asset_uid}/hooks/${webhook.uid}`,
							body: {
								active: true,
							},
						});
						webhookData.webhookId = webhook.uid;
						return true;
					}
				}

				// No existing hook found, create one
				const response = await koboToolboxApiRequest.call(this, {
					method: 'POST',
					url: `/api/v2/assets/${asset_uid}/hooks/`,
					body: {
						name: `n8n Automatic Webhook`,
						endpoint: webhookUrl,
						email_notification: true,
					},
				});
				// console.dir(response);

				if (response.uid) {
					webhookData.webhookId = response.uid;
					webhookData.webhookId = response.uid;
					return true;
				}

				return false;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const asset_uid = this.getNodeParameter('asset_uid') as string; //tslint:disable-line:variable-name
				try {
					await koboToolboxApiRequest.call(this, {
						method: 'DELETE',
						url: `/api/v2/assets/${asset_uid}/hooks/${webhookData.webhookId}`,
					});
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
		const formatOptions = this.getNodeParameter('formatOptions') as IDataObject;

		// console.dir(req.body);

		const response = formatOptions.reformat
			? formatSubmission(req.body, parseStringList(formatOptions.select_mask), parseStringList(formatOptions.number_mask))
			: req.body;

		return {
			workflowData: [
				this.helpers.returnJsonArray(response),
			],
		};
	}
}
