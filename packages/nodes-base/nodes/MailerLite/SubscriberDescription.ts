import { INodeProperties } from 'n8n-workflow';

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
				description: 'Get all subscribers',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Confirmation Timestamp',
				name: 'confirmation_timestamp',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Confirmation IP',
				name: 'confirmation_ip',
				type: 'string',
				default: '',
			},
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
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Resubscribe',
				name: 'resubscribe',
				type: 'boolean',
				default: false,
				description: 'Whether to reactivate subscriber',
			},
			{
				displayName: 'Signup IP',
				name: 'signup_ip',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Signup Timestamp',
				name: 'signup_timestamp',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Unsubscribed',
						value: 'unsubscribed',
					},
					{
						name: 'Unconfirmed',
						value: 'unconfirmed',
					},
				],
				default: '',
			},
		],
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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['update'],
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
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Resend Autoresponders',
				name: 'resend_autoresponders',
				type: 'boolean',
				default: false,
				description: 'Whether it is needed to resend autoresponders',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Unsubscribed',
						value: 'unsubscribed',
					},
					{
						name: 'Unconfirmed',
						value: 'unconfirmed',
					},
				],
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
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Unsubscribed',
						value: 'unsubscribed',
					},
					{
						name: 'Unconfirmed',
						value: 'unconfirmed',
					},
				],
				default: '',
			},
		],
	},
];
