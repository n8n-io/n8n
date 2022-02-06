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
	oneSimpleApiRequest,
} from './GenericFunctions';

export class OneSimpleApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'One Simple API',
		name: 'oneSimpleApi',
		icon: 'file:onesimpleapi.svg',
		group: ['transform'],
		version: 1,
		description: 'A toolbox of no-code utilities',
		defaults: {
			name: 'One Simple API',
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
						name: 'Information',
						value: 'information',
					},
					{
						name: 'Social Profile',
						value: 'socialProfile',
					},
					{
						name: 'Utility',
						value: 'utility',
					},
					{
						name: 'Website',
						value: 'website',
					},
				],
				default: 'website',
				required: true,
			},
			// website
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'website',
						],
					},
				},
				options: [
					{
						name: 'Generate PDF',
						value: 'pdf',
						description: 'Generate a PDF from a webpage',
					},
					{
						name: 'Get SEO Data',
						value: 'seo',
						description: 'Get SEO information from website',
					},
					{
						name: 'Take Screenshot',
						value: 'screenshot',
						description: 'Create a screenshot from a webpage',
					},
				],
				default: 'pdf',
			},
			// socialProfile
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'socialProfile',
						],
					},
				},
				options: [
					{
						name: 'Instagram',
						value: 'instagramProfile',
						description: 'Get details about an Instagram profile',
					},
					{
						name: 'Spotify',
						value: 'spotifyArtistProfile',
						description: 'Get details about a Spotify Artist',
					},
				],
				default: 'instagramProfile',
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
				],
				default: 'exchangeRate',
				description: 'The operation to perform.',
			},
			// Utility
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'utility',
						],
					},
				},
				options: [
					{
						name: 'Expand URL',
						value: 'expandURL',
						description: 'Expand a shortened url',
					},
					{
						name: 'Generate QR Code',
						value: 'qrCode',
						description: 'Generate a QR Code',
					},
					{
						name: 'Validate Email',
						value: 'validateEmail',
						description: 'Validate an email address',
					},
				],
				default: 'validateEmail',
				description: 'The operation to perform.',
			},
			// website: pdf
			{
				displayName: 'Webpage URL',
				name: 'link',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'pdf',
						],
						resource: [
							'website',
						],
					},
				},
				default: '',
				description: 'Link to webpage to convert',
			},
			{
				displayName: 'Download PDF?',
				name: 'download',
				type: 'boolean',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'pdf',
						],
						resource: [
							'website',
						],
					},
				},
				default: false,
				description: 'Whether to download the PDF or return a link to it',
			},
			{
				displayName: 'Put Output In Field',
				name: 'output',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'pdf',
						],
						resource: [
							'website',
						],
						download: [
							true,
						],
					},
				},
				default: 'data',
				description: 'The name of the output field to put the binary file data in',
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
							'website',
						],
						operation: [
							'pdf',
						],
					},
				},
				options: [
					{
						displayName: 'Page Size',
						name: 'page',
						type: 'options',
						options: [
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
							{
								name: 'Legal',
								value: 'Legal',
							},
							{
								name: 'Ledger',
								value: 'Ledger',
							},
							{
								name: 'Letter',
								value: 'Letter',
							},
							{
								name: 'Tabloid',
								value: 'Tabloid',
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
						description: `Normally the API will reuse a previously taken screenshot of the URL to give a faster response.
            This option allows you to retake the screenshot at that exact time, for those times when it's necessary`,
					},
				],
			},
			// website: qrCode
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
							'utility',
						],
					},
				},
				default: '',
				description: 'The text that should be turned into a QR code - like a website URL',
			},
			{
				displayName: 'Download Image?',
				name: 'download',
				type: 'boolean',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'qrCode',
						],
						resource: [
							'utility',
						],
					},
				},
				default: false,
				description: 'Whether to download the QR code or return a link to it',
			},
			{
				displayName: 'Put Output In Field',
				name: 'output',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'qrCode',
						],
						resource: [
							'utility',
						],
						download: [
							true,
						],
					},
				},
				default: 'data',
				description: 'The name of the output field to put the binary file data in',
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
							'utility',
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
						default: 'Small',
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
						default: 'PNG',
						description: 'The QR Code format',
					},
				],
			},
			// website: screenshot
			{
				displayName: 'Webpage URL',
				name: 'link',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'screenshot',
						],
						resource: [
							'website',
						],
					},
				},
				default: '',
				description: 'Link to webpage to convert',
			},
			{
				displayName: 'Download Screenshot?',
				name: 'download',
				type: 'boolean',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'screenshot',
						],
						resource: [
							'website',
						],
					},
				},
				default: false,
				description: 'Whether to download the screenshot or return a link to it',
			},
			{
				displayName: 'Put Output In Field',
				name: 'output',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'screenshot',
						],
						resource: [
							'website',
						],
						download: [
							true,
						],
					},
				},
				default: 'data',
				description: 'The name of the output field to put the binary file data in',
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
							'website',
						],
						operation: [
							'screenshot',
						],
					},
				},
				options: [
					{
						displayName: 'Screen Size',
						name: 'screen',
						type: 'options',
						options: [
							{
								name: 'Phone',
								value: 'phone',
							},
							{
								name: 'Phone Landscape',
								value: 'phone-landscape',
							},
							{
								name: 'Retina',
								value: 'retina',
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
						description: `Normally the API will reuse a previously taken screenshot of the URL to give a faster response.
            This option allows you to retake the screenshot at that exact time, for those times when it's necessary`,
					},
					{
						displayName: 'Full Page',
						name: 'fullpage',
						type: 'boolean',
						default: false,
						description: 'The API takes a screenshot of the viewable area for the desired screen size. If you need a screenshot of the whole length of the page, use this option',
					},
				],
			},
			// socialProfile: instagramProfile
			{
				displayName: 'Profile Name',
				name: 'profileName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'instagramProfile',
						],
						resource: [
							'socialProfile',
						],
					},
				},
				default: '',
				description: 'Profile name to get details of',
			},
			// socialProfile: spotifyArtistProfile
			{
				displayName: 'Artist Name',
				name: 'artistName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'spotifyArtistProfile',
						],
						resource: [
							'socialProfile',
						],
					},
				},
				default: '',
				description: 'Artist name to get details for',
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
				placeholder: 'USD',
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
				placeholder: 'EUR',
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
				displayName: 'Link To Image',
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
			// website: seo
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
							'website',
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
							'website',
						],
						operation: [
							'seo',
						],
					},
				},
				options: [
					{
						displayName: 'Include Headers?',
						name: 'headers',
						type: 'boolean',
						default: false,
						description: '',
					},
				],
			},
			// utility: validateEmail
			{
				displayName: 'Email Address',
				name: 'emailAddress',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'validateEmail',
						],
						resource: [
							'utility',
						],
					},
				},
				default: '',
				description: 'Email Address',
			},
			// utility: expandURL
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
							'utility',
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
		let download;
		for (let i = 0; i < length; i++) {
			try {
				const resource = this.getNodeParameter('resource', 0) as string;
				const operation = this.getNodeParameter('operation', 0) as string;

				if (resource === 'website') {
					if (operation === 'pdf') {
						const link = this.getNodeParameter('link', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						download = this.getNodeParameter('download', i) as boolean;
						qs.url = link;

						if (options.page) {
							qs.page = options.page as string;
						}

						if (options.force) {
							qs.force = 'yes';
						} else {
							qs.force = 'no';
						}

						const response = await oneSimpleApiRequest.call(this, 'GET', '/pdf', {}, qs);

						if (download) {
							const output = this.getNodeParameter('output', i) as string;
							const buffer = await oneSimpleApiRequest.call(this, 'GET', '', {}, {}, response.url, { json: false, encoding: null }) as Buffer;
							responseData = {
								json: response,
								binary: {
									[output]: await this.helpers.prepareBinaryData(buffer),
								},
							};
						} else {
							responseData = response;
						}
					}

					if (operation === 'screenshot') {
						const link = this.getNodeParameter('link', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						download = this.getNodeParameter('download', i) as boolean;

						qs.url = link;

						if (options.screen) {
							qs.screen = options.screen as string;
						}

						if (options.fullpage) {
							qs.fullpage = 'yes';
						} else {
							qs.fullpage = 'no';
						}

						if (options.force) {
							qs.force = 'yes';
						} else {
							qs.force = 'no';
						}

						const response = await oneSimpleApiRequest.call(this, 'GET', '/screenshot', {}, qs);

						if (download) {
							const output = this.getNodeParameter('output', i) as string;
							const buffer = await oneSimpleApiRequest.call(this, 'GET', '', {}, {}, response.url, { json: false, encoding: null }) as Buffer;
							responseData = {
								json: response,
								binary: {
									[output]: await this.helpers.prepareBinaryData(buffer),
								},
							};
						} else {
							responseData = response;
						}
					}

					if (operation === 'seo') {
						const link = this.getNodeParameter('link', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						qs.url = link;

						if (options.headers) {
							qs.headers = 'yes';
						}

						responseData = await oneSimpleApiRequest.call(this, 'GET', '/page_info', {}, qs);
					}
				}

				if (resource === 'socialProfile') {
					if (operation === 'instagramProfile') {
						const profileName = this.getNodeParameter('profileName', i) as string;
						qs.profile = profileName;
						responseData = await oneSimpleApiRequest.call(this, 'GET', '/instagram_profile', {}, qs);
					}

					if (operation === 'spotifyArtistProfile') {
						const artistName = this.getNodeParameter('artistName', i) as string;
						qs.profile = artistName;
						responseData = await oneSimpleApiRequest.call(this, 'GET', '/spotify_profile', {}, qs);
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
				}

				if (resource === 'utility') {
					// validateEmail
					if (operation === 'validateEmail') {
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

					if (operation === 'qrCode') {
						const message = this.getNodeParameter('message', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						download = this.getNodeParameter('download', i) as boolean;

						qs.message = message;

						if (options.size) {
							qs.size = options.size as string;
						}

						if (options.format) {
							qs.format = options.format as string;
						}

						const response = await oneSimpleApiRequest.call(this, 'GET', '/qr_code', {}, qs);

						if (download) {
							const output = this.getNodeParameter('output', i) as string;
							const buffer = await oneSimpleApiRequest.call(this, 'GET', '', {}, {}, response.url, { json: false, encoding: null }) as Buffer;
							responseData = {
								json: response,
								binary: {
									[output]: await this.helpers.prepareBinaryData(buffer),
								},
							};
						} else {
							responseData = response;
						}
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

		if (download) {
			return this.prepareOutputData(returnData as unknown as INodeExecutionData[]);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

