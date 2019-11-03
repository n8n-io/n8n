import {
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
    ILoadOptionsFunctions,
    INodePropertyOptions,
} from 'n8n-workflow';
import { 
    mandrillApiRequest, 
    getToEmailArray, 
    getGoogleAnalyticsDomainsArray, 
	getTags,
	validateJSON
} from './GenericFunctions';

import * as moment from 'moment';

export class Mandrill implements INodeType {
        
    
    //https://mandrillapp.com/api/docs/messages.JSON.html#method=send-template
    

	description: INodeTypeDescription = {
		displayName: 'Mandrill',
		name: 'mandrill',
		icon: 'file:mandrill.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume mandrill API',
		defaults: {
			name: 'Mandrill',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mandrillApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Messages',
						value: 'messages',
						description: 'API path',
					},
				],
				default: 'messages',
				description: 'Resource to consume',
			},
            {
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'messages',
						],
					},
				},
				options: [
					{
						name: 'Send template',
						value: 'sendTemplate',
						description: 'Send template',
                    },
                    {
						name: 'Send html',
						value: 'sendHtml',
						description: 'Send Html',
					},
				],
				default: 'sendTemplate',
				description: 'The operation to perform.',
			},
            {
                displayName: 'Template',
                name: 'template',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getTemplates',
                },
                displayOptions: {
					show: {
						operation: [
							'sendTemplate',
						],
					},
				},
                default: '',
				options: [],
				required: true,
				description: 'The template you want to send',
            },
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Admin <example@yourdomain.com>',
				description: 'Email address of the sender optional with name.',
				displayOptions: {
					show: {
						operation: [
							'sendHtml', 'sendTemplate'
						],
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
						operation: [
							'sendHtml', 'sendTemplate'
						],
					},
				},
			},
			{
				displayName: 'Binary Data',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				description: '',
				displayOptions: {
					show: {
						jsonParameters: [
							false
						],
						operation: [
							'sendHtml', 'sendTemplate'
						]
					},
				},
			},
			{
				displayName: 'JSON Parameters',
				name: 'jsonParameters',
				type: 'boolean',
				default: false,
				description: '',
				displayOptions: {
					show: {
						operation: [
							'sendHtml', 'sendTemplate'
						]
					},
				},
			},
			{
				displayName: 'Attachments',
				name: 'attachmentsBinary',
				type: 'string',
				default: '',
				description: 'Name of the binary properties which contain data which should be added to email as attachment. Multiple ones can be comma separated.',
				displayOptions: {
					show: {
						binaryData: [
							true
						],
						jsonParameters: [
							false
						],
					},
				},
			},
			{
				displayName: 'Images',
				name: 'imagesBinary',
				type: 'string',
				default: '',
				description: 'Name of the binary properties which contain data which should be added to email as attachment. Multiple ones can be comma separated.',
				displayOptions: {
					show: {
						binaryData: [
							true
						],
						jsonParameters: [
							false
						],
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
						'operation': [
							'sendHtml', 'sendTemplate'
						]
					}
				},
				options: [
					{
						displayName: 'Subject',
						name: 'subject',
						type: 'string',
						default: '',
						placeholder: 'My subject line',
						description: 'Subject line of the email.',
					},
					{
						displayName: 'From name',
						name: 'fromName',
						type: 'string',
						default: '',
						placeholder: 'John Doe',
						description: 'optional from name to be used.',
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
						displayName: 'BCC Address',
						name: 'bccAddress',
						type: 'string',
						default: '',
						placeholder: 'message.bcc_address@example.com',
						description: `an optional address to receive an exact copy of each recipient's email`,
					},
					{
						displayName: 'Tracking Domain',
						name: 'trackingDomain',
						type: 'string',
						default: '',
						placeholder: '',
						description: `a custom domain to use for tracking opens and clicks instead of mandrillapp.com`,
					},
					{
						displayName: 'Signing Domain',
						name: 'signingDomain',
						type: 'string',
						default: '',
						placeholder: '',
						description: `a custom domain to use for SPF/DKIM signing instead of mandrill (for "via" or "on behalf of" in email clients)`,
					},
					{
						displayName: 'Return Path Domain',
						name: 'returnPathDomain',
						type: 'string',
						default: '',
						placeholder: '',
						description: `a custom domain to use for the messages's return-path`,
					},
					{
						displayName: 'Important',
						name: 'important',
						type: 'boolean',
						default: false,
						description: 'whether or not this message is important, and should be delivered ahead of non-important messages',
					},
					{
						displayName: 'Track Opens',
						name: 'trackOpens',
						type: 'boolean',
						default: false,
						description: 'whether or not to turn on open tracking for the message',
					},
					{
						displayName: 'Track Clicks',
						name: 'trackClicks',
						type: 'boolean',
						default: false,
						description: 'whether or not to turn on click tracking for the message',
					},
					{
						displayName: 'Auto Text',
						name: 'autoText',
						type: 'boolean',
						default: false,
						description: 'whether or not to automatically generate a text part for messages that are not given text',
					},
					{
						displayName: 'Auto HTML',
						name: 'autoHtml',
						type: 'boolean',
						default: false,
						description: 'whether or not to automatically generate an HTML part for messages that are not given HTML',
					},
					{
						displayName: 'Inline CSS',
						name: 'inlineCss',
						type: 'boolean',
						default: false,
						description: 'whether or not to automatically inline all CSS styles provided in the message HTML - only for HTML documents less than 256KB in size',
					},
					{
						displayName: 'Url Strip Qs',
						name: 'urlStripQs',
						type: 'boolean',
						default: false,
						description: 'whether or not to strip the query string from URLs when aggregating tracked URL data',
					},
					{
						displayName: 'Preserve Recipients',
						name: 'preserveRecipients',
						type: 'boolean',
						default: false,
						description: 'whether or not to expose all recipients in to "To" header for each email',
					},
					{
						displayName: 'View Content Link',
						name: 'viewContentLink',
						type: 'boolean',
						default: false,
						description: 'set to false to remove content logging for sensitive emails',
					},
					{
						displayName: 'Async',
						name: 'async',
						type: 'boolean',
						default: false,
						description: `enable a background sending mode that is optimized for bulk sending. In async mode, messages/send will immediately return a status of "queued" for every recipient. To handle rejections when sending in async mode, set up a webhook for the 'reject' event. Defaults to false for messages with no more than 10 recipients; messages with more than 10 recipients are always sent asynchronously, regardless of the value of async.`,
					},
					{
						displayName: 'Subaccount',
						name: 'subAccount',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'the unique id of a subaccount for this message - must already exist or will fail with an error',
					},
					{
						displayName: 'Google Analytics Campaign',
						name: 'googleAnalyticsCampaign',
						type: 'string',
						default: '',
						placeholder: '',
						description: `optional string indicating the value to set for the utm_campaign tracking parameter. If this isn't provided the email's from address will be used instead.`,
					},
					{
						displayName: 'Google Analytics Domains',
						name: 'googleAnalyticsDomains',
						type: 'string',
						default: '',
						placeholder: '',
						description: `an array of strings separated by , indicating for which any matching URLs will automatically have Google Analytics parameters appended to their query string automatically.`,
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: '',
						description: `an array of string separated by , to tag the message with. Stats are accumulated using tags, though we only store the first 100 we see, so this should not be unique or change frequently. Tags should be 50 characters or less. Any tags starting with an underscore are reserved for internal use and will cause errors.`,
					},
					{
						displayName: 'Ip Pool',
						name: 'ipPool',
						type: 'string',
						default: '',
						placeholder: '',
						description: `the name of the dedicated ip pool that should be used to send the message. If you do not have any dedicated IPs, this parameter has no effect. If you specify a pool that does not exist, your default pool will be used instead.`,
					},
					{
						displayName: 'Sent At',
						name: 'sendAt',
						type: 'dateTime',
						default: '',
						placeholder: '',
						description: `When this message should be sent as a UTC timestamp in YYYY-MM-DD HH:MM:SS format. If you specify a time in the past, the message will be sent immediately. An additional fee applies for scheduled email, and this feature is only available to accounts with a positive balance.`,
					},
				]
			},
			{
				displayName: 'Merge Vars',
				name: 'mergeVarsJson',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				placeholder: ` 
				[{
					"rcpt": "example@example.com",
					"vars": [
						{ "name": "name", "content": "content" }
					]
				}]`,
				displayOptions: {
					show: {
						jsonParameters: [
							true
						]
					}
				},
				description: 'Per-recipient merge variables',
			},
			{
				displayName: 'Merge Vars',
				name: 'mergeVarsUi',
				placeholder: 'Add Merge Vars',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true
				},
				displayOptions: {
					show: {
						jsonParameters: [
							false
						]
					}
				},
				description: 'Per-recipient merge variables',
				options: [
					{
						name: 'parameter',
						displayName: 'Vars',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: ''
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'aasasas'
							}
						]
					}
				]
			},
			{
				displayName: 'Metadata',
				name: 'metadataUi',
				placeholder: 'Add Metadata',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true
				},
				displayOptions: {
					show: {
						jsonParameters: [
							false
						]
					}
				},
				description: 'metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.',
				options: [
					{
						name: 'parameter',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: ''
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'aasasas'
							}
						]
					}
				]
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
						jsonParameters: [
							true
						]
					}
				},
				default: '',
				placeholder: `
				{
					"website": "www.example.com"
				}`,
				description: 'Metadata an associative array of user metadata. Mandrill will store this metadata and make it available for retrieval. In addition, you can select up to 10 metadata fields to index and make searchable using the Mandrill search api.',
			},
			{
				displayName: 'Recipient Metadata',
				name: 'recipientMetadata',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [
							true
						]
					}
				},
				default: '',
				placeholder: ` [
					{
						"rcpt": "recipient.email@example.com",
						"values": {
							"user_id": 123456
						}
					}
				]`,
				description: 'Per-recipient metadata that will override the global values specified in the metadata parameter.',
			},
			{
				displayName: 'Recipient Metadata',
				name: 'recipientMetadataUi',
				placeholder: 'Add Recipient Metatada',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true
				},
				options: [
					{
						name: 'parameter',
						displayName: 'Values',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: ''
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'aasasas'
							}
						]
					}
				],
				displayOptions: {
					show: {
						jsonParameters: [
							false
						]
					}
				},
				default: '',
				description: 'Per-recipient metadata that will override the global values specified in the metadata parameter.',
			},
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [
							true
						]
					}
				},
				default: '',
				placeholder: `  [
					{
						"type": "text/plain" (the MIME type of the attachment),
						"name": "myfile.txt" (the file name of the attachment),
						"content": "ZXhhbXBsZSBmaWxl" (the content of the attachment as a base64-encoded string)
					}
				],`,
				description: 'an array of supported attachments to add to the message',
			},
			{
				displayName: 'Attachments',
				name: 'attachmentsUi',
				placeholder: 'Add Attachments',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true
				},
				displayOptions: {
					show: {
						jsonParameters: [
							false
						]
					}
				},
				options: [
					{
						name: 'parameter',
						displayName: 'Values',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'string',
								default: '',
								description: 'text/plain (the MIME type of the attachment)'
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'myfile.txt (the file name of the attachment)'
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								default: '',
								description: 'ZXhhbXBsZSBmaWxl (the content of the attachment as a base64-encoded string)'
							}
						]
					}
				],
				default: '',
				description: 'an array of supported attachments to add to the message',
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'json',
				default: '',
				placeholder: `
				{
					"Reply-To": "replies@example.com"
				},
				`,
				displayOptions: {
					show: {
						jsonParameters: [
							true
						]
					}
				},
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'optional extra headers to add to the message (most headers are allowed)',
			},
			{
				displayName: 'Headers',
				name: 'headersUi',
				placeholder: 'Add Headers',
				type: 'fixedCollection',
				default: '',
				displayOptions: {
					show: {
						jsonParameters: [
							false
						]
					}
				},
				options: [
					{
						name: 'parameter',
						displayName: 'Values',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: ''
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: ''
							}
						]
					}
				],
				description: 'optional extra headers to add to the message (most headers are allowed)',
			},
			{
				displayName: 'Images',
				name: 'images',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						jsonParameters: [
							true
						]
					}
				},
				default: '',
				placeholder: `  [
					{
						"type": "image/png" (the MIME type of the image - must start with "image/"),
						"name": "IMAGECID" (the Content ID of the image - use <img src="cid:THIS_VALUE"> to reference the image in your HTML content),
						"content": "ZXhhbXBsZSBmaWxl" (the content of the image as a base64-encoded string)
					}
				]`,
				description: 'an array of embedded images to add to the message',
			},
			{
				displayName: 'Images',
				name: 'images',
				placeholder: 'Add images',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						jsonParameters: [
							false
						]
					}
				},
				typeOptions: {
					multipleValues: true
				},
				default: '',
				options: [
					{
						name: 'parameter',
						displayName: 'Values',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'string',
								default: '',
								description: 'text/plain (the MIME type of the attachment)'
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'myfile.txt (the file name of the attachment)'
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								default: '',
								description: 'ZXhhbXBsZSBmaWxl (the content of the attachment as a base64-encoded string)'
							}
						]
					}
				],
				description: 'an array of embedded images to add to the message',
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
				} catch (err) {
					throw new Error(`Mandrill Error: ${err}`);
				}
				for (const template of templates) {
                    const templateName = template.name;
                    const templateSlug = template.slug
                    
					returnData.push({
						name: templateName,
						value: templateSlug,
					});
                }

				return returnData;
			}
		},
	};


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {

		let response;
        const resource = this.getNodeParameter('resource') as string;
		
		if (resource === 'messages') {

			const operation = this.getNodeParameter('operation') as string;
			const fromEmail = this.getNodeParameter('fromEmail') as string;
			const toEmail = this.getNodeParameter('toEmail') as string;
			const subject = this.getNodeParameter('subject') as string;
			const fromName = this.getNodeParameter('fromName') as string;
			const important = this.getNodeParameter('important') as boolean;
			const trackOpens = this.getNodeParameter('trackOpens') as boolean;
			const trackClicks = this.getNodeParameter('trackClicks') as boolean;
			const autoText = this.getNodeParameter('autoText') as boolean;
			const autoHtml = this.getNodeParameter('autoHtml') as boolean;
			const inlineCss = this.getNodeParameter('inlineCss') as boolean;
			const urlStripQs = this.getNodeParameter('urlStripQs') as boolean;
			const preserveRecipients = this.getNodeParameter('preserveRecipients') as boolean;
			const viewContentLink = this.getNodeParameter('viewContentLink') as boolean;
			const async = this.getNodeParameter('async') as boolean;
			const subAccount = this.getNodeParameter('subAccount') as string;
			const googleAnalyticsCampaign = this.getNodeParameter('googleAnalyticsCampaign') as string;
			const googleAnalyticsDomains = this.getNodeParameter('googleAnalyticsDomains') as string;
			const tags = this.getNodeParameter('tags') as string;
			const ipPool = this.getNodeParameter('ipPool') as string;
			const bccAddress = this.getNodeParameter('bccAddress') as string;
			const trackingDomain = this.getNodeParameter('trackingDomain') as string;
			const signingDomain = this.getNodeParameter('signingDomain') as string;
			const returnPathDomain = this.getNodeParameter('returnPathDomain') as string;
			const html = this.getNodeParameter('html') as string;
			const text = this.getNodeParameter('text') as string;
			const sendAt = moment(this.getNodeParameter('sendAt') as string).utc().format('YYYY-MM-DD HH:mm:ss');
			const headers = validateJSON(this.getNodeParameter('headers') as string);
			const recipientMetadata = validateJSON(this.getNodeParameter('recipientMetadata') as string);
			const attachments = validateJSON(this.getNodeParameter('attachments') as string);
			const images = validateJSON(this.getNodeParameter('images') as string);
			const mergeVars = validateJSON(this.getNodeParameter('mergeVars') as string);
			const metadata = validateJSON(this.getNodeParameter('metadata') as string);

			const toEmailArray = getToEmailArray(toEmail)
			const googleAnalyticsDomainsArray = getGoogleAnalyticsDomainsArray(googleAnalyticsDomains)
			const tagsArray = getTags(tags)
	
			const credentials = this.getCredentials('mandrillApi');
	
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}
			
			const body: IDataObject = {
				template_content: [],
				message: {
					html: html,
					text: text,
					subject: subject,
					from_name: fromName,
					from_email: fromEmail,
					to: toEmailArray,
					important: important,
					track_opens: trackOpens,
					track_clicks: trackClicks,
					auto_text: autoText,
					auto_html: autoHtml,
					inline_css: inlineCss,
					url_strip_qs: urlStripQs,
					preserve_recipients: preserveRecipients,
					view_content_link: viewContentLink,
					async: async,
					subaccount: subAccount || null,
					google_analytics_campaign: googleAnalyticsCampaign,
					google_analytics_domains: googleAnalyticsDomainsArray,
					tags: tagsArray,
					ip_pool: ipPool,
					bcc_address: bccAddress,
					tracking_domain: trackingDomain,
					signing_domain: signingDomain,
					return_path_domain: returnPathDomain,
					recipient_metadata: recipientMetadata,
					headers: headers,
					metadata: metadata,
					merge_vars: mergeVars,
					attachments: attachments,
					images: images
				},
				send_at: (sendAt === 'Invalid date' ) ? moment().utc().format('YYYY-MM-DD HH:mm:ss'): sendAt,
			};
	
			let message
			
			if (operation === 'sendTemplate') {
				const template = this.getNodeParameter('template') as string;
				body.template_name = template
				message = mandrillApiRequest.call(this, '/messages', 'POST', '/send-template', body);
			} else if (operation === 'sendHtml') {
				message = mandrillApiRequest.call(this, '/messages', 'POST', '/send', body);
			}
	
			try {
				response = await message
			} catch (err) {
				throw new Error(`Mandrill Error: ${err}`);
			}
		}

		return {
			json: response,
		};
	}
}
