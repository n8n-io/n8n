import type { INodeProperties } from 'n8n-workflow';

export const organizationDescription: INodeProperties[] = [
	// ----------------------------------
	//           operations
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['organization'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an organization',
				action: 'Create an organization',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an organization',
				action: 'Delete an organization',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an organization',
				action: 'Get an organization',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many organizations',
				action: 'Get many organizations',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an organization',
				action: 'Update an organization',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Organization Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['organization'],
			},
		},
	},
	{
		displayName: 'Organization ID',
		name: 'id',
		type: 'string',
		description:
			'Organization to update. Specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Organization ID',
		name: 'id',
		type: 'string',
		description:
			'Organization to delete. Specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Organization ID',
		name: 'id',
		type: 'string',
		description:
			'Organization to retrieve. Specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['organization'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Shared',
				name: 'shared',
				type: 'boolean',
				default: false,
				description: 'Whether the organization is shared with other instances',
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'The domain associated with the organization',
			},
			{
				displayName: 'Domain Assignment',
				name: 'domain_assignment',
				type: 'boolean',
				default: true,
				description: 'Whether to assign users based on their email domain',
			},
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
				description: 'Whether the organization is active',
			},
			{
				displayName: 'VIP',
				name: 'vip',
				type: 'boolean',
				default: false,
				description: 'Whether the organization is marked as VIP',
			},
			{
				displayName: 'Notes',
				name: 'note',
				type: 'string',
				default: '',
				description: 'A note about the organization',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customFieldPairs',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'loadOrganizationCustomFields',
								},
								default: '',
								description:
									'Name of the custom field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set on the custom field',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['organization'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Shared',
				name: 'shared',
				type: 'boolean',
				default: false,
				description: 'Whether the organization is shared with other instances',
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'The domain associated with the organization',
			},
			{
				displayName: 'Domain Assignment',
				name: 'domain_assignment',
				type: 'boolean',
				default: true,
				description: 'Whether to assign users based on their email domain',
			},
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
				description: 'Whether the organization is active',
			},
			{
				displayName: 'VIP',
				name: 'vip',
				type: 'boolean',
				default: false,
				description: 'Whether the organization is marked as VIP',
			},
			{
				displayName: 'Notes',
				name: 'note',
				type: 'string',
				default: '',
				description: 'A note about the organization',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customFieldPairs',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'loadOrganizationCustomFields',
								},
								default: '',
								description:
									'Name of the custom field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set on the custom field',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
];
