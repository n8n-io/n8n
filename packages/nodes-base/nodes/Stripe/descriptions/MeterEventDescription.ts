import type { INodeProperties } from 'n8n-workflow';

export const meterEventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['meterEvent'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a billing meter event with synchronous validation',
				action: 'Create a billing meter event',
			},
		],
		default: 'create',
	},
];

export const meterEventFields: INodeProperties[] = [
	// ----------------------------------
	//         meterEvent:create
	// ----------------------------------
	{
		displayName: 'Event Name',
		name: 'eventName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['meterEvent'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the meter event. Corresponds with the event_name field on a meter.',
	},
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['meterEvent'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The Stripe customer ID to associate with this meter event',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['meterEvent'],
				operation: ['create'],
			},
		},
		default: 1,
		description: 'The usage value for this meter event. Must be a positive integer.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['meterEvent'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Identifier',
				name: 'identifier',
				type: 'string',
				default: '',
				description:
					'A unique identifier for the event. If not provided, one will be generated. We recommend using a globally unique identifier.',
			},
			{
				displayName: 'Timestamp',
				name: 'timestamp',
				type: 'dateTime',
				default: '',
				description:
					'The time of the event. Must be within the past 35 calendar days or up to 5 minutes in the future. Defaults to current timestamp if not specified.',
			},
			{
				displayName: 'Custom Payload Fields',
				name: 'customPayloadFields',
				type: 'fixedCollection',
				default: {},
				description:
					'Additional custom fields to include in the payload. These must correspond to your meter configuration.',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				options: [
					{
						displayName: 'Field',
						name: 'values',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'The name of the custom field',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value of the custom field',
							},
						],
					},
				],
			},
		],
	},
];
