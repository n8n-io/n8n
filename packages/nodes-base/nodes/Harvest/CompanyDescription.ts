import { INodeProperties } from "n8n-workflow";

export const clientOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieves the company for the currently authenticated user',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},

] as INodeProperties[];
