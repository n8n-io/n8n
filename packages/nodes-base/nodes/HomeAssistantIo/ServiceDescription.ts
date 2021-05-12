import { INodeProperties } from 'n8n-workflow';

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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all services',
			},
			{
				name: 'Call',
				value: 'call',
				description: 'Call a service within a specific domain',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const serviceFields = [
	/* -------------------------------------------------------------------------- */
	/*                                service:getAll                                 */
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
	/*                                service:Call                                 */
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'fixedCollection',
		placeholder: 'Add Field',
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
				name: 'field',
				displayName: 'Field',
				values: [
					{
						displayName: 'JSON/RAW Parameters',
						name: 'jsonParameters',
						type: 'boolean',
						default: false,
						description: 'If the service data fields should be set via the value-key pair UI or JSON/RAW.',
					},
					{
						displayName: 'Body Parameters',
						name: 'bodyParametersJson',
						type: 'json',
						displayOptions: {
							show: {
								jsonParameters: [
									true,
								],
							},
						},
						default: '',
						description: 'Body data as JSON or RAW.',
					},
					{
						displayName: 'Service Data',
						name: 'serviceDataUi',
						placeholder: 'Add Field',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						displayOptions: {
							show: {
								jsonParameters: [
									false,
								],
							},
						},
						default: {},
						options: [
							{
								name: 'field',
								displayName: 'Field',
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
				],
			},
		],
	},
] as INodeProperties[];
