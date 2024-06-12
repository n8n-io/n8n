import { URL } from 'url';
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import Parser from 'rss-parser';
import { generatePairedItemData } from '../../utils/utilities';

// Utility function

function validateURL(url: string) {
	try {
		new URL(url);
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
		iconColor: 'orange-red',
		group: ['input'],
		version: [1, 1.1],
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
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Ignore SSL Issues',
						name: 'ignoreSSL',
						type: 'boolean',
						default: false,
						description: 'Whether to ignore SSL/TLS certificate issues or not',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const nodeVersion = this.getNode().typeVersion;
		const items = this.getInputData();

		let itemsLength = items.length ? 1 : 0;
		let fallbackPairedItems;

		if (nodeVersion >= 1.1) {
			itemsLength = items.length;
		} else {
			fallbackPairedItems = generatePairedItemData(items.length);
		}

		for (let i = 0; i < itemsLength; i++) {
			try {
				const url = this.getNodeParameter('url', i) as string;
				const options = this.getNodeParameter('options', i);
				const ignoreSSL = Boolean(options.ignoreSSL);

				if (!url) {
					throw new NodeOperationError(this.getNode(), 'The parameter "URL" has to be set!', {
						itemIndex: i,
					});
				}

				if (!validateURL(url)) {
					throw new NodeOperationError(this.getNode(), 'The provided "URL" is not valid!', {
						itemIndex: i,
					});
				}

				const parser = new Parser({
					requestOptions: {
						rejectUnauthorized: !ignoreSSL,
					},
				});

				let feed: Parser.Output<IDataObject>;
				try {
					feed = await parser.parseURL(url);
				} catch (error) {
					if (error.code === 'ECONNREFUSED') {
						throw new NodeOperationError(
							this.getNode(),
							`It was not possible to connect to the URL. Please make sure the URL "${url}" it is valid!`,
							{
								itemIndex: i,
							},
						);
					}

					throw new NodeOperationError(this.getNode(), error as Error, {
						itemIndex: i,
					});
				}

				// For now we just take the items and ignore everything else
				if (feed.items) {
					const feedItems = (feed.items as IDataObject[]).map((item) => ({
						json: item,
					})) as INodeExecutionData[];

					const itemData = fallbackPairedItems || [{ item: i }];

					const executionData = this.helpers.constructExecutionMetaData(feedItems, {
						itemData,
					});

					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: fallbackPairedItems || [{ item: i }],
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
