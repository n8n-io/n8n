import {
	INodeProperties
} from 'n8n-workflow';

export const serviceOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'service',
				],
			},
		},
		options: [
			{
				name: 'Call',
				value: 'call',
				description: 'Call a service within a specific domain',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all services',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const serviceFields = [
	/* -------------------------------------------------------------------------- */
	/*                                service:getAll                              */
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
					'service',
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
					'service',
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
	/*                                service:Call                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'service',
				],
				operation: [
					'call',
				],
			},
		},
	},
	{
		displayName: 'Service',
		name: 'service',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'service',
				],
				operation: [
					'call',
				],
			},
		},
	},
	{
		displayName: 'Service Attributes',
		name: 'serviceAttributes',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Attribute',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'service',
				],
				operation: [
					'call',
				],
			},
		},
		options: [
			{
				name: 'attributes',
				displayName: 'Attributes',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the field.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the field.',
					},
				],
			},
		],
	},
] as INodeProperties[];
