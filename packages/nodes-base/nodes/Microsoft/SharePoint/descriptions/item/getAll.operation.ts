import type { INodeProperties } from 'n8n-workflow';

import { untilSiteSelected } from '../../GenericFunctions';

export const properties: INodeProperties[] = [
	{
		displayName: 'Site',
		name: 'site',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the site to retrieve lists from',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getSites',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. mysite',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'List',
		name: 'list',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the list you want to search for items in',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
			hide: {
				...untilSiteSelected,
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLists',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. mylist',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Filter by Formula',
		name: 'filter',
		default: '',
		description:
			'The formula will be evaluated for each record, and if the result is not 0, false, "", NaN, [], or #Error! the record will be included in the response. <a href="https://todo">More info</a>.',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		hint: 'If empty, all the items will be returned',
		placeholder: "e.g. NOT({Name}='Admin')",
		required: true,
		type: 'string',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body?.["@odata.nextLink"] }}',
						request: {
							url: '={{ $response.body?.["@odata.nextLink"] ?? $request.url }}',
							qs: {
								$select:
									'={{ !!$response.body?.["@odata.nextLink"] ? undefined : $request.qs?.$select }}',
							},
						},
					},
				},
			},
		},
		type: 'boolean',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		routing: {
			send: {
				property: 'maxresults',
				type: 'query',
				value: '={{ $value }}',
			},
		},
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		validateType: 'number',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				default: [],
				description: 'The fields you want to include in the output',
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description:
							'Specifies that metadata related to any current or previous Copy Blob operation should be included in the response',
					},
				],
				routing: {
					send: {
						property: 'include',
						type: 'query',
						value: '={{ $value.join(",") || undefined }}',
					},
				},
				type: 'multiOptions',
			},
		],
		placeholder: 'Add option',
		type: 'collection',
	},
];
