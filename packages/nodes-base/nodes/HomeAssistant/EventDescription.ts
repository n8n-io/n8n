import {
	INodeProperties
} from 'n8n-workflow';

export const eventOperations = [
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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all events',
			},
			{
				name: 'Post',
				value: 'post',
				description: 'Post an event',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const eventFields = [

	/* -------------------------------------------------------------------------- */
	/*                                event:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'event',
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
				operation: [
					'getAll',
				],
				resource: [
					'event',
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

	/* -------------------------------------------------------------------------- */
	/*                                event:post                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Event Type',
		name: 'eventType',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'post',
				],
				resource: [
					'event',
				],
			},
		},
		required: true,
		default: '',
		description: 'The Entity ID for which an event will be created.',
	},
	{
		displayName: 'Event Attributes',
		name: 'eventAttributes',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Attribute',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'post',
				],
			},
		},
		options: [
			{
				displayName: 'Attributes',
				name: 'attributes',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the attribute.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the attribute.',
					},
				],
			},
		],
	},
] as INodeProperties[];
