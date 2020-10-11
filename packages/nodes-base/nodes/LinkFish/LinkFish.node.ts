import { IExecuteSingleFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class LinkFish implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'link.fish Scrape',
		name: 'linkFish',
		icon: 'file:linkfish.png',
		group: ['input'],
		version: 1,
		description: 'Scrape data from an URL',
		defaults: {
			name: 'link.fish Scrape',
			color: '#33AA22',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'linkFishApi',
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
						name: 'All Data',
						value: 'data',
						description: 'Get all found data',
					},
					{
						name: 'Apps',
						value: 'apps',
						description: 'Get mobile app information',
					},
					{
						name: 'Social Media',
						value: 'socialMedia',
						description: 'Get social-media profiles',
					},
					{
						name: 'Screenshot',
						value: 'screenshot',
						description: 'Get screenshot',
					},
				],
				default: 'data',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'URL of which the data should be extracted.',

			},

			// ----------------------------------
			//         data
			// ----------------------------------
			{
				displayName: 'Item Format',
				name: 'itemFormat',
				type: 'options',
				options: [
					{
						name: 'Normal',
						value: 'normal'
					},
					{
						name: 'Flat',
						value: 'flat'
					},
				],
				default: 'flat',
				displayOptions: {
					show: {
						operation: [
							'data'
						],
					},
				},
				description: 'If data should be returned in the "normal"<br />format or in the "flat" one which has all<br />items on one level.',
			},
			{
				displayName: 'Simplify Types',
				name: 'simplifySpecialTypes',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: [
							'data'
						],
					},
				},
				description: 'If special types like "ParameterValue"<br />should be simplified to a key -> value pair.',
			},

			// ----------------------------------
			//         screenshot
			// ----------------------------------
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Normal',
						value: 'normal',
						description: 'Creates a screenshot in 16:9 format.',
					},
					{
						name: 'Full',
						value: 'full',
						description: 'Creates a full page screenshot.',
					},
				],
				default: 'normal',
				displayOptions: {
					show: {
						operation: [
							'screenshot'
						],
					},
				},
				description: 'The file format the screenshot should be returned as.',
			},
			{
				displayName: 'File Format',
				name: 'fileFormat',
				type: 'options',
				options: [
					{
						name: 'JPG',
						value: 'jpg',
					},
					{
						name: 'PNG',
						value: 'png',
					},
				],
				default: 'jpg',
				displayOptions: {
					show: {
						operation: [
							'screenshot'
						],
					},
				},
				description: 'The file format the screenshot should be returned as.',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				typeOptions: {
					minValue: 50,
					maxValue: 1280,
				},
				default: 640,
				displayOptions: {
					show: {
						operation: [
							'screenshot'
						],
					},
				},
				description: 'The width of the screenshot in pixel.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'screenshot',
						],
					},

				},
				placeholder: '',
				description: 'Name of the binary property in which to save<br />the binary data of the screenshot.',
			},

			// ----------------------------------
			//         Multiple ones
			// ----------------------------------
			{
				displayName: 'Browser Render',
				name: 'browserRender',
				type: 'boolean',
				default: false,
				displayOptions: {
					hide: {
						operation: [
							'screenshot'
						],
					},
				},
				description: 'Renders the website in a browser<br />(charges 5 instead of 1 credit!)',
			},
			{
				displayName: 'Return URLs',
				name: 'returnUrls',
				type: 'boolean',
				default: false,
				displayOptions: {
					hide: {
						operation: [
							'data',
							'screenshot',
						],
					},
				},
				description: 'Returns app URLs instead of the identifiers.',
			},
		],
	};


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const url = this.getNodeParameter('url') as string;

		const credentials = this.getCredentials('linkFishApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		let requestMethod = 'GET';

		// For Post
		const body: IDataObject = {
			url,
		};
		// For Query string
		const qs: IDataObject = {};

		let endpoint: string;
		let encoding: string | null = 'utf8';

		const operation = this.getNodeParameter('operation') as string;

		if (operation === 'data') {
			requestMethod = 'POST';

			body.browser_render = this.getNodeParameter('browserRender') as boolean;
			body.item_format = this.getNodeParameter('itemFormat') as string;
			body.simplify_special_types = this.getNodeParameter('simplifySpecialTypes') as boolean;

			endpoint = 'data';
		} else if (operation === 'apps') {
			requestMethod = 'GET';

			qs.browser_render = this.getNodeParameter('browserRender') as boolean;
			qs.return_urls = this.getNodeParameter('returnUrls') as boolean;

			endpoint = 'apps';
		} else if (operation === 'socialMedia') {
			requestMethod = 'GET';

			qs.browser_render = this.getNodeParameter('browserRender') as boolean;
			qs.return_urls = this.getNodeParameter('returnUrls') as boolean;

			endpoint = 'social-media';
		} else if (operation === 'screenshot') {
			requestMethod = 'GET';
			encoding = null;

			qs.file_format = this.getNodeParameter('fileFormat') as string;
			qs.type = this.getNodeParameter('type') as string;
			qs.width = this.getNodeParameter('width') as number;

			endpoint = 'browser-screenshot';
		} else {
			throw new Error(`The operation "${operation}" is not supported!`);
		}

		const options = {
			method: requestMethod,
			body,
			headers: {
				'x-lf-source': 'n8n',
			},
			qs,
			uri: `https://api.link.fish/Urls/${endpoint}`,
			auth: {
				user: credentials.email as string,
				pass: credentials.apiKey as string,
			},
			encoding,
			json: true
		};

		const responseData = await this.helpers.request(options);

		if (operation === 'screenshot') {
			const item = this.getInputData();

			const newItem: INodeExecutionData = {
				json: item.json,
				binary: {},
			};

			if (item.binary !== undefined) {
				// Create a shallow copy of the binary data so that the old
				// data references which do not get changed still stay behind
				// but the incoming data does not get changed.
				Object.assign(newItem.binary, item.binary);
			}

			// Add the returned data to the item as binary property
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName') as string;

			let fileExtension = 'png';
			let mimeType = 'image/png';
			if (qs.file_format === 'jpg') {
				fileExtension = 'jpg';
				mimeType = 'image/jpeg';
			}

			newItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(responseData, `screenshot.${fileExtension}`, mimeType);

			return newItem;
		}

		return {
			json: responseData,
		};
	}
}
