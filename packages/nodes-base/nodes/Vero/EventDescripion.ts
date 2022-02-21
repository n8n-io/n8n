import { INodeProperties } from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
			},
		},
		options: [
			{
				name: 'Track',
				value: 'track',
				description: `Track an event for a specific customer`,
			},
		],
		default: 'track',
		description: 'The operation to perform.',
	},
];

export const eventFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                event:track                                     */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'track',
				],
			},
		},
		description: 'The unique identifier of the customer',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'track',
				],
			},
		},
		description: 'Email',
	},
	{
		displayName: 'Event Name',
		name: 'eventName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'track',
				],
			},
		},
		description: 'The name of the event tracked.',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'track',
				],
			},
		},
	},
	{
		displayName: 'Data',
		name: 'dataAttributesUi',
		placeholder: 'Add Data',
		description: 'key value pairs that represent any properties you want to track with this event',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'track',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				name: 'dataAttributesValues',
				displayName: 'Data',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Name of the property to set.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the property to set.',
					},
				],
			},
		],
	},
	{
		displayName: 'Extra',
		name: 'extraAttributesUi',
		placeholder: 'Add Extra',
		description: 'Key value pairs that represent reserved, Vero-specific operators. Refer to the note on “deduplication” below.',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'track',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				name: 'extraAttributesValues',
				displayName: 'Extra',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Name of the property to set.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the property to set.',
					},
				],
			},
		],
	},
	{
		displayName: 'Data',
		name: 'dataAttributesJson',
		type: 'json',
		default: '',
		required: false,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		description: 'key value pairs that represent the custom user properties you want to update',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'track',
				],
				jsonParameters: [
					true,
				],
			},
		},
	},
	{
		displayName: 'Extra',
		name: 'extraAttributesJson',
		type: 'json',
		default: '',
		required: false,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		description: 'Key value pairs that represent reserved, Vero-specific operators. Refer to the note on “deduplication” below.',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'track',
				],
				jsonParameters: [
					true,
				],
			},
		},
	},
];
