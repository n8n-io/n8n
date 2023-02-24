import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	getGoogleAnalyticsDomainsArray,
	getTags,
	getToEmailArray,
	mandrillApiRequest,
	validateJSON,
} from './GenericFunctions';

import moment from 'moment';

import map from 'lodash.map';
import isEmpty from 'lodash.isempty';

interface Attachments {
	type: string;
	name: string;
	content: string;
}

interface Message {
	html?: string;
	text?: string;
	subject?: string;
	from_name?: string;
	from_email: string;
	to: string[];
	important?: boolean;
	track_opens?: boolean;
	track_clicks?: boolean;
	auto_text?: boolean;
	auto_html?: boolean;
	inline_css?: boolean;
	url_strip_qs?: boolean;
	preserve_recipients?: boolean;
	view_content_link?: boolean;
	async?: boolean;
	subaccount?: string;
	google_analytics_campaign?: string;
	google_analytics_domains?: string[];
	tags?: string[];
	ip_pool?: string;
	bcc_address?: string;
	tracking_domain?: string;
	signing_domain?: string;
	return_path_domain?: string;
	headers?: IDataObject;
	metadata?: IDataObject;
	global_merge_vars?: [IDataObject];
	attachments?: Attachments[];
}

interface Body {
	template_content: [];
	template_name?: string;
	message: Message;
	send_at?: string;
}

type Options = IDataObject & {
	html: string;
	fromName?: string;
	text: string;
	subject?: string;
	important: boolean;
	trackOpens: boolean;
	trackClicks: boolean;
	autoText: boolean;
	autoHtml: boolean;
	inlineCss: boolean;
	urlStripQs: boolean;
	preserveRecipients: boolean;
	viewContentLink: boolean;
	async: boolean;
	subaccount: string;
	googleAnalyticsCampaign: string;
	googleAnalyticsDomains?: string;
	tags: string;
	ipPool: string;
	bccAddress: string;
	trackingDomain: string;
	signingDomain: string;
	returnPathDomain: string;
	sendAt: string;
};

