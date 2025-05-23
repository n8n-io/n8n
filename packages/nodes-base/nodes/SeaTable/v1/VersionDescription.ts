/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { rowFields, rowOperations } from './RowDescription';

export const versionDescription: INodeTypeDescription = {
	displayName: 'SeaTable',
	name: 'seaTable',
	icon: 'file:seaTable.svg',
	group: ['input'],
	version: 1,
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
			],
			default: 'row',
		},
		...rowOperations,
		...rowFields,
	],
};
