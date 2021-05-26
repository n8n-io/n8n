import {
	INodeProperties,
} from 'n8n-workflow';

export const courseOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'course',
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

export const courseFields = [
	// ----------------------------------------
	//               course: get
	// ----------------------------------------
	{
		displayName: 'Course ID',
		name: 'courseId',
		description: 'ID of the course to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'course',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
