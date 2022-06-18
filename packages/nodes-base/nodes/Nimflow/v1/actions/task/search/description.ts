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
						description: 'Search tasks by multiple criteria',
				},
				{
					name: 'SearchAndUpdate',
					value: 'searchAndUpdate',
					description: 'Search and update tasks by multiple criteria',
				},
		],
		default: 'search',
	},
]

export const taskFields: INodeProperties[] = [
	{
		displayName: 'ContextTypeName',
		name: 'contextTypeName',
		type: 'string',
		displayOptions: {
				show: {
						resource: [
								'task'
						],
						operation: [
							'search'
						]
				},
		},
		default:'',
		description:'Tasks that matches the Context Type Name',
	},
	{
		displayName: 'ContextReference',
		name: 'contextReference',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task'
				],
				operation: [
					'search'
				]
			}
		},
		default: '',
		description: 'Tasks that matches the Context Reference'
	},
	{
		displayName: 'TypeName',
		name: 'typeName',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task'
				],
				operation: [
					'search'
				]
			}
		},
		default: '',
		description: 'Tasks that matches the Type Name'
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task'
				],
				operation: [
					'search'
				]
			}
		},
		default: '',
		description: 'Tasks that matches the Status'
	},
	{
		displayName: "Archived",
		name: "archived",
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'task'
				],
				operation: [
					'search'
				]
			}
		},
		default: false,
		description: 'Tasks thar are or not are Archived'
	},
	{
		displayName: 'StartDateOnOrAfter',
		name: 'startDateOnOrAfter',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: [
					'tasks'
				],
				operation: [
					'search'
				]
			}
		},
		default: new Date().toISOString(),
		description: 'Tasks with StartDate On or After a date'
	},
	{
		displayName: 'StartDateBefore',
		name: 'startDateBefore',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: [
					'tasks'
				],
				operation: [
					'search'
				]
			}
		},
		default: new Date().toISOString(),
		description: 'Tasks with StartDate Before a date'
	},
	{
		displayName: 'DueDateOnOrAfter',
		name: 'dueDateOnOrAfter',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: [
					'tasks'
				],
				operation: [
					'search'
				]
			}
		},
		default: new Date().toISOString(),
		description: 'Tasks with DueDate On or After a date'
	},
	{
		displayName: 'DueDateBefore',
		name: 'dueDateBefore',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: [
					'tasks'
				],
				operation: [
					'search'
				]
			}
		},
		default: new Date().toISOString(),
		description: 'Tasks with DueDate Before a date'
	},
	{
		displayName: 'AssignedTo',
		name: 'assignedTo',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'tasks'
				],
				operation: [
					'search'
				]
			}
		},
		default: '',
		description: 'Tasks that match the Assigned To'
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
		description: 'Tasks assigned or not to the Current User'
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
		description: 'Tasks that are or not unassigned'
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
		description: 'Tasks that are or not enable to start'
	}
]
