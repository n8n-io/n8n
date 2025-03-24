import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { messageOperations, messageFields } from './descriptions';

import {
	getPicklistMailagentOptions,
	getPicklistTemplateOptions,
	zohoZeptomailApiRequest,
	getRecipientAddresses,
	getReplyToAddresses,
} from './GenericFunctions';

export class ZohoZeptomail implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho Zeptomail',
		name: 'zohoZeptomail',
		icon: 'file:ZohoZeptoMail.png',
		group: ['transform'],
		subtitle: '={{$parameter["operation"]}}',
		version: 1,
		description: 'Consume Zoho ZeptoMail API',
		defaults: {
			name: 'Zoho ZeptoMail',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'zohoZeptomailOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
			},
			...messageOperations,
			...messageFields,
		],
	};

	methods = {
		loadOptions: {
			async getListMailagent(this: ILoadOptionsFunctions) {
				return await getPicklistMailagentOptions.call(this);
			},
			async getListTemplate(this: ILoadOptionsFunctions) {
				const mailagent = this.getCurrentNodeParameter('mailagent', {
					extractValue: true,
				}) as string;
				return await getPicklistTemplateOptions.call(this, mailagent.toString());
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'message') {
					// **********************************************************************
					//                                Message
					// **********************************************************************

					if (operation === 'sendmail') {
						// ----------------------------------------
						//             Message: sendmail
						// ----------------------------------------

						// Get the necessary parameters
						const body: IDataObject = {
							mailagent_key: this.getNodeParameter('mailagent', i),
							from: this.getNodeParameter('fromaddress', i),
							subject: this.getNodeParameter('subject', i),
							to: getRecipientAddresses(this.getNodeParameter('toaddress', i)),
						};
						if (
							this.getNodeParameter('htmlbody', i) !== undefined &&
							this.getNodeParameter('htmlbody', i) !== ''
						) {
							body.htmlbody = this.getNodeParameter('htmlbody', i);
						}
						if (
							this.getNodeParameter('replyto', i) !== undefined &&
							this.getNodeParameter('replyto', i) !== ''
						) {
							body.reply_to = getReplyToAddresses(this.getNodeParameter('replyto', i));
						}
						if (
							this.getNodeParameter('cc', i) !== undefined &&
							this.getNodeParameter('cc', i) !== ''
						) {
							body.cc = getRecipientAddresses(this.getNodeParameter('cc', i));
						}
						if (
							this.getNodeParameter('bcc', i) !== undefined &&
							this.getNodeParameter('bcc', i) !== ''
						) {
							body.bcc = getRecipientAddresses(this.getNodeParameter('bcc', i));
						}
						const attachment = this.getNodeParameter('attachment', i);
						if (
							attachment &&
							typeof attachment === 'object' &&
							Object.keys(attachment).length > 0
						) {
							body.attachments = [this.getNodeParameter('attachment', i)];
						}
						responseData = await zohoZeptomailApiRequest.call(this, 'POST', `v1.0/email`, body, {});
						responseData = responseData.data;
					} else if (operation === 'sendtemplatemail') {
						// ----------------------------------------
						//             Message: sendtemplatemail
						// ----------------------------------------
						const body: IDataObject = {
							mailagent_key: this.getNodeParameter('mailagent', i),
							from: this.getNodeParameter('fromaddress', i),
							to: getRecipientAddresses(this.getNodeParameter('toaddress', i)),
							mail_template_key: this.getNodeParameter('template', i),
						};
						if (
							this.getNodeParameter('replyto', i) !== undefined &&
							this.getNodeParameter('replyto', i) !== ''
						) {
							body.reply_to = getReplyToAddresses(this.getNodeParameter('replyto', i));
						}
						if (
							this.getNodeParameter('cc', i) !== undefined &&
							this.getNodeParameter('cc', i) !== ''
						) {
							body.cc = getRecipientAddresses(this.getNodeParameter('cc', i));
						}
						if (
							this.getNodeParameter('bcc', i) !== undefined &&
							this.getNodeParameter('bcc', i) !== ''
						) {
							body.bcc = getRecipientAddresses(this.getNodeParameter('bcc', i));
						}
						if (
							this.getNodeParameter('mergeinfo', i) !== undefined &&
							this.getNodeParameter('mergeinfo', i) !== ''
						) {
							body.merge_info = this.getNodeParameter('mergeinfo', i);
						}
						responseData = await zohoZeptomailApiRequest.call(
							this,
							'POST',
							`v1.0/email/template`,
							body,
							{},
						);
						responseData = responseData.data;
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.details[0].message, json: {} });
					continue;
				}
				throw error;
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}
		return [returnData];
	}
}
