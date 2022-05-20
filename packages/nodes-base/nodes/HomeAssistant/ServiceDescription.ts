import {
	INodeProperties
} from 'n8n-workflow';

export const serviceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
	},
];

export const serviceFields: INodeProperties[] = [
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
		description: 'Whether to return all results or only up to a given limit',
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
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                service:Call                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDomains',
		},
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
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'domain',
			],
			loadOptionsMethod: 'getDomainServices',
		},
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
						description: 'Name of the field',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the field',
					},
				],
			},
		],
	},
];
