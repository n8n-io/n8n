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
		displayName: 'Block',
		name: 'blockId',
		type: 'resourceLocator',
		default: { mode: 'url', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder: 'https://www.notion.so/My-Page-b4eeb113e118403ba450af65ac25f0b9',
				validation: [
					{
						type: 'regex',
						properties: {
							regex:
								'(?:https|http)://www.notion.so/(?:[a-z0-9-]{2,}/)?(?:[a-zA-Z0-9-]{2,}-)?([0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12}).*',
							errorMessage: 'Not a valid Notion Block URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex:
						'(?:https|http)://www.notion.so/(?:[a-z0-9-]{2,}/)?(?:[a-zA-Z0-9-]{2,}-)?([0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12})',
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
				validation: [
					{
						type: 'regex',
						properties: {
							regex:
								'^(([0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12})|([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}))[ \t]*',
							errorMessage: 'Not a valid Notion Block ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '^([0-9a-f]{8}-?[0-9a-f]{4}-?4[0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12})',
				},
				url: '=https://www.notion.so/{{$value.replace(/-/g, "")}}',
			},
		],
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['append'],
			},
		},
		description: 'The Notion Block to append blocks to',
	},
	...blocks('block', 'append'),
	/* -------------------------------------------------------------------------- */
	/*                                block:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Block',
		name: 'blockId',
		type: 'resourceLocator',
		default: { mode: 'url', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder: 'https://www.notion.so/My-Page-b4eeb113e118403ba450af65ac25f0b9',
				validation: [
					{
						type: 'regex',
						properties: {
							regex:
								'(?:https|http)://www.notion.so/(?:[a-z0-9-]{2,}/)?(?:[a-zA-Z0-9-]{2,}-)?([0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12}).*',
							errorMessage: 'Not a valid Notion Block URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex:
						'(?:https|http)://www.notion.so/(?:[a-z0-9-]{2,}/)?(?:[a-zA-Z0-9-]{2,}-)?([0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12})',
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
				validation: [
					{
						type: 'regex',
						properties: {
							regex:
								'^(([0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12})|([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}))[ \t]*',
							errorMessage: 'Not a valid Notion Block ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '^([0-9a-f]{8}-?[0-9a-f]{4}-?4[0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12})',
				},
				url: '=https://www.notion.so/{{$value.replace(/-/g, "")}}',
			},
		],
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getAll'],
			},
		},
		description: 'The Notion Block to get all children from',
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
