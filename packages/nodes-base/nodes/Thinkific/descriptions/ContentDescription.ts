import {
	INodeProperties,
} from 'n8n-workflow';

export const contentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'content',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const contentFields = [
	// ----------------------------------------
	//               content: get
	// ----------------------------------------
	{
		displayName: 'Content ID',
		name: 'contentId',
		description: 'ID of the content to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'content',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
