/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as asset from './asset';
import * as base from './base';
import * as link from './link';
import * as row from './row';

export const versionDescription: INodeTypeDescription = {
	displayName: 'SeaTable',
	name: 'seaTable',
	icon: 'file:seaTable.svg',
	group: ['output'],
	version: 2,
	subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
	description: 'Consume the SeaTable API',
	defaults: {
		name: 'SeaTable',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'seaTableApi',
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
					name: 'Row',
					value: 'row',
				},
				{
					name: 'Base',
					value: 'base',
				},
				{
					name: 'Link',
					value: 'link',
				},
				{
					name: 'Asset',
					value: 'asset',
				},
			],
			default: 'row',
		},
		...row.descriptions,
		...base.descriptions,
		...link.descriptions,
		...asset.descriptions,
	],
};
