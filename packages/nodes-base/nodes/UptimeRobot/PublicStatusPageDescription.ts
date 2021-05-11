import { INodeProperties } from 'n8n-workflow';

export const publicStatusPageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'psp',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const publicStatusPageFields = [
	/* -------------------------------------------------------------------------- */
	/*                            publicStatusPage:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Friendly Name',
		name: 'friendly_name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'psp',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The friendly name of the status page.',
	},
	{
		displayName: 'Monitors',
		name: 'monitors',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'psp',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Specify monitor IDs to be displayed in status page (the values are separated with a dash (-) or 0 for all monitors).',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'psp',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Custom Domain',
				name: 'custom_domain',
				type: 'string',
				default: '',
				description: 'The domain or subdomain that the status page will run on.',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'The password for the status page.',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				default: '',
				options: [
					{
						name: 'friendly name (a-z)',
						value: 1,
					},
					{
						name: 'friendly name (z-a)',
						value: 2,
					},
					{
						name: 'status (up-down-paused)',
						value: 3,
					},
					{
						name: 'status (down-up-paused)',
						value: 4,
					},
				],
				description: 'The sorting of the status page',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                            publicStatusPage:delete                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'psp',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'The ID of the public status page.',
	},
	/* -------------------------------------------------------------------------- */
	/*                            publicStatusPage:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'psp',
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
					'psp',
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'psp',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Public Status Pages',
				name: 'psps',
				type: 'string',
				default: '',
				description: 'Specify public status pages IDs separated with dash, e.g. 236-1782-4790.',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'Defines the record to start paginating.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                            publicStatusPage:update                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'psp',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The ID of the public status page.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'psp',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Custom Domain',
				name: 'custom_domain',
				type: 'string',
				default: '',
				description: 'The domain or subdomain that the status page will run on.',
			},
			{
				displayName: 'Friendly Name',
				name: 'friendly_name',
				type: 'string',
				default: '',
				description: 'The friendly name of the status page.',
			},
			{
				displayName: 'Monitors',
				name: 'monitors',
				type: 'string',
				default: '',
				description: 'Specify monitor IDs to be displayed in status page (the values are separated with a dash (-) or 0 for all monitors).',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'The password for the status page.',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				default: '',
				options: [
					{
						name: 'friendly name (a-z)',
						value: 1,
					},
					{
						name: 'friendly name (z-a)',
						value: 2,
					},
					{
						name: 'status (up-down-paused)',
						value: 3,
					},
					{
						name: 'status (down-up-paused)',
						value: 4,
					},
				],
				description: 'The sorting of the status page',
			},
		],
	},
] as INodeProperties[];
