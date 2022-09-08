import { INodeProperties } from 'n8n-workflow';

export const flowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['flow'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all flows',
				action: 'Get many flows',
			},
			{
				name: 'Invoke',
				value: 'invoke',
				description: 'Invoke a flow',
				action: 'Invoke a flow',
			},
		],
		default: 'invoke',
	},
];

export const flowFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                flow:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['flow'],
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
				operation: ['getAll'],
				resource: ['flow'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                flow:invoke                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'API Name',
		name: 'apiName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['flow'],
				operation: ['invoke'],
			},
		},
		description: 'Required. API name of the flow.',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['flow'],
				operation: ['invoke'],
			},
		},
		description: 'Whether the input variables should be set via the value-key pair UI or JSON/RAW',
	},
	{
		displayName: 'Variables',
		name: 'variablesJson',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['flow'],
				operation: ['invoke'],
				jsonParameters: [true],
			},
		},
		default: '',
		description: 'Input variables as JSON object',
	},
	{
		displayName: 'Variables',
		name: 'variablesUi',
		placeholder: 'Add Variable',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['flow'],
				operation: ['invoke'],
				jsonParameters: [false],
			},
		},
		description: 'The input variable to send',
		default: {},
		options: [
			{
				displayName: 'Variable',
				name: 'variablesValues',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the input variable',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the input variable',
					},
				],
			},
		],
	},
];
