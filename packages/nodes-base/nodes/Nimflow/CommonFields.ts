import {
	INodeProperties,
} from 'n8n-workflow';

export const commonFields: INodeProperties[] = [
	{
		displayName: 'ContextTypeName',
		name: 'contextTypeName',
		type: 'string',
		required: true,
		displayOptions: {
				show: {
						resource: [
								'context',
								'task'
						],
				},
		},
		default:'',
		description:'Context type name for the operation',
	},
	{
		displayName: 'Reference',
		name: 'reference',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'context',
					'task'
				]
			}
		},
		default: ''
	},
	{
		displayName: 'Payload',
		name: 'payload',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'context',
					'task'
				]
			}
		},
		default: '',
		description: 'Payload parameters as JSON',
	}
]
