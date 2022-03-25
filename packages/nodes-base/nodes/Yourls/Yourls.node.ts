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
	yourlsApiRequest,
} from './GenericFunctions';

import {
	urlFields,
	urlOperations,
} from './UrlDescription';

export class Yourls implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Yourls',
		name: 'yourls',
		icon: 'file:yourls.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Yourls API',
		defaults: {
			name: 'Yourls',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'yourlsApi',
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
						name: 'URL',
						value: 'url',
					},
				],
				default: 'url',
				description: 'The resource to operate on.',
			},
			...urlOperations,
			...urlFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'url') {
					if (operation === 'shorten') {
						const url = this.getNodeParameter('url', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						qs.url = url;
						qs.action = 'shorturl';
						Object.assign(qs, additionalFields);
						responseData = await yourlsApiRequest.call(this, 'GET', {}, qs);
					}

					if (operation === 'expand') {
						const shortUrl = this.getNodeParameter('shortUrl', i) as string;
						qs.shorturl = shortUrl;
						qs.action = 'expand';
						responseData = await yourlsApiRequest.call(this, 'GET', {}, qs);
					}

					if (operation === 'stats') {
						const shortUrl = this.getNodeParameter('shortUrl', i) as string;
						qs.shorturl = shortUrl;
						qs.action = 'url-stats';
						responseData = await yourlsApiRequest.call(this, 'GET', {}, qs);
						responseData = responseData.link;
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
