import type { INodeProperties } from 'n8n-workflow';

export const subscriberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['subscriber'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new subscriber',
				action: 'Create a subscriber',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an subscriber',
				action: 'Get a subscriber',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many subscribers',
				action: 'Get many subscribers',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an subscriber',
				action: 'Update a subscriber',
			},
		],
		default: 'create',
	},
];

export const subscriberFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                subscriber:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['create'],
			},
		},
		description: 'Email of new subscriber',
	},

	/* -------------------------------------------------------------------------- */
	/*                                subscriber:update                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Subscriber Email',
		name: 'subscriberId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'Email of subscriber',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['update', 'create'],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description:
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field',
							},
						],
					},
				],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Bounced',
						value: 'bounced',
					},
					{
						name: 'Junk',
						value: 'junk',
					},
					{
						name: 'Unconfirmed',
						value: 'unconfirmed',
					},
					{
						name: 'Unsubscribed',
						value: 'unsubscribed',
					},
				],
				default: '',
			},
			{
				displayName: 'Subscribed At',
				name: 'subscribed_at',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'IP Address',
				name: 'ip_address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Opted In At',
				name: 'opted_in_at',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Opt In IP',
				name: 'optin_ip',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Unsubscribed At',
				name: 'unsubscribed_at',
				type: 'dateTime',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                subscriber:delete                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Subscriber Email',
		name: 'subscriberId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'Email of subscriber to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  subscriber:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Subscriber Email',
		name: 'subscriberId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Email of subscriber to get',
	},
	/* -------------------------------------------------------------------------- */
	/*                                  subscriber:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['subscriber'],
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
				resource: ['subscriber'],
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
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['subscriber'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Bounced',
						value: 'bounced',
					},
					{
						name: 'Junk',
						value: 'junk',
					},
					{
						name: 'Unconfirmed',
						value: 'unconfirmed',
					},
					{
						name: 'Unsubscribed',
						value: 'unsubscribed',
					},
				],
				default: '',
			},
		],
	},
];
