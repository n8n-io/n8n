import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
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
					const isBodyHtml = this.getNodeParameter('isBodyHtml', i) as boolean;
					const message = this.getNodeParameter('body', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const toEmails = (this.getNodeParameter('toEmails', i) as string).split(',') as string[];
					const variables = (this.getNodeParameter('variablesUi', i) as IDataObject).variablesValues as IDataObject[];

					const body: IDataObject = {
						Messages: [
							{
								From: {
									email: fromEmail,
								},
								to: [],
								Cc: [],
								Bcc: [],
								Variables: {},
							},
						],
						SandboxMode: true,
					};
					for (const toEmail of toEmails) {
						//@ts-ignore
						body.Messages[0].to.push({
							email: toEmail,
						})
					}
					if (variables) {
						for (const variable of variables) {
							//@ts-ignore
							body.Messages[0].Variables[variable.name] = variable.value;
						}
					}
					if (isBodyHtml) {
						//@ts-ignore
						body.Messages[0].HTMLPart = message;
					} else {
						//@ts-ignore
						body.Messages[0].TextPart = message;
					}
					if (additionalFields.bccAddresses) {
						const bccAddresses = (additionalFields.bccAddresses as string).split(',') as string[];
						for (const bccAddress of bccAddresses) {
							//@ts-ignore
							body.Messages[0].Bcc.push({
								email: bccAddress,
							});
						}
					}
					if (additionalFields.ccAddresses) {
						const ccAddresses = (additionalFields.ccAddresses as string).split(',') as string[];
						for (const ccAddress of ccAddresses) {
							//@ts-ignore
							body.Messages[0].Cc.push({
								email: ccAddress,
							});
						}
					}
					if (additionalFields.subject) {
						//@ts-ignore
						body.Messages[0].subject = additionalFields.subject as string;
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
					const templateId = this.getNodeParameter('templateId', i) as string;
					const variables = (this.getNodeParameter('variablesUi', i) as IDataObject).variablesValues as IDataObject[];
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const toEmails = (this.getNodeParameter('toEmails', i) as string).split(',') as string[];

					const body: IDataObject = {
						Messages: [
							{
								From: {
									email: fromEmail,
								},
								to: [],
								Cc: [],
								Bcc: [],
								Variables: {},
								TemplateID: templateId,
							},
						],
						SandboxMode: true,
					};
					for (const toEmail of toEmails) {
						//@ts-ignore
						body.Messages[0].to.push({
							email: toEmail,
						});
					}
					if (variables) {
						for (const variable of variables) {
							//@ts-ignore
							body.Messages[0].Variables[variable.name] = variable.value;
						}
					}
					if (additionalFields.bccAddresses) {
						const bccAddresses = (additionalFields.bccAddresses as string).split(',') as string[];
						for (const bccAddress of bccAddresses) {
							//@ts-ignore
							body.Messages[0].Bcc.push({
								email: bccAddress,
							});
						}
					}
					if (additionalFields.ccAddresses) {
						const ccAddresses = (additionalFields.ccAddresses as string).split(',') as string[];
						for (const ccAddress of ccAddresses) {
							//@ts-ignore
							body.Messages[0].Cc.push({
								email: ccAddress,
							});
						}
					}
					if (additionalFields.subject) {
						//@ts-ignore
						body.Messages[0].Subject = additionalFields.subject as string;
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
