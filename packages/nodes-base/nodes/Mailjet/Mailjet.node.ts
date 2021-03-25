import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	mailjetApiRequest,
} from './GenericFunctions';
import {
	emailFields,
	emailOperations,
} from './EmailDescription';
import {
	smsFields,
	smsOperations,
} from './SmsDescription';

export class Mailjet implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mailjet',
		name: 'mailjet',
		icon: 'file:mailjet.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mailjet API',
		defaults: {
			name: 'Mailjet',
			color: '#ff9f48',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mailjetEmailApi',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'email',
						],
					},
				},
			},
			{
				name: 'mailjetSmsApi',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'sms',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'SMS',
						value: 'sms',
					},
				],
				default: 'email',
				description: 'Resource to consume.',
			},
			...emailOperations,
			...emailFields,
			...smsOperations,
			...smsFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (resource === 'email') {
				//https://dev.mailjet.com/email/guides/send-api-v31/#send-a-basic-email
				if (operation === 'send') {
					const fromEmail = this.getNodeParameter('fromEmail', i) as string;
					const htmlBody = this.getNodeParameter('html', i) as string;
					const textBody = this.getNodeParameter('text', i) as string;
					const subject = this.getNodeParameter('subject', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const toEmail = (this.getNodeParameter('toEmail', i) as string).split(',') as string[];
					const variables = (this.getNodeParameter('variablesUi', i) as IDataObject).variablesValues as IDataObject[];

					const body: IDataObject = {
						Messages: [
							{
								From: {
									email: fromEmail,
								},
								subject,
								to: [],
								Cc: [],
								Bcc: [],
								Variables: {},
							},
						],
						//SandboxMode: true,
					};
					for (const email of toEmail) {
						//@ts-ignore
						body.Messages[0].to.push({
							email,
						});
					}
					if (variables) {
						for (const variable of variables) {
							//@ts-ignore
							body.Messages[0].Variables[variable.name] = variable.value;
						}
					}
					if (htmlBody) {
						//@ts-ignore
						body.Messages[0].HTMLPart = htmlBody;
					}
					if (textBody) {
						//@ts-ignore
						body.Messages[0].TextPart = textBody;
					}
					if (additionalFields.bccEmail) {
						const bccEmail = (additionalFields.bccEmail as string).split(',') as string[];
						for (const email of bccEmail) {
							//@ts-ignore
							body.Messages[0].Bcc.push({
								email,
							});
						}
					}
					if (additionalFields.ccEmail) {
						const ccEmail = (additionalFields.ccEmail as string).split(',') as string[];
						for (const email of ccEmail) {
							//@ts-ignore
							body.Messages[0].Cc.push({
								email,
							});
						}
					}
					if (additionalFields.trackOpens) {
						//@ts-ignore
						body.Messages[0].TrackOpens = additionalFields.trackOpens as string;
					}
					if (additionalFields.trackClicks) {
						//@ts-ignore
						body.Messages[0].TrackClicks = additionalFields.trackClicks as string;
					}
					if (additionalFields.fromName) {
						//@ts-ignore
						body.Messages[0].From.name = additionalFields.fromName as string;
					}
					if (additionalFields.templateLanguage) {
						//@ts-ignore
						body.Messages[0].From.TemplateLanguage = additionalFields.templateLanguage as boolean;
					}
					if (additionalFields.priority) {
						//@ts-ignore
						body.Messages[0].Priority = additionalFields.priority as number;
					}
					responseData = await mailjetApiRequest.call(this, 'POST', '/v3.1/send', body);
					responseData = responseData.Messages;

				}
				//https://dev.mailjet.com/email/guides/send-api-v31/#use-a-template
				if (operation === 'sendTemplate') {
					const fromEmail = this.getNodeParameter('fromEmail', i) as string;
					const templateId = parseInt(this.getNodeParameter('templateId', i) as string, 10);
					const subject = this.getNodeParameter('subject', i) as string;
					const variables = (this.getNodeParameter('variablesUi', i) as IDataObject).variablesValues as IDataObject[];
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const toEmail = (this.getNodeParameter('toEmail', i) as string).split(',') as string[];

					const body: IDataObject = {
						Messages: [
							{
								From: {
									email: fromEmail,
								},
								Subject: subject,
								to: [],
								Cc: [],
								Bcc: [],
								Variables: {},
								TemplateID: templateId,
							},
						],
						//SandboxMode: true,
					};
					for (const email of toEmail) {
						//@ts-ignore
						body.Messages[0].to.push({
							email,
						});
					}
					if (variables) {
						for (const variable of variables) {
							//@ts-ignore
							body.Messages[0].Variables[variable.name] = variable.value;
						}
					}
					if (additionalFields.bccEmail) {
						const bccEmail = (additionalFields.bccEmail as string).split(',') as string[];
						for (const email of bccEmail) {
							//@ts-ignore
							body.Messages[0].Bcc.push({
								email,
							});
						}
					}
					if (additionalFields.ccEmail) {
						const ccEmail = (additionalFields.ccEmail as string).split(',') as string[];
						for (const email of ccEmail) {
							//@ts-ignore
							body.Messages[0].Cc.push({
								email,
							});
						}
					}
					if (additionalFields.trackOpens) {
						//@ts-ignore
						body.Messages[0].TrackOpens = additionalFields.trackOpens as string;
					}
					if (additionalFields.trackClicks) {
						//@ts-ignore
						body.Messages[0].TrackClicks = additionalFields.trackClicks as string;
					}
					if (additionalFields.fromName) {
						//@ts-ignore
						body.Messages[0].From.name = additionalFields.fromName as string;
					}
					if (additionalFields.templateLanguage) {
						//@ts-ignore
						body.Messages[0].From.TemplateLanguage = additionalFields.templateLanguage as boolean;
					}
					if (additionalFields.priority) {
						//@ts-ignore
						body.Messages[0].Priority = additionalFields.priority as number;
					}
					responseData = await mailjetApiRequest.call(this, 'POST', '/v3.1/send', body);
					responseData = responseData.Messages;
				}
			}
			if (resource === 'sms') {
				//https://dev.mailjet.com/sms/reference/send-message#v4_post_sms-send
				if (operation === 'send') {
					const from = this.getNodeParameter('from', i) as string;
					const to = this.getNodeParameter('to', i) as boolean;
					const text = this.getNodeParameter('text', i) as string;
					const body: IDataObject = {
						From: from,
						To: to,
						Text: text,
					};
					responseData = await mailjetApiRequest.call(this, 'POST', '/v4/sms-send', body);
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
