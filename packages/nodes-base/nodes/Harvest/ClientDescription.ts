import type { INodeProperties } from 'n8n-workflow';

const resource = ['client'];

export const clientOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource,
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a client',
				action: 'Create a client',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a client',
				action: 'Delete a client',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a client',
				action: 'Get data of a client',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many clients',
				action: 'Get data of all clients',
			},

			{
				name: 'Update',
				value: 'update',
				description: 'Update a client',
				action: 'Update a client',
			},
		],
		default: 'getAll',
	},
];

export const clientFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                client:getAll                               */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource,
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
				resource,
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource,
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether to only return active clients and false to return inactive clients',
			},
			{
				displayName: 'Updated Since',
				name: 'updated_since',
				type: 'dateTime',
				default: '',
				description: 'Only return clients that have been updated since the given date and time',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                client:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource,
			},
		},
		description: 'The ID of the client you are retrieving',
	},

	/* -------------------------------------------------------------------------- */
	/*                                client:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource,
			},
		},
		description: 'The ID of the client you want to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                                client:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The name of the client',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description:
					'A textual representation of the client’s physical address. May include new line characters.',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				description:
					'The currency used by the estimate. If not provided, the client’s currency will be used. See a list of supported currencies',
			},
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'string',
				default: '',
				description: 'Whether the client is active, or archived. Defaults to true.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                client:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource,
			},
		},
		description: 'The ID of the client want to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description:
					'A textual representation of the client’s physical address. May include new line characters.',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				description:
					'The currency used by the estimate. If not provided, the client’s currency will be used. See a list of supported currencies',
			},
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether the client is active, or archived. Defaults to true.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Whether the client is active, or archived. Defaults to true.',
			},
		],
	},
];
