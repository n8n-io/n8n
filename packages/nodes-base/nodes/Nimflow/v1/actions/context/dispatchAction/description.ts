import {
	ContextProperties
} from '../../Interfaces';

export const dispatchActionDescription: ContextProperties = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'context'
				],
				operation: [
					'dispatchAction'
				]
			}
		},
		default: '',
		description: 'The action of the context to dispatch'
	},
	{
		displayName: 'ContextTypeName',
		name: 'contextTypeName',
		type: 'string',
		required: true,
		displayOptions: {
				show: {
					resource: [
						'context'
					],
					operation: [
						'dispatchAction'
					]
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
					'context'
				],
				operation: [
					'dispatchAction'
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
					'context'
				],
				operation: [
					'dispatchAction'
				]
			}
		},
		default: '',
		description: 'Payload parameters as JSON',
	}
]
