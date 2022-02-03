import {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	// LoggerProxy as Logger,
} from 'n8n-workflow';

import {
	downloadAttachments,
	formatSubmission,
	koBoToolboxApiRequest,
	loadSurveys,
	parseStringList
} from './GenericFunctions';

import {
	options,
} from './descriptions';

export class KoBoToolboxTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'KoBoToolbox Trigger',
		name: 'koBoToolboxTrigger',
		icon: 'file:koBoToolbox.svg',
		group: ['trigger'],
		version: 1,
		description: 'Process KoBoToolbox submissions',
		defaults: {
			name: 'KoBoToolbox Trigger',
			color: '#64C0FF',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'koBoToolboxApi',
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
				name: 'assetUid',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'loadSurveys',
				},
				required: true,
				default:'',
				description:'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg)',
			},
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				required: true,
				default:'formSubmission',
				options: [
					{
						name: 'On Form Submission',
						value: 'formSubmission',
					},
				],
				description:'When to call the trigger',
			},
			{...options},
		],
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const assetUid = this.getNodeParameter('assetUid') as string; //tslint:disable-line:variable-name
				const webhooks = await koBoToolboxApiRequest.call(this, {
					url: `/api/v2/assets/${assetUid}/hooks/`,
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
				const assetUid = this.getNodeParameter('assetUid') as string; //tslint:disable-line:variable-name

				const response = await koBoToolboxApiRequest.call(this, {
					method: 'POST',
					url: `/api/v2/assets/${assetUid}/hooks/`,
					body: {
						name: `n8n Automatic Webhook`,
						endpoint: webhookUrl,
						email_notification: true,
					},
				});
				// Logger.debug('KoBoToolboxTriggerCreate', response);

				if (response.uid) {
					webhookData.webhookId = response.uid;
					return true;
				}

				return false;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const assetUid = this.getNodeParameter('assetUid') as string; //tslint:disable-line:variable-name
				try {
					await koBoToolboxApiRequest.call(this, {
						method: 'DELETE',
						url: `/api/v2/assets/${assetUid}/hooks/${webhookData.webhookId}`,
					});
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	methods = {
		loadOptions: {
			loadSurveys,
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const formatOptions = this.getNodeParameter('formatOptions') as IDataObject;

		// Logger.debug('KoBoToolboxTriggerReceived', req.body);

		const responseData = formatOptions.reformat
			? formatSubmission(req.body, parseStringList(formatOptions.selectMask as string), parseStringList(formatOptions.numberMask as string))
			: req.body;

		if(formatOptions.download) {
			// Download related attachments
			return {
				workflowData: [
					[await downloadAttachments.call(this, responseData, formatOptions)],
				],
			};
		}
		else {
			return {
				workflowData: [
					this.helpers.returnJsonArray([responseData]),
				],
			};
		}
	}
}
