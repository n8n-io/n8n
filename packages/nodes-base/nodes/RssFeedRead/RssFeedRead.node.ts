import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import * as Parser from 'rss-parser';
import { URL } from 'url';

export class RssFeedRead implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RSS Read',
		name: 'rssFeedRead',
		icon: 'fa:rss',
		group: ['input'],
		version: 1,
		description: 'Reads data from an RSS Feed',
		defaults: {
			name: 'RSS Feed Read',
			color: '#b02020',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'URL of the RSS feed.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: '5',
						description: 'The amount of items to return',
					},
				],
			},
		],
	};



	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;
		const returnData: IDataObject[] = [];
		let itemCount;
		for (let i = 0; i < length; i++) {
			try{
				const url = this.getNodeParameter('url', i) as string;
				const options = this.getNodeParameter('options', i) as IDataObject;

				if (options.limit) {
					itemCount = options.limit as number;
				}

				if (!url) {
					throw new NodeOperationError(this.getNode(), 'The parameter "URL" has to be set!');
				}

				if (!validateURL(url)){
					throw new NodeOperationError(this.getNode(), 'The provided "URL" is not valid!');
				}

				const parser = new Parser();

				let feed: Parser.Output<IDataObject>;
				try {
					feed = await parser.parseURL(url);
				} catch (error) {
					if (error.code === 'ECONNREFUSED') {
						throw new NodeOperationError(this.getNode(), `It was not possible to connect to the URL. Please make sure the URL "${url}" it is valid!`);
					}
					throw new NodeOperationError(this.getNode(), error);
				}

				// For now we just take the items and ignore everything else
				if (feed.items) {
					if (itemCount) {
						feed.items = feed.items.slice(0, itemCount);
					}
					feed.items.forEach((item) => {
						// @ts-ignore
						returnData.push(item);
					});
				}

			} catch (error) {
				if (this.continueOnFail()) {
					return this.prepareOutputData([{json:{ error: error.message }}]);
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

// Utility functionß

function validateURL (url: string) {
	try {
		const parseUrl = new URL(url);
		return true;
	} catch (err) {
		return false;
	}
}
