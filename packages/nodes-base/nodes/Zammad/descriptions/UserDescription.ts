import { INodeProperties } from 'n8n-workflow';

export const userDescription: INodeProperties[] = [
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
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a user',
				action: 'Create a user',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user',
				action: 'Delete a user',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a user',
				action: 'Get a user',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve all users',
				action: 'Get many users',
			},
			{
				name: 'Get Self',
				value: 'getSelf',
				description: 'Retrieve currently logged-in user',
				action: 'Get currently logged-in user',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user',
				action: 'Update a user',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'First Name',
		name: 'firstname',
		type: 'string',
		default: '',
		placeholder: 'John',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Last Name',
		name: 'lastname',
		type: 'string',
		default: '',
		placeholder: 'Smith',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		description:
			'User to update. Specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		description:
			'User to delete. Specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		description:
			'User to retrieve. Specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
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
				resource: ['user'],
				operation: ['create'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Address',
				name: 'addressUi',
				type: 'fixedCollection',
				placeholder: 'Add Address',
				default: {},
				options: [
					{
						displayName: 'Address Details',
						name: 'addressDetails',
						values: [
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
								placeholder: 'Berlin',
							},
							{
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
								placeholder: 'Germany',
							},
							{
								displayName: 'Street & Number',
								name: 'address',
								type: 'string',
								default: '',
								placeholder: 'Borsigstr. 27',
							},
							{
								displayName: 'Zip Code',
								name: 'zip',
								type: 'string',
								default: '',
								placeholder: '10115',
							},
						],
					},
				],
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
									loadOptionsMethod: 'loadUserCustomFields',
								},
								default: '',
								description:
									'Name of the custom field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set on the custom field',
							},
						],
					},
				],
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				placeholder: 'Finance',
			},
			{
				displayName: 'Email Address',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
				placeholder: '+49 30 901820',
			},
			{
				displayName: 'Notes',
				name: 'note',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Organization Name or ID',
				name: 'organization',
				type: 'options',
				description:
					'Name of the organization to assign to the user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'loadOrganizations',
				},
			},
			{
				displayName: 'Phone (Landline)',
				name: 'phone',
				type: 'string',
				default: '',
				placeholder: '+49 30 901820',
			},
			{
				displayName: 'Phone (Mobile)',
				name: 'mobile',
				type: 'string',
				default: '',
				placeholder: '+49 1522 3433333',
			},
			{
				displayName: 'Verified',
				name: 'verified',
				type: 'boolean',
				default: false,
				description: 'Whether the user has been verified',
			},
			{
				displayName: 'VIP',
				name: 'vip',
				type: 'boolean',
				default: false,
				description: 'Whether the user is a Very Important Person',
			},
			{
				displayName: 'Website',
				name: 'web',
				type: 'string',
				default: '',
				placeholder: 'https://n8n.io',
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
				resource: ['user'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Address',
				name: 'addressUi',
				type: 'fixedCollection',
				placeholder: 'Add Address',
				default: {},
				options: [
					{
						displayName: 'Address Details',
						name: 'addressDetails',
						values: [
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
								placeholder: 'Berlin',
							},
							{
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
								placeholder: 'Germany',
							},
							{
								displayName: 'Street & Number',
								name: 'address',
								type: 'string',
								default: '',
								placeholder: 'Borsigstr. 27',
							},
							{
								displayName: 'Zip Code',
								name: 'zip',
								type: 'string',
								default: '',
								placeholder: '10115',
							},
						],
					},
				],
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
									loadOptionsMethod: 'loadUserCustomFields',
								},
								default: '',
								description:
									'Name of the custom field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set on the custom field',
							},
						],
					},
				],
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				placeholder: 'Finance',
			},
			{
				displayName: 'Email Address',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'hello@n8n.io',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
				placeholder: '+49 30 901820',
			},
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				default: '',
				placeholder: 'John',
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				default: '',
				placeholder: 'Smith',
			},
			{
				displayName: 'Notes',
				name: 'note',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Organization Name or ID',
				name: 'organization',
				type: 'options',
				description:
					'Name of the organization to assign to the user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'loadOrganizationNames',
				},
			},
			{
				displayName: 'Phone (Landline)',
				name: 'phone',
				type: 'string',
				default: '',
				placeholder: '+49 30 901820',
			},
			{
				displayName: 'Phone (Mobile)',
				name: 'mobile',
				type: 'string',
				default: '',
				placeholder: '+49 1522 3433333',
			},
			{
				displayName: 'Verified',
				name: 'verified',
				type: 'boolean',
				default: false,
				description: 'Whether the user has been verified',
			},
			{
				displayName: 'VIP',
				name: 'vip',
				type: 'boolean',
				default: false,
				description: 'Whether the user is a Very Important Person',
			},
			{
				displayName: 'Website',
				name: 'web',
				type: 'string',
				default: '',
				placeholder: 'https://n8n.io',
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
				operation: ['search'],
				resource: ['user'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: ['search'],
				resource: ['user'],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['user'],
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
				resource: ['user'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Query to filter results by',
				placeholder: 'user.firstname:john',
			},
			{
				displayName: 'Sort',
				name: 'sortUi',
				type: 'fixedCollection',
				placeholder: 'Add Sort Options',
				default: {},
				options: [
					{
						displayName: 'Sort Options',
						name: 'sortDetails',
						values: [
							{
								displayName: 'Sort Key Name or ID',
								name: 'sort_by',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'loadUserFields',
								},
								default: '',
							},
							{
								displayName: 'Sort Order',
								name: 'order_by',
								type: 'options',
								options: [
									{
										name: 'Ascending',
										value: 'asc',
									},
									{
										name: 'Descending',
										value: 'desc',
									},
								],
								default: 'asc',
							},
						],
					},
				],
			},
		],
	},
];
