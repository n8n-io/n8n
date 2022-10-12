import { INodeProperties } from 'n8n-workflow';

import { blocks } from './Blocks';

export const blockOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['block'],
			},
		},
		options: [
			{
				name: 'Append After',
				value: 'append',
				description: 'Append a block',
				action: 'Append a block',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-get-many
				name: 'Get Child Blocks',
				value: 'getAll',
				description: 'Get many child blocks',
				action: 'Get many child blocks',
			},
		],
		default: 'append',
	},
];

export const blockFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                block:append                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Block ID or Link',
		name: 'blockId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['append'],
			},
		},
		description:
			"The Block URL from Notion's 'copy link' functionality (or just the ID contained within the URL). Pages are also blocks, so you can use a page URL/ID here too.",
	},
	...blocks('block', 'append'),
	/* -------------------------------------------------------------------------- */
	/*                                block:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Block ID or Link',
		name: 'blockId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getAll'],
			},
		},
		description:
			"The Block URL from Notion's 'copy link' functionality (or just the ID contained within the URL). Pages are also blocks, so you can use a page URL/ID here too.",
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
