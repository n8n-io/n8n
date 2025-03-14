import type { INodeProperties } from 'n8n-workflow';

import {
	processResponseItems,
	simplifyData,
	validatePartitionKey,
	validateQueryParameters,
} from '../generalFunctions/dataHandling';
import { handleErrorPostReceive } from '../generalFunctions/errorHandling';
import { formatCustomProperties } from '../generalFunctions/helpers';
import { handlePagination } from '../generalFunctions/pagination';
import { presendLimitField } from '../generalFunctions/presendFunctions';

export const itemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new item',
				routing: {
					send: {
						preSend: [formatCustomProperties, validatePartitionKey],
					},
					request: {
						method: 'POST',
						url: '=/colls/{{ $parameter["collId"] }}/docs',
						headers: {
							'x-ms-documentdb-is-upsert': 'True',
						},
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Create item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an existing item',
				routing: {
					send: {
						preSend: [validatePartitionKey],
					},
					request: {
						method: 'DELETE',
						url: '=/colls/{{ $parameter["collId"] }}/docs/{{ $parameter["id"] }}',
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true } }}',
								},
							},
						],
					},
				},
				action: 'Delete item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an item',
				routing: {
					send: {
						preSend: [validatePartitionKey],
					},
					request: {
						method: 'GET',
						url: '=/colls/{{ $parameter["collId"]}}/docs/{{$parameter["id"]}}',
						headers: {
							'x-ms-documentdb-is-upsert': 'True',
						},
					},
					output: {
						postReceive: [handleErrorPostReceive, simplifyData],
					},
				},
				action: 'Get item',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of items',
				routing: {
					send: {
						paginate: true,
						preSend: [presendLimitField],
					},
					operations: {
						pagination: handlePagination,
					},
					request: {
						method: 'GET',
						url: '=/colls/{{ $parameter["collId"] }}/docs',
					},
					output: {
						postReceive: [processResponseItems, simplifyData, handleErrorPostReceive],
					},
				},
				action: 'Get many items',
			},
			{
				name: 'Execute Query',
				value: 'query',
				routing: {
					send: {
						preSend: [validateQueryParameters],
					},
					request: {
						method: 'POST',
						url: '=/colls/{{ $parameter["collId"] }}/docs',
						headers: {
							'Content-Type': 'application/query+json',
							'x-ms-documentdb-isquery': 'True',
							'x-ms-documentdb-query-enablecrosspartition': 'True',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Documents',
								},
							},
							handleErrorPostReceive,
							simplifyData,
						],
					},
				},
				action: 'Query items',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing item',
				routing: {
					send: {
						preSend: [formatCustomProperties, validatePartitionKey],
					},
					request: {
						method: 'PUT',
						url: '=/colls/{{ $parameter["collId"] }}/docs/{{ $parameter["id"] }}',
						headers: {
							'Content-Type': 'application/json-patch+json',
						},
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Update item',
			},
		],
		default: 'getAll',
	},
];

export const createFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'containerId',
				type: 'string',
				hint: 'Enter the container Id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The container id must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersContainer',
			},
		],
	},
	{
		displayName: 'Item Contents',
		name: 'customProperties',
		type: 'json',
		default: '{\n\t"id": "replace_with_new_document_id"\n}',
		description: 'The item contents as a JSON object',
		hint: 'The item requires an id and partition key value if a custom key is set',
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
	},
];

export const deleteFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'containerId',
				type: 'string',
				hint: 'Enter the container id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The container id must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersContainer',
			},
		],
	},
	{
		displayName: 'Item',
		name: 'id',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the item to be deleted',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchItems',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'itemId',
				type: 'string',
				hint: 'Enter the item id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The item id must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. AndersenFamily',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Partition Key',
		default: {},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['delete'],
			},
		},
		options: [
			{
				displayName: 'Partition Key',
				name: 'partitionKey',
				type: 'string',
				default: '',
				hint: 'Only required if a custom partition key is set for the container',
			},
		],
	},
];

export const getFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'containerId',
				type: 'string',
				hint: 'Enter the container id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The container id must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersContainer',
			},
		],
	},
	{
		displayName: 'Item',
		name: 'id',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the item to get',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchItems',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'itemId',
				type: 'string',
				hint: 'Enter the item id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The item id must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. AndersenFamily',
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Partition Key',
		default: {},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Partition Key',
				name: 'partitionKey',
				type: 'string',
				default: '',
				hint: 'Only required if a custom partition key is set for the container',
			},
		],
	},
];

export const getAllFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'containerId',
				type: 'string',
				hint: 'Enter the container id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The container id must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersContainer',
			},
		],
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
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		validateType: 'number',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

export const queryFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['query'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'containerId',
				type: 'string',
				hint: 'Enter the container id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The container id must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersContainer',
			},
		],
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'e.g. SELECT id, name FROM c WHERE c.name = $1',
		noDataExpression: true,
		required: true,
		description:
			"The SQL query to execute. Use $1, $2, $3, etc., to reference the 'Query Parameters' set in the options below.",
		typeOptions: {
			editor: 'sqlEditor',
			sqlDialect: 'PostgreSQL',
		},
		hint: 'Consider using query parameters to prevent SQL injection attacks. Add them in the options below.',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['query'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'query',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['query'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add options',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['query'],
			},
		},
		options: [
			{
				name: 'queryOptions',
				displayName: 'Query Options',
				values: [
					{
						displayName: 'Query Parameters',
						name: 'queryParameters',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of values used as query parameters. Use $1, $2, $3, etc., in your query.',
						hint: 'Reference them in your query as $1, $2, $3…',
						placeholder: 'e.g. value1,value2,value3',
					},
				],
			},
		],
	},
];

export const updateFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['update'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'containerId',
				type: 'string',
				hint: 'Enter the container id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The container id must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersContainer',
			},
		],
	},
	{
		displayName: 'Item',
		name: 'id',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: "Select the item's ID",
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['update'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchItems',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'itemId',
				type: 'string',
				hint: 'Enter the item id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The item id must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. AndersenFamily',
			},
		],
	},
	{
		displayName: 'Item Contents',
		name: 'customProperties',
		type: 'json',
		default: '{}',
		description: 'The item contents as a JSON object',
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Partition Key',
		default: {},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Partition Key',
				name: 'partitionKey',
				type: 'string',
				hint: 'Only required if a custom partition key is set for the container',
				default: '',
			},
		],
	},
];

export const itemFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
	...queryFields,
	...updateFields,
];
