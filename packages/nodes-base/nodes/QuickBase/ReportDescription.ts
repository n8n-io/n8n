import {
	INodeProperties,
} from 'n8n-workflow';

export const reportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'report',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a report',
			},
			{
				name: 'Run',
				value: 'run',
				description: 'Run a report',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const reportFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                report:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'The table identifier.',
	},
	{
		displayName: 'Report ID',
		name: 'reportId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'The identifier of the report, unique to the table.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                report:run                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'run',
				],
			},
		},
		description: 'The table identifier.',
	},
	{
		displayName: 'Report ID',
		name: 'reportId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'run',
				],
			},
		},
		description: 'The identifier of the report, unique to the table.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'run',
				],
			},
		},
		default: true,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'run',
				],
			},
			hide: {
				returnAll: [
					true,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Number of results to return.',
	},
];
