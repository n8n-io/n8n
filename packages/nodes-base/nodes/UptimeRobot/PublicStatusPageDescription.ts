import type { INodeProperties } from 'n8n-workflow';

export const publicStatusPageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['publicStatusPage'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a public status page',
				action: 'Create a public status page',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a public status page',
				action: 'Delete a public status page',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a public status page',
				action: 'Get a public status page',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many public status pages',
				action: 'Get many public status pages',
			},
			// Got deactivated because it did not work reliably. Looks like it is on the UptimeRobot
			// side but we deactivate for now just to be sure
			// {
			// 	name: 'Update',
			// 	value: 'update',
			// 	description: 'Update a public status page',
			// },
		],
		default: 'getAll',
	},
];

export const publicStatusPageFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                            publicStatusPage:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Friendly name',
		name: 'friendlyName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['publicStatusPage'],
				operation: ['create'],
			},
		},
		description: 'The friendly name of the status page',
	},
	{
		displayName: 'Monitor IDs',
		name: 'monitors',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['publicStatusPage'],
				operation: ['create'],
			},
		},
		description:
			'Monitor IDs to be displayed in status page (the values are separated with a dash (-) or 0 for all monitors)',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['publicStatusPage'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Custom domain',
				name: 'custom_domain',
				type: 'string',
				default: '',
				description: 'The domain or subdomain that the status page will run on',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The password for the status page',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Friendly name (A-Z)',
						value: 1,
					},
					{
						name: 'Friendly name (Z-A)',
						value: 2,
					},
					{
						name: 'Status (up-down-paused)',
						value: 3,
					},
					{
						name: 'Status (down-up-paused)',
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
				resource: ['publicStatusPage'],
				operation: ['delete', 'get'],
			},
		},
		description: 'The ID of the public status page',
	},

	/* -------------------------------------------------------------------------- */
	/*                            publicStatusPage:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['publicStatusPage'],
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
				resource: ['publicStatusPage'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['publicStatusPage'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Public status page IDs',
				name: 'psps',
				type: 'string',
				default: '',
				description: 'Public status pages IDs separated with dash, e.g. 236-1782-4790',
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
				resource: ['publicStatusPage'],
				operation: ['update'],
			},
		},
		description: 'The ID of the public status page',
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['publicStatusPage'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Custom domain',
				name: 'custom_domain',
				type: 'string',
				default: '',
				description: 'The domain or subdomain that the status page will run on',
			},
			{
				displayName: 'Friendly name',
				name: 'friendly_name',
				type: 'string',
				default: '',
				description: 'The friendly name of the status page',
			},
			{
				displayName: 'Monitor IDs',
				name: 'monitors',
				type: 'string',
				default: '',
				description:
					'Monitor IDs to be displayed in status page (the values are separated with a dash (-) or 0 for all monitors)',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The password for the status page',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Friendly name (A-Z)',
						value: 1,
					},
					{
						name: 'Friendly name (Z-A)',
						value: 2,
					},
					{
						name: 'Status (up-down-paused)',
						value: 3,
					},
					{
						name: 'Status (down-up-paused)',
						value: 4,
					},
				],
				description: 'The sorting of the status page',
			},
		],
	},
];
