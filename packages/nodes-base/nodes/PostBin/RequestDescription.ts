import {
	INodeProperties
} from 'n8n-workflow';

import {
	RESOURCES,
	REQUEST_OPERATIONS,
	REQUEST_FIELDS
} from './NodeConstants'


export const requestOperations: INodeProperties[] = [
	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					RESOURCES.REQUEST.value,
				],
			},
		},
		options: [
			{
				name: REQUEST_OPERATIONS.GET.name,
				value: REQUEST_OPERATIONS.GET.value,
				description: REQUEST_OPERATIONS.GET.description,
			},
			{
				name: REQUEST_OPERATIONS.SHIFT.name,
				value: REQUEST_OPERATIONS.SHIFT.value,
				description: REQUEST_OPERATIONS.SHIFT.description
			}
		],
		default: REQUEST_OPERATIONS.GET.value,
		description: 'The operation to perform'
	}
]

export const requestFields: INodeProperties[] = [
	{
		name: REQUEST_FIELDS.REQ_ID.name,
		displayName: REQUEST_FIELDS.REQ_ID.displayName,
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					RESOURCES.REQUEST.value
				],
				operation: [
					REQUEST_OPERATIONS.GET.value,
				]
			}
		},
		description: 'Unique identifier for each request.',
	}
]
