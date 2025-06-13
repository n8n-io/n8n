/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as item from './Item/Item.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Webflow',
	name: 'webflow',
	icon: 'file:webflow.svg',
	group: ['transform'],
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume the Webflow API',
	version: [2],
	defaults: {
		name: 'Webflow',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'webflowOAuth2Api',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Item',
					value: 'item',
				},
			],
			default: 'item',
		},
		...item.description,
	],
};
