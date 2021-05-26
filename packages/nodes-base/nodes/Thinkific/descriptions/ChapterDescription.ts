import {
	INodeProperties,
} from 'n8n-workflow';

export const chapterOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'chapter',
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

export const chapterFields = [
	// ----------------------------------------
	//               chapter: get
	// ----------------------------------------
	{
		displayName: 'Chapter ID',
		name: 'chapterId',
		description: 'ID of the chapter to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'chapter',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
