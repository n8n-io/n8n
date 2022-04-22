import {
	INodeProperties,
} from 'n8n-workflow';

export const trackOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'track',
				],
			},
		},
		options: [
			{
				name: 'Page',
				value: 'page',
				description: 'Track a page',
			},
			{
				name: 'Screen',
				value: 'screen',
				description: 'Track a screen',
			},
		],
		default: 'page',
		description: 'The operation to perform.',
	},
];

export const trackFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 track:page                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'track',
				],
				operation: [
					'page',
					'screen',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Distinct ID',
		name: 'distinctId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'track',
				],
				operation: [
					'page',
					'screen',
				],
			},
		},
		default: '',
		description: `The user's distinct ID.`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'track',
				],
				operation: [
					'page',
					'screen',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Context',
				name: 'contextUi',
				type: 'fixedCollection',
				placeholder: 'Add Property',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Context',
						name: 'contextValues',
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
				displayName: 'Timestamp',
				name: 'timestamp',
				type: 'dateTime',
				default: '',
				description: `If not set, it'll automatically be set to the current time.`,
			},
		],
	},
];
