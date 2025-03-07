import type { INodeProperties } from 'n8n-workflow';

import {
	formatCustomProperties,
	handleErrorPostReceive,
	handlePagination,
	presendLimitField,
	processResponseItems,
	validateOperations,
	validatePartitionKey,
	validateQueryParameters,
} from '../GenericFunctions';

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
									value: '={{ { "success": true } }}',
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
						postReceive: [handleErrorPostReceive],
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
						postReceive: [processResponseItems, handleErrorPostReceive],
					},
				},
				action: 'Get many items',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Query items',
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
						},
					},
					output: {
						postReceive: [processResponseItems, handleErrorPostReceive],
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
						preSend: [validateOperations, validatePartitionKey],
					},
					request: {
						method: 'PATCH',
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
		displayName: 'ID',
		name: 'newId',
		type: 'string',
		default: '',
		placeholder: 'e.g. AndersenFamily',
		description: "Item's ID",
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'id',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: 'Custom Properties',
		name: 'customProperties',
		type: 'json',
		default: '{}',
		placeholder: '{ "LastName": "Andersen", "Address": { "State": "WA", "City": "Seattle" } }',
		description: 'User-defined JSON object representing the document properties',
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
		description: "Select the item's ID",
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
				description: 'Specify the partition key for this item',
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
		description: "Select the item's ID",
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
				description: 'Specify the partition key for this item',
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
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['query'],
			},
		},
		placeholder: 'SELECT * FROM c WHERE c.name = @Name',
		routing: {
			send: {
				type: 'body',
				property: 'query',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		required: true,
		default: [],
		placeholder: 'Add Parameter',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['query'],
			},
		},
		options: [
			{
				name: 'parameters',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g., @name',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						placeholder: 'e.g., John',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'parameters',
				value:
					'={{$parameter["parameters"] && $parameter["parameters"].parameters ? $parameter["parameters"].parameters : []}}',
			},
		},
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
		displayName: 'Operations',
		name: 'operations',
		type: 'fixedCollection',
		placeholder: 'Add Operation',
		description: 'Patch operations to apply to the document',
		required: true,
		default: [],
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['update'],
			},
		},
		options: [
			{
				name: 'operations',
				displayName: 'Operation',
				values: [
					{
						displayName: 'Operation',
						name: 'op',
						type: 'options',
						options: [
							{ name: 'Add', value: 'add' },
							{ name: 'Increment', value: 'incr' },
							{ name: 'Move', value: 'move' },
							{ name: 'Remove', value: 'remove' },
							{ name: 'Replace', value: 'replace' },
							{ name: 'Set', value: 'set' },
						],
						default: 'set',
					},
					{
						displayName: 'From Path',
						name: 'from',
						type: 'resourceLocator',
						description: 'Select a field from the list or enter it manually',
						displayOptions: {
							show: {
								op: ['move'],
							},
						},
						default: {
							mode: 'list',
							value: '',
						},
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								typeOptions: {
									searchListMethod: 'getProperties',
									searchable: true,
								},
							},
							{
								displayName: 'By Name',
								name: 'manual',
								type: 'string',
								hint: 'Enter the field name manually',
								placeholder: 'e.g. /Parents/0/FamilyName',
							},
						],
					},
					{
						displayName: 'To Path',
						name: 'toPath',
						type: 'resourceLocator',
						description: 'Select a field from the list or enter it manually',
						displayOptions: {
							show: {
								op: ['move'],
							},
						},
						default: {
							mode: 'list',
							value: '',
						},
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								typeOptions: {
									searchListMethod: 'getProperties',
									searchable: true,
								},
							},
							{
								displayName: 'By Name',
								name: 'manual',
								type: 'string',
								hint: 'Enter the field name manually',
								placeholder: 'e.g. /Parents/0/FamilyName',
							},
						],
					},
					{
						displayName: 'Path',
						name: 'path',
						type: 'resourceLocator',
						description: 'Select a field from the list or enter it manually',
						default: {
							mode: 'list',
							value: '',
						},
						displayOptions: {
							show: {
								op: ['add', 'remove', 'set', 'incr', 'replace'],
							},
						},
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								typeOptions: {
									searchListMethod: 'getProperties',
									searchable: true,
								},
							},
							{
								displayName: 'By Name',
								name: 'manual',
								type: 'string',
								hint: 'Enter the field name manually',
								placeholder: 'e.g. /Parents/0/FamilyName',
							},
						],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								op: ['add', 'set', 'replace', 'incr'],
							},
						},
					},
				],
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
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Partition Key',
				name: 'partitionKey',
				type: 'string',
				default: '',
				description: 'Specify the partition key for this item',
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
