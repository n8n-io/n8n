import { INodeProperties } from 'n8n-workflow';

export const reportDescription = [
	// ----------------------------------
	//         Operations: Report
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['report'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an entry.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all entries.',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
	{
		displayName: 'Category',
		name: 'category',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
			},
		},
		description: 'The category the report is in.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get'],
			},
		},
		description: 'The name of the report.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simplify',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['get', 'getAll'],
			},
		},
		description: 'Return simplified response. Only returns the message data.',
	},
] as INodeProperties[];
