import { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
				action: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
				action: 'Get all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
				action: 'Update a contact',
			},
		],
	},
];

export const contactDescription: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                contact:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'contactName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['contact'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['contact'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Address',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'value',
						displayName: 'Address',
						values: [
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country Name or ID',
								name: 'country_id',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								default: '',
								typeOptions: {
									loadOptionsMethod: 'getCountries',
								},
							},
							{
								displayName: 'State Name or ID',
								name: 'state_id',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								default: '',
								typeOptions: {
									loadOptionsMethod: 'getStates',
								},
							},
							{
								displayName: 'Street',
								name: 'street',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Street 2',
								name: 'street2',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Zip Code',
								name: 'zip',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Internal Notes',
				name: 'comment',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job Position',
				name: 'function',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile',
				name: 'mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax ID',
				name: 'vat',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get', 'delete'],
				resource: ['contact'],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:getAll                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
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
		default: 50,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['getAll', 'get'],
				resource: ['contact'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Fields to Include',
				name: 'fieldsList',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getModelFields',
				},
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['contact'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['contact'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Address',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'value',
						displayName: 'Address',
						values: [
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country Name or ID',
								name: 'country_id',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								default: '',
								typeOptions: {
									loadOptionsMethod: 'getCountries',
								},
							},
							{
								displayName: 'State Name or ID',
								name: 'state_id',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								default: '',
								typeOptions: {
									loadOptionsMethod: 'getStates',
								},
							},
							{
								displayName: 'Street',
								name: 'street',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Street 2',
								name: 'street2',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Zip Code',
								name: 'zip',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Internal Notes',
				name: 'comment',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job Position',
				name: 'function',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile',
				name: 'mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax ID',
				name: 'vat',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
		],
	},
];
