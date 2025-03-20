import type { INodeProperties } from 'n8n-workflow';

import { itemGetAllFieldsPreSend, untilSiteSelected } from '../../helpers/utils';

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
			'The formula will be evaluated for each record. <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">More info</a>.',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		hint: 'If empty, all the items will be returned',
		placeholder: "e.g. fields/Title eq 'item1'",
		routing: {
			send: {
				property: '$filter',
				type: 'query',
				value: '={{ $value ? $value : undefined }}',
			},
		},
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
				property: '$top',
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
						name: 'Content Type',
						value: 'contentType',
					},
					{
						name: 'Created At',
						value: 'createdDateTime',
					},
					{
						name: 'Created By',
						value: 'createdBy',
					},
					{
						name: 'Fields',
						value: 'fields',
					},
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Last Modified At',
						value: 'lastModifiedDateTime',
					},
					{
						name: 'Last Modified By',
						value: 'lastModifiedBy',
					},

					{
						name: 'Parent Reference',
						value: 'parentReference',
					},
					{
						name: 'Web URL',
						value: 'webUrl',
					},
				],
				routing: {
					send: {
						preSend: [itemGetAllFieldsPreSend],
					},
				},
				type: 'multiOptions',
			},
		],
		placeholder: 'Add option',
		type: 'collection',
	},
];
