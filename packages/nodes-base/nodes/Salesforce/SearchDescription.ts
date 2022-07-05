import {
	INodeProperties,
} from 'n8n-workflow';

export const searchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'search',
				],
			},
		},
		options: [
			{
				name: 'Query',
				value: 'query',
				description: 'Execute a SOQL query that returns all the results in a single response',
			},
		],
		default: 'query',
		description: 'The operation to perform.',
	},
];

export const searchFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                search:query                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'search',
				],
				operation: [
					'query',
				],
			},
		},
		description: 'A SOQL query. An example query parameter string might look like: “SELECT+Name+FROM+MyObject”. If the SOQL query string is invalid, a MALFORMED_QUERY response is returned.',
	},
];
