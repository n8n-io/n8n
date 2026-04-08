import type { INodeProperties } from 'n8n-workflow';

import { blocks } from './Blocks';
import {
	blockUrlExtractionRegexp,
	blockUrlValidationRegexp,
	idExtractionRegexp,
	idValidationRegexp,
} from '../constants';

//RLC with fixed regex for blockId
const blockIdRLC: INodeProperties = {
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
			placeholder:
				'e.g. https://www.notion.so/Block-Test-88888ccc303e4f44847f27d24bd7ad8e?pvs=4#c44444444444bbbbb4d32fdfdd84e',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: blockUrlValidationRegexp,
						errorMessage: 'Not a valid Notion Block URL',
					},
				},
			],
			// extractValue: {
			// 	type: 'regex',
			// 	regex: blockUrlExtractionRegexp,
			// },
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. ab1545b247fb49fa92d6f4b49f4d8116',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: idValidationRegexp,
						errorMessage: 'Not a valid Notion Block ID',
					},
				},
			],
		},
	],
	description:
		"The Notion Block to get all children from, when using 'By URL' mode make sure to use the URL of the block itself, you can find it in block parameters in Notion under 'Copy link to block'",
};

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
							regex: blockUrlValidationRegexp,
							errorMessage: 'Not a valid Notion Block URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: blockUrlExtractionRegexp,
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
							regex: idValidationRegexp,
							errorMessage: 'Not a valid Notion Block ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: idExtractionRegexp,
				},
				url: '=https://www.notion.so/{{$value.replace(/-/g, "")}}',
			},
		],
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['append'],
			},
			hide: {
				'@version': [{ _cnd: { gte: 2.2 } }],
			},
		},
		description: 'The Notion Block to append blocks to',
	},
	{
		...blockIdRLC,
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['append'],
				'@version': [{ _cnd: { gte: 2.2 } }],
			},
		},
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
							regex: blockUrlValidationRegexp,
							errorMessage: 'Not a valid Notion Block URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: blockUrlExtractionRegexp,
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
							regex: idValidationRegexp,
							errorMessage: 'Not a valid Notion Block ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: idExtractionRegexp,
				},
				url: '=https://www.notion.so/{{$value.replace(/-/g, "")}}',
			},
		],
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getAll'],
			},
			hide: {
				'@version': [{ _cnd: { gte: 2.2 } }],
			},
		},
		description: 'The Notion Block to get all children from',
	},
	{
		...blockIdRLC,
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getAll'],
				'@version': [{ _cnd: { gte: 2.2 } }],
			},
		},
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
	{
		displayName: 'Also Fetch Nested Blocks',
		name: 'fetchNestedBlocks',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getAll'],
			},
		},
		default: false,
	},
	{
		displayName: 'Simplify Output',
		name: 'simplifyOutput',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['block'],
				operation: ['getAll'],
			},
			hide: {
				'@version': [1, 2],
			},
		},
		default: true,
	},
];
