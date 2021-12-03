import {
	INodeProperties,
} from 'n8n-workflow';

import {
	blocks,
} from './Blocks';

export const blockOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'block',
				],
			},
		},
		options: [
			{
				name: 'Append',
				value: 'append',
				description: 'Append a block',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all children blocks',
			},
		],
		default: 'append',
		description: 'The operation to perform.',
	},
];

export const blockFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                block:append                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Block ID',
		name: 'blockId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'block',
				],
				operation: [
					'append',
				],
			},
		},
		description: `The ID of block. A page it is also considered a block. Hence, a Page ID can be used as well.`,
	},
	...blocks('block', 'append'),
	/* -------------------------------------------------------------------------- */
	/*                                block:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Block ID',
		name: 'blockId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'block',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'block',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'block',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
];
