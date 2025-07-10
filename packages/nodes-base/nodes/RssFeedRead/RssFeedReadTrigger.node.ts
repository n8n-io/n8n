import moment from 'moment-timezone';
import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import Parser from 'rss-parser';

interface PollData {
	lastItemDate?: string;
	lastTimeChecked?: string;
}

export class RssFeedReadTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RSS Feed Trigger',
		name: 'rssFeedReadTrigger',
		icon: 'fa:rss',
		iconColor: 'orange-red',
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
		outputs: [NodeConnectionTypes.Main],
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
		const pollData = this.getWorkflowStaticData('node') as PollData;
		const feedUrl = this.getNodeParameter('feedUrl') as string;

		const dateToCheck = Date.parse(
			pollData.lastItemDate ?? pollData.lastTimeChecked ?? moment().utc().format(),
		);

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
				if (item.isoDate && Date.parse(item.isoDate) > dateToCheck) {
					returnData.push(item);
				}
			});

			if (feed.items.length) {
				pollData.lastItemDate = feed.items.reduce((a, b) =>
					new Date(a.isoDate!) > new Date(b.isoDate!) ? a : b,
				).isoDate;
			}
		}

		if (Array.isArray(returnData) && returnData.length !== 0) {
			return [this.helpers.returnJsonArray(returnData)];
		}

		return null;
	}
}
