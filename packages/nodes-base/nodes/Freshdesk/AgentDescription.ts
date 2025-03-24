import type { INodeProperties } from 'n8n-workflow';

export const agentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
			},
		},
		options: [
			{
				name: 'Currently Authenticated Agent',
				value: 'getCurrent',
				description: 'Get currently authenticated agent',
				action: 'Get currently authenticated agent',
			},
		],
		default: 'getCurrent',
	},
];

export const agentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                agent:getCurrent                         */
	/* -------------------------------------------------------------------------- */
	// Should be empty
];
