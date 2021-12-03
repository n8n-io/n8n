import {
	INodeProperties,
} from 'n8n-workflow';

export const submissionOptions = [
	{
		displayName: 'Submission id',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'submission',
					'attachment',
				],
				operation: [
					'get',
					'delete',
					'download',
				],
			},
		},
		default: '',
		description:'Submission id (number, e.g. 245128)',
	},
] as INodeProperties[];
