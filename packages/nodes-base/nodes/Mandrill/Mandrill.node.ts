import {
	BINARY_ENCODING,
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
import { mandrillApiRequest, getToEmailArray } from './GenericFunctions';

export class Mandrill implements INodeType {

    // TODO
        
    /*
        https://mandrillapp.com/api/docs/messages.JSON.html#method=send-template
        
        1 - add url strip qs support
        2 - add subaccount support
        3 - add bcc address support
        4 - add google analytics campaign support
        5 - add tracking domain support
        6 - add signing domain support
        7 - add return path domainsupport
        8 - add ip pool support
        9 - add return path domain support
        10 - add tags support
        11 - add google analytics domains support
        12 - add attachments support
        13 - add metadata support
        14 - add ip pool support
        15 - add send at support
        16 - add recipient metadata
    */

	description: INodeTypeDescription = {
		displayName: 'Mandrill',
		name: 'mandrill',
		icon: 'file:mandrill.png',
		group: ['output'],
		version: 1,
		description: 'Sends an email via Mandrill',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
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
                displayName: 'HTML',
                name: 'html',
                type: 'string',
                displayOptions: {
					show: {
						operation: [
							'sendHtml',
						],
					},
				},
                default: '',
                typeOptions: {
					rows: 5,
				},
				options: [],
				required: true,
				description: 'The html you want to send',
            },
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Admin <example@yourdomain.com>',
				description: 'Email address of the sender optional with name.',
			},
			{
				displayName: 'To Email',
				name: 'toEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'info@example.com',
				description: 'Email address of the recipient. Multiple ones can be separated by comma.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
                default: '',
				placeholder: 'My subject line',
				description: 'Subject line of the email.',
			},
			{
				displayName: 'Merge vars',
				name: 'mergeVars',
                type: 'json',
                typeOptions: {
                    alwaysOpenEditWindow: true,
                    rows: 5,                
                },
                default: '',
                placeholder: `mergeVars: [{
                                rcpt: 'example@example.com',
                                vars: [
                                    { name: 'name', content: 'content' }
                                ]
                            }]`,
				description: 'Per-recipient merge variables',
            },
            {
                displayName: 'Important',
				name: 'important',
                type: 'boolean',
				default: false,
				description: 'whether or not this message is important, and should be delivered ahead of non-important messages', 
            },
            {
                displayName: 'Track opens',
				name: 'trackOpens',
                type: 'boolean',
				default: false,
				description: 'whether or not to turn on open tracking for the message', 
            },
            {
                displayName: 'Track clicks',
				name: 'trackClicks',
                type: 'boolean',
				default: false,
				description: 'whether or not to turn on click tracking for the message', 
            },
            {
                displayName: 'Auto text',
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
                displayName: 'Inline css',
				name: 'inlineCss',
                type: 'boolean',
				default: false,
				description: 'whether or not to automatically inline all CSS styles provided in the message HTML - only for HTML documents less than 256KB in size', 
            },
            {
                displayName: 'Url strip qs',
				name: 'urlStripQs',
                type: 'boolean',
				default: false,
				description: 'whether or not to strip the query string from URLs when aggregating tracked URL data', 
            },
            {
                displayName: 'Preserve recipients',
				name: 'preserveRecipients',
                type: 'boolean',
				default: false,
				description: 'whether or not to expose all recipients in to "To" header for each email', 
            },
            {
                displayName: 'View content link',
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
            }
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

        const operation = this.getNodeParameter('operation') as string;
		const fromEmail = this.getNodeParameter('fromEmail') as string;
		const toEmail = this.getNodeParameter('toEmail') as string;
        const subject = this.getNodeParameter('subject') as string;
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
        const toEmailArray = getToEmailArray(toEmail)

		const credentials = this.getCredentials('mandrillApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
        }
        
		const body: IDataObject = {
            message: {
                subject: subject,
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
            }
        };
        
        if (operation === 'sendTemplate') {
            const template = this.getNodeParameter('template') as string;
            body.template_name = template
        } else if (operation === 'sendHtml') {
            const html = this.getNodeParameter('html') as string;
            body.html = html
        }

        let message;
        try {
            message = await mandrillApiRequest.call(this, '/messages', 'POST', '/send', body);
        } catch (err) {
            throw new Error(`Mandrill Error: ${err}`);
        }

		return {
			json: message,
		};
	}
}
