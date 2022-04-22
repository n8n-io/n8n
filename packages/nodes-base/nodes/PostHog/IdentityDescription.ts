import {
	INodeProperties,
} from 'n8n-workflow';

export const identityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'identity',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const identityFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 identity:create                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Distinct ID',
		name: 'distinctId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'identity',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: `The identity's distinct ID.`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'identity',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Properties',
				name: 'propertiesUi',
				type: 'fixedCollection',
				placeholder: 'Add Property',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Property',
						name: 'propertyValues',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Timestamp',
				name: 'timestamp',
				type: 'dateTime',
				default: '',
				description: `If not set, it'll automatically be set to the current time.`,
			},
		],
	},
];
