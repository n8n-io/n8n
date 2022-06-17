import {
	INodeProperties,
} from 'n8n-workflow';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
				show: {
						resource: [
								'task',
						],
				},
		},
		options: [
				{
						name: 'Search',
						value: 'search',
						description: 'Search and update a task',
				},
				{
					name: 'SearchAndUpdate',
					value: 'searchAndUpdate',
					description: 'Search and update a task',
				},
		],
		default: 'search',
	},
]

export const contextFields: INodeProperties[] = [
	{
		displayName: 'TypeName',
		name: 'typeName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task'
				]
			}
		},
		default: '',
		description: 'The task type name'
	},
	{
		displayName: 'AssignedToCurrentUser',
		name: 'assignedToCurrentUser',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'task'
				]
			}
		},
		default: true,
		description: 'Includes tasks only assigned to current user or to roles assigned to the user'
	},
	{
		displayName: 'Unassigned',
		name: 'unassigned',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'task'
				]
			}
		},
		default: true,
		description: 'Includes unassigned tasks'
	},
	{
		displayName: 'StartEnabled',
		name: 'startEnabled',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'task'
				]
			}
		},
		default: true,
		description: 'Includes only tasks with start date before the call moment'
	}
]
