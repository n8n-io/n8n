import moment from 'moment-timezone';
import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type Parser from 'rss-parser';

import { parseFeedUrl } from './GenericFunctions';

interface PollData {
	lastItemDate?: string;
	lastTimeChecked?: string;
}

export class RssFeedReadTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RSS Feed Trigger',
		name: 'rssFeedReadTrigger',
		icon: 'node:rss-feed-trigger',
		iconColor: 'orange-red',
		group: ['trigger'],
		version: 1,
		description: 'Starts a workflow when an RSS feed is updated',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'RSS Feed Trigger',
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

		let feed: Parser.Output<IDataObject>;
		try {
			feed = await parseFeedUrl(this.helpers, feedUrl);
		} catch (error) {
			const node = this.getNode();
			const message =
				(error as { code?: string }).code === 'ECONNREFUSED'
					? `It was not possible to connect to the URL. Please make sure the URL "${feedUrl}" it is valid!`
					: (error as Error).message;

			// Route HTTP/parse failures through the node's configured error path so users
			// can handle them with "Continue (using error output)" instead of falling through
			// to the global Error Workflow. The engine inspects items with `json.error` and,
			// when `onError === 'continueErrorOutput'`, moves them to the node's error output
			// (see WorkflowExecute.handleNodeErrorOutput).
			if (
				node.onError === 'continueErrorOutput' ||
				node.onError === 'continueRegularOutput' ||
				node.continueOnFail === true
			) {
				return [[{ json: { error: message } }]];
			}

			if ((error as { code?: string }).code === 'ECONNREFUSED') {
				throw new NodeOperationError(node, message);
			}

			throw new NodeOperationError(node, error as Error);
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
