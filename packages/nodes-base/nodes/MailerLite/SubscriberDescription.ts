import {
	INodeProperties,
} from "n8n-workflow";

export const subscriberOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new subscriber',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an subscriber',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all subscribers',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an subscriber',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const subscriberFields = [

/* -------------------------------------------------------------------------- */
/*                                subscriber:create                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'create'
				]
			},
		},
		description: 'email of new subscriber',
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
					'subscriber',
				],
				operation: [
					'create',
				],
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
				description: 'Filter by custom fields ',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description: 'The ID of the field to add custom field to.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field.',
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
				description: 'reactivate subscriber if value is true',
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
		displayName: 'Subscriber ID',
		name: 'subscriberId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'ID or email of subscriber',
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
					'subscriber',
				],
				operation: [
					'update',
				],
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
				description: 'Filter by custom fields ',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description: 'The ID of the field to add custom field to.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field.',
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
				description: 'Defines if it is needed to resend autoresponders',
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
		displayName: 'Subscriber ID',
		name: 'subscriberId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'ID or email of subscriber',
	},
/* -------------------------------------------------------------------------- */
/*                                  subscriber:get                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Subscriber ID',
		name: 'subscriberId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'subscriber',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'ID or email of subscriber',
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
				resource: [
					'subscriber',
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
					'subscriber',
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
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'subscriber',
				],
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
] as INodeProperties[];