export class Mandrill implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mandrill',
		name: 'mandrill',
		icon: 'file:mandrill.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mandrill API',
		defaults: {
			name: 'Mandrill',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mandrillApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message',
						value: 'message',
						description: 'Send a message',
					},
				],
				default: 'message',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				options: [
					{
						name: 'Send Template',
						value: 'sendTemplate',
						description: 'Send message based on template',
						action: 'Send a message based on a template',
					},
					{
						name: 'Send HTML',
						value: 'sendHtml',
						description: 'Send message based on HTML',
						action: 'Send a message based on HTML',
					},
				],
				default: 'sendTemplate',
			},
			{
				displayName: 'Template Name or ID',
				name: 'template',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
				},
				displayOptions: {
					show: {
						operation: ['sendTemplate'],
					},
				},
				default: '',
				options: [],
				required: true,
				description:
					'The template you want to send. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Admin <example@yourdomain.com>',
				description: 'Email address of the sender optional with name',
				displayOptions: {
					show: {
						operation: ['sendHtml', 'sendTemplate'],
					},
				},
			},
			{
				displayName: 'To Email',
				name: 'toEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'info@example.com',
				description: 'Email address of the recipient. Multiple ones can be separated by comma.',
				displayOptions: {
					show: {
						operation: ['sendHtml', 'sendTemplate'],
					},
				},
			},
			{
				displayName: 'JSON Parameters',
				name: 'jsonParameters',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['sendHtml', 'sendTemplate'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['sendHtml', 'sendTemplate'],
					},
				},
				options: [
					{
						displayName: 'Async',
						name: 'async',
						type: 'boolean',
						default: false,
						description:
							'Whether to enable a background sending mode that is optimized for bulk sending. In async mode, messages/send will immediately return a status of "queued" for every recipient. To handle rejections when sending in async mode, set up a webhook for the \'reject\' event. Defaults to false for messages with no more than 10 recipients; messages with more than 10 recipients are always sent asynchronously, regardless of the value of async.',
					},
					{
						displayName: 'Auto Text',
						name: 'autoText',
						type: 'boolean',
						default: false,
						description:
							'Whether or not to automatically generate a text part for messages that are not given text',
					},
					{
						displayName: 'Auto HTML',
						name: 'autoHtml',
						type: 'boolean',
						default: false,
						description:
							'Whether or not to automatically generate an HTML part for messages that are not given HTML',
					},
					{
						displayName: 'BCC Address',
						name: 'bccAddress',
						type: 'string',
						default: '',
						placeholder: 'message.bcc_address@example.com',
						description: "An optional address to receive an exact copy of each recipient's email",
					},
					{
						displayName: 'From Name',
						name: 'fromName',
						type: 'string',
						default: '',
						placeholder: 'John Doe',
						description: 'Optional from name to be used',
					},
					{
						displayName: 'Google Analytics Campaign',
						name: 'googleAnalyticsCampaign',
						type: 'string',
						default: '',
						placeholder: '',
						description:
							"Optional string indicating the value to set for the utm_campaign tracking parameter. If this isn't provided the email's from address will be used instead.",
					},
					{
						displayName: 'Google Analytics Domains',
						name: 'googleAnalyticsDomains',
						type: 'string',
						default: '',
						placeholder: '',
						description:
							'An array of strings separated by a comma (,) indicating for which any matching URLs will automatically have Google Analytics parameters appended to their query string automatically',
					},
					{
						displayName: 'HTML',
						name: 'html',
						type: 'string',
						default: '',
						typeOptions: {
							rows: 5,
						},
						options: [],
						description: 'The html you want to send',
					},
					{
						displayName: 'Important',
						name: 'important',
						type: 'boolean',
						default: false,
						description:
							'Whether or not this message is important, and should be delivered ahead of non-important messages',
					},
					{
						displayName: 'Inline CSS',
						name: 'inlineCss',
						type: 'boolean',
						default: false,
						description:
							'Whether or not to automatically inline all CSS styles provided in the message HTML - only for HTML documents less than 256KB in size',
					},
					{
						displayName: 'Ip Pool',
						name: 'ipPool',
						type: 'string',
						default: '',
						placeholder: '',
						description:
							'The name of the dedicated ip pool that should be used to send the message. If you do not have any dedicated IPs, this parameter has no effect. If you specify a pool that does not exist, your default pool will be used instead.',
					},
					{
						displayName: 'Preserve Recipients',
						name: 'preserveRecipients',
						type: 'boolean',
						default: false,
						description: 'Whether or not to expose all recipients in to "To" header for each email',
					},
					{
						displayName: 'Return Path Domain',
						name: 'returnPathDomain',
						type: 'string',
						default: '',
						placeholder: '',
						description: "A custom domain to use for the messages's return-path",
					},
					{
						displayName: 'Sent At',
						name: 'sendAt',
						type: 'dateTime',
						default: '',
						placeholder: '',
						description:
							'When this message should be sent as a UTC timestamp in YYYY-MM-DD HH:MM:SS format. If you specify a time in the past, the message will be sent immediately. An additional fee applies for scheduled email, and this feature is only available to accounts with a positive balance.',
					},
					{
						displayName: 'Signing Domain',
						name: 'signingDomain',
						type: 'string',
						default: '',
						placeholder: '',
						description:
							'A custom domain to use for SPF/DKIM signing instead of mandrill(for "via" or "on behalf of" in email clients)',
					},
					{
						displayName: 'Subaccount',
						name: 'subAccount',
						type: 'string',
						default: '',
						placeholder: '',
						description:
							'The unique ID of a subaccount for this message - must already exist or will fail with an error',
					},
					{
						displayName: 'Subject',
						name: 'subject',
						type: 'string',
						default: '',
						placeholder: 'My subject line',
						description: 'Subject line of the email',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: '',
						description:
							'An array of string separated by a comma (,) to tag the message with. Stats are accumulated using tags, though we only store the first 100 we see, so this should not be unique or change frequently. Tags should be 50 characters or less. Any tags starting with an underscore are reserved for internal use and will cause errors.',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						typeOptions: {
							rows: 5,
						},
						options: [],
						description: 'Example text content',
					},
					{
						displayName: 'Track Clicks',
						name: 'trackClicks',
						type: 'boolean',
						default: false,
						description: 'Whether or not to turn on click tracking for the message',
					},
					{
						displayName: 'Track Opens',
						name: 'trackOpens',
						type: 'boolean',
						default: false,
						description: 'Whether or not to turn on open tracking for the message',
					},
					{
						displayName: 'Tracking Domain',
						name: 'trackingDomain',
						type: 'string',
						default: '',
						placeholder: '',
						description:
							'A custom domain to use for tracking opens and clicks instead of mandrillapp.com',
					},
					{
						displayName: 'Url Strip Qs',
						name: 'urlStripQs',
						type: 'boolean',
						default: false,
						description:
							'Whether or not to strip the query string from URLs when aggregating tracked URL data',
					},
					{
						displayName: 'View Content Link',
						name: 'viewContentLink',
						type: 'boolean',
						default: false,
						description: 'Whether to remove content logging for sensitive emails',
					},
				],
			},
			{
				displayName: 'Merge Vars',
				name: 'mergeVarsJson',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				placeholder: `[
	{
		{ "name": "name", "content": "content" }
	}
]`,
				displayOptions: {
					show: {
						jsonParameters: [true],
					},
				},
				description: 'Global merge variables',
			},
			{
				displayName: 'Merge Vars',
				name: 'mergeVarsUi',
				placeholder: 'Add Merge Vars',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [false],
					},
				},
				description: 'Per-recipient merge variables',
				options: [
					{
						name: 'mergeVarsValues',
						displayName: 'Vars',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Metadata',
				name: 'metadataUi',
				placeholder: 'Add Metadata',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [false],
					},
				},
				description:
					'Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.',
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: 'Name of the metadata key to add.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the metadata key',
							},
						],
					},
				],
			},
			{
				displayName: 'Metadata',
				name: 'metadataJson',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [true],
					},
				},
				default: '',
				placeholder: `{
	"website": "www.example.com"
}`,
				description:
					'Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.',
			},
			{
				displayName: 'Attachments',
				name: 'attachmentsJson',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [true],
					},
				},
				default: '',
				placeholder: `[
	{
		"type": "text/plain" (the MIME type of the attachment),
		"name": "myfile.txt" (the file name of the attachment),
		"content": "ZXhhbXBsZSBmaWxl" (the content of the attachment as a base64-encoded string)
	}
]`,
				description: 'An array of supported attachments to add to the message',
			},
			{
				displayName: 'Attachments',
				name: 'attachmentsUi',
				placeholder: 'Add Attachments',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [false],
					},
				},
				options: [
					{
						name: 'attachmentsValues',
						displayName: 'Attachments Values',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'string',
								default: '',
								placeholder: 'text/plain',
								description: 'The MIME type of the attachment',
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'myfile.txt',
								description: 'The file name of the attachment',
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								default: '',
								placeholder: 'ZXhhbXBsZSBmaWxl',
								description: 'The content of the attachment as a base64-encoded string',
							},
						],
					},
					{
						name: 'attachmentsBinary',
						displayName: 'Attachments Binary',
						values: [
							{
								displayName: 'Property',
								name: 'property',
								type: 'string',
								default: '',
								description:
									'Name of the binary properties which contain data which should be added to email as attachment',
							},
						],
					},
				],
				default: {},
				description: 'Array of supported attachments to add to the message',
			},
			{
				displayName: 'Headers',
				name: 'headersJson',
				type: 'json',
				default: '',
				placeholder: `{
	"Reply-To": "replies@example.com"
}`,
				displayOptions: {
					show: {
						jsonParameters: [true],
					},
				},
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Optional extra headers to add to the message (most headers are allowed)',
			},
			{
				displayName: 'Headers',
				name: 'headersUi',
				placeholder: 'Add Headers',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [false],
					},
				},
				options: [
					{
						name: 'headersValues',
						displayName: 'Values',
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
				description: 'Optional extra headers to add to the message (most headers are allowed)',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available templates to display them to user so that he can
			// select them easily
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let templates;
				try {
					templates = await mandrillApiRequest.call(this, '/templates', 'POST', '/list');
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}
				for (const template of templates) {
					const templateName = template.name;
					const templateSlug = template.slug;

					returnData.push({
						name: templateName,
						value: templateSlug,
					});
				}

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const items = this.getInputData();
		let responseData;
		let emailSentResponse;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'message') {
					const options = this.getNodeParameter('options', i) as Options;
					const fromEmail = this.getNodeParameter('fromEmail', i) as string;
					const toEmail = this.getNodeParameter('toEmail', i) as string;
					const jsonActive = this.getNodeParameter('jsonParameters', i);
					const toEmailArray = getToEmailArray(toEmail);

					const message: Message = {
						html: options.html ? options.html : '',
						text: options.text ? options.text : '',
						subject: options.subject ? options.subject : '',
						from_email: fromEmail,
						to: toEmailArray,
						important: options.important ? options.important : false,
						track_opens: options.trackOpens ? options.trackOpens : false,
						track_clicks: options.trackClicks ? options.trackClicks : false,
						auto_text: options.autoText ? options.autoText : false,
						auto_html: options.autoHtml ? options.autoHtml : false,
						inline_css: options.inlineCss ? options.inlineCss : false,
						url_strip_qs: options.urlStripQs ? options.urlStripQs : false,
						preserve_recipients: options.preserveRecipients ? options.preserveRecipients : false,
						view_content_link: options.viewContentLink ? options.viewContentLink : false,
						async: options.async ? options.async : false,
						google_analytics_campaign: options.googleAnalyticsCampaign
							? options.googleAnalyticsCampaign
							: '',
						ip_pool: options.ipPool ? options.ipPool : '',
						bcc_address: options.bccAddress ? options.bccAddress : '',
						tracking_domain: options.trackingDomain ? options.trackingDomain : '',
						signing_domain: options.signingDomain ? options.signingDomain : '',
						return_path_domain: options.returnPathDomain ? options.returnPathDomain : '',
					};

					if (options.googleAnalyticsDomains) {
						message.google_analytics_domains = getGoogleAnalyticsDomainsArray(
							options.googleAnalyticsDomains,
						);
					}

					if (options.tags) {
						message.tags = getTags(options.tags);
					}

					if (options.fromName) {
						message.from_name = options.fromName;
					}

					if (options.subaccount) {
						message.subaccount = options.subaccount;
					}

					const body: Body = {
						template_content: [],
						message,
					};

					if (options.sendAt) {
						body.send_at = moment(options.sendAt).utc().format('YYYY-MM-DD HH:mm:ss');
					}

					if (jsonActive) {
						body.message.headers = validateJSON(this.getNodeParameter('headersJson', i) as string);
						body.message.metadata = validateJSON(
							this.getNodeParameter('metadataJson', i) as string,
						);
						body.message.global_merge_vars = validateJSON(
							this.getNodeParameter('mergeVarsJson', i) as string,
						);
						body.message.attachments = validateJSON(
							this.getNodeParameter('attachmentsJson', i) as string,
						);
					} else {
						const headersUi = this.getNodeParameter('headersUi', i) as IDataObject;
						if (!isEmpty(headersUi)) {
							// @ts-ignore
							body.message.headers = map(headersUi.headersValues, (o) => {
								const aux: IDataObject = {};
								// @ts-ignore
								aux[o.name] = o.value;
								return aux;
							});
						}

						const metadataUi = this.getNodeParameter('metadataUi', i) as IDataObject;
						if (!isEmpty(metadataUi)) {
							// @ts-ignore
							body.message.metadata = map(metadataUi.metadataValues, (o: IDataObject) => {
								const aux: IDataObject = {};
								aux[o.name as string] = o.value;
								return aux;
							});
						}

						const mergeVarsUi = this.getNodeParameter('mergeVarsUi', i) as IDataObject;
						if (!isEmpty(mergeVarsUi)) {
							// @ts-ignore
							body.message.global_merge_vars = map(
								// @ts-ignore
								mergeVarsUi.mergeVarsValues,
								(o: IDataObject) => {
									const aux: IDataObject = {};
									aux.name = o.name;
									aux.content = o.content;
									return aux;
								},
							);
						}

						const attachmentsUi = this.getNodeParameter('attachmentsUi', i) as IDataObject;
						let attachmentsBinary: Attachments[] = [],
							attachmentsValues: Attachments[] = [];
						if (!isEmpty(attachmentsUi)) {
							if (
								attachmentsUi.hasOwnProperty('attachmentsValues') &&
								!isEmpty(attachmentsUi.attachmentsValues)
							) {
								// @ts-ignore
								attachmentsValues = map(attachmentsUi.attachmentsValues, (o: IDataObject) => {
									const aux: IDataObject = {};
									// @ts-ignore
									aux.name = o.name;
									aux.content = o.content;
									aux.type = o.type;
									return aux;
								});
							}

							if (
								attachmentsUi.hasOwnProperty('attachmentsBinary') &&
								!isEmpty(attachmentsUi.attachmentsBinary) &&
								items[i].binary
							) {
								// @ts-ignore
								attachmentsBinary = map(attachmentsUi.attachmentsBinary, (o: IDataObject) => {
									if (items[i].binary!.hasOwnProperty(o.property as string)) {
										const aux: IDataObject = {};
										aux.name = items[i].binary![o.property as string].fileName || 'unknown';
										aux.content = items[i].binary![o.property as string].data;
										aux.type = items[i].binary![o.property as string].mimeType;
										return aux;
									}
								});
							}
						}

						body.message.attachments = attachmentsBinary.concat(attachmentsValues);
					}

					if (operation === 'sendTemplate') {
						const template = this.getNodeParameter('template', i) as string;
						body.template_name = template;
						emailSentResponse = mandrillApiRequest.call(
							this,
							'/messages',
							'POST',
							'/send-template',
							body,
						);
					} else if (operation === 'sendHtml') {
						emailSentResponse = mandrillApiRequest.call(this, '/messages', 'POST', '/send', body);
					}

					responseData = await emailSentResponse;
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
