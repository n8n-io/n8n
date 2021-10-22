import { WSA_E_CANCELLED } from 'constants';
import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';
import { quickbaseApiRequest } from '../QuickBase/GenericFunctions';

import {
	oneSimpleApiRequest,
} from './GenericFunctions';

export class OneSimpleApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'One Simple API',
		name: 'oneSimpleApi',
		icon: 'file:onesimpleapi.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume One Simple API',
		defaults: {
			name: 'One Simple API',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'oneSimpleApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Generation',
						value: 'generation',
					},
					{
						name: 'Information',
						value: 'information',
					},
					{
						name: 'Utilities',
						value: 'utilities',
					},
				],
				default: 'generation',
				required: true,
				description: 'Resource to consume',
			},
			// Generation
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'generation',
						],
					},
				},
				options: [
					{
						name: 'PDF',
						value: 'pdf',
						description: 'Generate a PDF from a webpage',
					},
					{
						name: 'QR Code',
						value: 'qrCode',
						description: 'Generate a QR Code',
					},
					{
						name: 'Screenshot',
						value: 'screenshot',
						description: 'Create a screenshot from a webpage',
					},
				],
				default: 'pdf',
				description: 'The operation to perform.',
			},
			// Information
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'information',
						],
					},
				},
				options: [
					{
						name: 'Exchange Rate',
						value: 'exchangeRate',
						description: 'Convert a value between currencies',
					},
					{
						name: 'Image Metadata',
						value: 'imageMetadata',
						description: 'Retrieve image metadata from a URL',
					},
					{
						name: 'SEO',
						value: 'seo',
						description: 'Get SEO information of a page',
					},
				],
				default: 'exchangeRate',
				description: 'The operation to perform.',
			},
			// Utilities
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'utilities',
						],
					},
				},
				options: [
					{
						name: 'Email Validation',
						value: 'emailValidation',
						description: 'Validate an email address',
					},
					{
						name: 'Expand URL',
						value: 'expandURL',
						description: 'Expand a shortened url',
					},
				],
				default: 'emailValidation',
				description: 'The operation to perform.',
			},
			// generation: pdf
			{
				displayName: 'Page to convert',
				name: 'link',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'pdf',
						],
						resource: [
							'generation',
						],
					},
				},
				default: '',
				description: 'Link to webpage to convert',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'generation',
						],
						operation: [
							'pdf',
						],
					},
				},
				options: [
					{
						displayName: 'Page size',
						name: 'page',
						type: 'options',
						options: [
							{
								name: 'Letter',
								value: 'Letter',
							},
							{
								name: 'Legal',
								value: 'Legal',
							},
							{
								name: 'Tabloid',
								value: 'Tabloid',
							},
							{
								name: 'Ledger',
								value: 'Ledger',
							},
							{
								name: 'A0',
								value: 'A0',
							},
							{
								name: 'A1',
								value: 'A1',
							},
							{
								name: 'A2',
								value: 'A2',
							},
							{
								name: 'A3',
								value: 'A3',
							},
							{
								name: 'A4',
								value: 'A4',
							},
							{
								name: 'A5',
								value: 'A5',
							},
							{
								name: 'A6',
								value: 'A6',
							},
						],
						default: '',
						description: 'The page size',
					},
					{
						displayName: 'Force Refresh',
						name: 'force',
						type: 'boolean',
						default: false,
						description: '',
					},
				],
			},
			// generation: qrCode
			{
				displayName: 'QR Content',
				name: 'message',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'qrCode',
						],
						resource: [
							'generation',
						],
					},
				},
				default: '',
				description: 'Content of the QR Code',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'generation',
						],
						operation: [
							'qrCode',
						],
					},
				},
				options: [
					{
						displayName: 'Size',
						name: 'size',
						type: 'options',
						options: [
							{
								name: 'Small',
								value: 'Small',
							},
							{
								name: 'Medium',
								value: 'Medium',
							},
							{
								name: 'Large',
								value: 'Large',
							},
						],
						default: '',
						description: 'The QR Code size',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{
								name: 'PNG',
								value: 'PNG',
							},
							{
								name: 'SVG',
								value: 'SVG',
							},
						],
						default: '',
						description: 'The QR Code format',
					},
				],
			},
			// generation: screenshot
			{
				displayName: 'Page to convert',
				name: 'link',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'screenshot',
						],
						resource: [
							'generation',
						],
					},
				},
				default: '',
				description: 'Link to webpage to convert',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'generation',
						],
						operation: [
							'screenshot',
						],
					},
				},
				options: [
					{
						displayName: 'Screen size',
						name: 'screen',
						type: 'options',
						options: [
							{
								name: 'Retina',
								value: 'retina',
							},
							{
								name: 'Phone',
								value: 'phone',
							},
							{
								name: 'Phone Landscape',
								value: 'phone-landscape',
							},
							{
								name: 'Tablet',
								value: 'tablet',
							},
							{
								name: 'Tablet Landscape',
								value: 'tablet-landscape',
							},
						],
						default: '',
						description: 'The screen size',
					},
					{
						displayName: 'Force Refresh',
						name: 'force',
						type: 'boolean',
						default: false,
						description: '',
					},
					{
						displayName: 'Full Page',
						name: 'page',
						type: 'boolean',
						default: false,
						description: '',
					},
				],
			},
			// information: exchangeRate
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'exchangeRate',
						],
						resource: [
							'information',
						],
					},
				},
				default: '',
				description: 'Value to convert',
			},
			{
				displayName: 'From Currency',
				name: 'fromCurrency',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'exchangeRate',
						],
						resource: [
							'information',
						],
					},
				},
				default: '',
				description: 'From Currency',
			},
			{
				displayName: 'To Currency',
				name: 'toCurrency',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'exchangeRate',
						],
						resource: [
							'information',
						],
					},
				},
				default: '',
				description: 'To Currency',
			},
			// information: imageMetadata
			{
				displayName: 'Link to image',
				name: 'link',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'imageMetadata',
						],
						resource: [
							'information',
						],
					},
				},
				default: '',
				description: 'Image to get metadata from',
			},
			// information: seo
			{
				displayName: 'Webpage URL',
				name: 'link',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'seo',
						],
						resource: [
							'information',
						],
					},
				},
				default: '',
				description: 'Webpage to get SEO information for',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'information',
						],
						operation: [
							'seo',
						],
					},
				},
				options: [
					{
						displayName: 'Include Headers',
						name: 'headers',
						type: 'boolean',
						default: false,
						description: '',
					},
				],
			},
			// utilities: emailValidation
			{
				displayName: 'Email Address',
				name: 'emailAddress',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'emailValidation',
						],
						resource: [
							'utilities',
						],
					},
				},
				default: '',
				description: 'Email Address',
			},
			// utilities: expandURL
			{
				displayName: 'URL',
				name: 'link',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'expandURL',
						],
						resource: [
							'utilities',
						],
					},
				},
				default: '',
				description: 'URL to unshorten',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		for (let i = 0; i < length; i++) {
			try {
				const resource = this.getNodeParameter('resource', 0) as string;
				const operation = this.getNodeParameter('operation', 0) as string;

				if (resource === 'generation') {
					if (operation === 'pdf') {
						const link = this.getNodeParameter('link', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						qs.url = link;

						if (options.page) {
							qs.page = options.page as string;
						}

						if (options.force) {
							qs.force = 'Yes';
						} else {
							qs.force = 'No';
						}

						responseData = await oneSimpleApiRequest.call(this, 'GET', '/pdf', {}, qs);
					}

					if (operation === 'qrCode') {
						const message = this.getNodeParameter('message', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						qs.message = message;

						if (options.size) {
							qs.size = options.size as string;
						}

						if (options.format) {
							qs.format = options.format as string;
						}

						responseData = await oneSimpleApiRequest.call(this, 'GET', '/qr_code', {}, qs);
					}

					if (operation === 'screenshot') {
						const link = this.getNodeParameter('link', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						qs.url = link;

						if (options.screen) {
							qs.screen = options.screen as string;
						}

						if (options.full) {
							qs.full = 'Yes';
						} else {
							qs.full = 'No';
						}

						if (options.force) {
							qs.force = 'Yes';
						} else {
							qs.force = 'No';
						}

						responseData = await oneSimpleApiRequest.call(this, 'GET', '/screenshot', {}, qs);
					}
				}

				if (resource === 'information') {
					if (operation === 'exchangeRate') {
						const value = this.getNodeParameter('value', i) as string;
						const fromCurrency = this.getNodeParameter('fromCurrency', i) as string;
						const toCurrency = this.getNodeParameter('toCurrency', i) as string;
						qs.from_currency = fromCurrency;
						qs.to_currency = toCurrency;
						qs.from_value = value;
						responseData = await oneSimpleApiRequest.call(this, 'GET', '/exchange_rate', {}, qs);
					}

					if (operation === 'imageMetadata') {
						const link = this.getNodeParameter('link', i) as string;
						qs.url = link;
						qs.raw = true;
						responseData = await oneSimpleApiRequest.call(this, 'GET', '/image_info', {}, qs);
					}

					if (operation === 'seo') {
						const link = this.getNodeParameter('link', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						qs.url = link;

						if (options.headers) {
							qs.headers = 'Yes';
						}

						responseData = await oneSimpleApiRequest.call(this, 'GET', '/page_info', {}, qs);
					}

				}

				if (resource === 'utilities') {
					// emailValidation
					if (operation === 'emailValidation') {
						const emailAddress = this.getNodeParameter('emailAddress', i) as string;
						qs.email = emailAddress;
						responseData = await oneSimpleApiRequest.call(this, 'GET', '/email', {}, qs);
					}
					// expandURL
					if (operation === 'expandURL') {
						const url = this.getNodeParameter('link', i) as string;
						qs.url = url;
						responseData = await oneSimpleApiRequest.call(this, 'GET', '/unshorten', {}, qs);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
