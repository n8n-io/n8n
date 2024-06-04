import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import Parser from 'rss-parser';
import moment from 'moment-timezone';

export class RssFeedReadTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RSS Feed Trigger',
		name: 'rssFeedReadTrigger',
		icon: 'fa:rss',
		group: ['trigger'],
		version: 1,
		description: 'Starts a workflow when an RSS feed is updated',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'RSS Feed Trigger',
			color: '#b02020',
		},
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Feed URL',
				name: 'feedUrl',
				type: 'string',
				default: 'https://blog.n8n.io/rss/',
				required: true,
				description: 'URL of the RSS feed to poll',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const pollData = this.getWorkflowStaticData('node');
		const feedUrl = this.getNodeParameter('feedUrl') as string;

		const now = moment().utc().format();
		const dateToCheck =
			(pollData.lastItemDate as string) || (pollData.lastTimeChecked as string) || now;

		if (!feedUrl) {
			throw new NodeOperationError(this.getNode(), 'The parameter "URL" has to be set!');
		}

		const parser = new Parser();

		let feed: Parser.Output<IDataObject>;
		try {
			feed = await parser.parseURL(feedUrl);
		} catch (error) {
			if (error.code === 'ECONNREFUSED') {
				throw new NodeOperationError(
					this.getNode(),
					`It was not possible to connect to the URL. Please make sure the URL "${feedUrl}" it is valid!`,
				);
			}

			throw new NodeOperationError(this.getNode(), error as Error);
		}

		const returnData: IDataObject[] = [];

		if (feed.items) {
			if (this.getMode() === 'manual') {
				return [this.helpers.returnJsonArray(feed.items[0])];
			}
			feed.items.forEach((item) => {
				if (Date.parse(item.isoDate as string) > Date.parse(dateToCheck)) {
					returnData.push(item);
				}
			});
			const maxIsoDate = feed.items.reduce((a, b) =>
				new Date(a.isoDate as string) > new Date(b.isoDate as string) ? a : b,
			).isoDate;
			pollData.lastItemDate = maxIsoDate;
		}

		if (Array.isArray(returnData) && returnData.length !== 0) {
			return [this.helpers.returnJsonArray(returnData)];
		}

		return null;
	}
}
