/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { boardFields, boardOperations } from './board/BoardDescription';
import { columnFields, columnOperations } from './column/ColumnDescription';
import { groupFields, groupOperations } from './group/GroupDescription';
import { itemFields, itemOperations } from './item/ItemDescription';
import { updateFields, updateOperations } from './update/UpdateDescription';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Monday.com',
	name: 'mondayCom',
	// Icon paths resolve relative to the versioned wrapper (MondayCom.node.ts),
	// so point into V2/ to use the refreshed brand icon without touching V1's.
	icon: { light: 'file:V2/mondayCom.svg', dark: 'file:V2/mondayCom.dark.svg' },
	group: ['output'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Monday.com API',
	defaults: {
		name: 'Monday.com',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'mondayComApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['accessToken'],
				},
			},
		},
		{
			name: 'mondayComOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Access Token',
					value: 'accessToken',
				},
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
			],
			default: 'accessToken',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Board', value: 'board' },
				// The value stays 'group' so workflows saved before the rename keep working.
				{ name: 'Board Group', value: 'group' },
				{ name: 'Column', value: 'column' },
				{ name: 'Item', value: 'item' },
				{ name: 'Update', value: 'update' },
			],
			default: 'item',
		},
		...boardOperations,
		...columnOperations,
		...groupOperations,
		...itemOperations,
		...updateOperations,
		...boardFields,
		...columnFields,
		...groupFields,
		...itemFields,
		...updateFields,
	],
};
