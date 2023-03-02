import type { IExecuteFunctions } from 'n8n-core';
import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import Parser from 'rss-parser';
import { URL } from 'url';

// Utility function

function validateURL(url: string) {
	try {
		const _parseUrl = new URL(url);
		return true;
	} catch (err) {
		return false;
	}
}

export class RssFeedRead implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RSS Read',
		name: 'rssFeedRead',
		icon: 'fa:rss',
		group: ['input'],
		version: 1,
		description: 'Reads data from an RSS Feed',
		defaults: {
			name: 'RSS Read',
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
				description: 'URL of the RSS feed',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		try {
			const url = this.getNodeParameter('url', 0) as string;

			if (!url) {
				throw new NodeOperationError(this.getNode(), 'The parameter "URL" has to be set!');
			}

			if (!validateURL(url)) {
				throw new NodeOperationError(this.getNode(), 'The provided "URL" is not valid!');
			}

			const parser = new Parser();

			let feed: Parser.Output<IDataObject>;
			try {
				feed = await parser.parseURL(url);
			} catch (error) {
				if (error.code === 'ECONNREFUSED') {
					throw new NodeOperationError(
						this.getNode(),
						`It was not possible to connect to the URL. Please make sure the URL "${url}" it is valid!`,
					);
				}

				throw new NodeOperationError(this.getNode(), error as Error);
			}

			const returnData: IDataObject[] = [];

			// For now we just take the items and ignore everything else
			if (feed.items) {
				feed.items.forEach((item) => {
					returnData.push(item);
				});
			}

			return [this.helpers.returnJsonArray(returnData)];
		} catch (error) {
			if (this.continueOnFail()) {
				return this.prepareOutputData([{ json: { error: error.message } }]);
			}
			throw error;
		}
	}
}
