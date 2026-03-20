import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

export class Resend implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Resend',
		name: 'resend',
		icon: 'file:resend.svg',
		group: ['output'],
		version: 1,
		description: 'Send an email via Resend',
		defaults: {
			name: 'Resend',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'resendApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Team <team@example.com>',
				description: 'Sender email address, optionally with display name',
			},
			{
				displayName: 'To Email',
				name: 'toEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'recipient@example.com',
				description: 'Recipient email address. Multiple can be separated by comma.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'My subject line',
				description: 'Subject line of the email',
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: {
					rows: 5,
					editor: 'htmlEditor',
				},
				default: '',
				description: 'HTML body of the email',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				description: 'Plain text body of the email (auto-generated from HTML if omitted)',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'CC',
						name: 'cc',
						type: 'string',
						default: '',
						description: 'CC recipient(s). Multiple can be separated by comma.',
					},
					{
						displayName: 'BCC',
						name: 'bcc',
						type: 'string',
						default: '',
						description: 'BCC recipient(s). Multiple can be separated by comma.',
					},
					{
						displayName: 'Reply To',
						name: 'replyTo',
						type: 'string',
						default: '',
						description: 'Reply-to email address',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'tag',
								displayName: 'Tag',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
						description: 'Tags for categorization (key-value pairs)',
					},
					{
						displayName: 'Scheduled At',
						name: 'scheduledAt',
						type: 'string',
						default: '',
						description: 'Schedule send time in ISO 8601 format',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const fromEmail = this.getNodeParameter('fromEmail', itemIndex) as string;
				const toEmail = this.getNodeParameter('toEmail', itemIndex) as string;
				const subject = this.getNodeParameter('subject', itemIndex) as string;
				const html = this.getNodeParameter('html', itemIndex) as string;
				const text = this.getNodeParameter('text', itemIndex) as string;
				const additionalFields = this.getNodeParameter(
					'additionalFields',
					itemIndex,
				) as IDataObject;

				const body: IDataObject = {
					from: fromEmail,
					to: toEmail.split(',').map((e: string) => e.trim()),
					subject,
				};

				if (html) {
					body.html = html;
				}
				if (text) {
					body.text = text;
				}

				if (additionalFields.cc) {
					body.cc = (additionalFields.cc as string).split(',').map((e: string) => e.trim());
				}
				if (additionalFields.bcc) {
					body.bcc = (additionalFields.bcc as string).split(',').map((e: string) => e.trim());
				}
				if (additionalFields.replyTo) {
					body.reply_to = additionalFields.replyTo;
				}
				if (additionalFields.scheduledAt) {
					body.scheduled_at = additionalFields.scheduledAt;
				}

				const tags = additionalFields.tags as IDataObject;
				if (tags?.tag) {
					body.tags = (tags.tag as IDataObject[]).map((t) => ({
						name: t.name,
						value: t.value,
					}));
				}

				const options: IRequestOptions = {
					method: 'POST',
					uri: 'https://api.resend.com/emails',
					body,
					json: true,
				};

				let responseData;
				try {
					responseData = await this.helpers.requestWithAuthentication.call(
						this,
						'resendApi',
						options,
					);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: itemIndex } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: itemIndex } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
