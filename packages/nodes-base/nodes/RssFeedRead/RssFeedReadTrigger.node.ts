import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { parseFeedXml } from './GenericFunctions';

/** Parses the feed XML into one item per entry, oldest first, so the newest is last. */
export async function feedToItems(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const feed = await parseFeedXml(String(response.body));
	return (feed.items ?? [])
		.sort((a, b) => Date.parse(String(a.isoDate ?? '')) - Date.parse(String(b.isoDate ?? '')))
		.map((json) => ({ json }));
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
		trigger: {
			type: 'polling',
			routing: {
				request: {
					method: 'GET',
					url: '={{ $parameter.feedUrl }}',
					headers: { 'User-Agent': 'rss-parser', Accept: 'application/rss+xml' },
					json: false,
					encoding: 'text',
				},
				output: { postReceive: [feedToItems] },
			},
			cursor: { type: 'timestamp', field: 'isoDate' },
		},
	};
}
