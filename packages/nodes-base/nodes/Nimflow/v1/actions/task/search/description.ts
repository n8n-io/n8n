import {
	TaskProperties,
} from '../../Interfaces';

export const searchDescription: TaskProperties = [
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
					'task'
				],
				operation: [
					'search'
				]
			}
		},
		default: null,
		description: 'Tasks with StartDate On or After a date'
	},
	{
		displayName: 'DueDateBefore',
		name: 'dueDateBefore',
		type: 'dateTime',
		default: null,
		description: 'Tasks with DueDate Before a date'
	},
	{
		displayName: 'AssignedToCurrentUser',
		name: 'assignedToCurrentUser',
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
				],
				operation: [
					'search'
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
				],
				operation: [
					'search'
				]
			}
		},
		default: true,
		description: 'Tasks that are or not enable to start'
	},
	{
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
        show: {
            resource: [
                'task',
            ],
            operation: [
                'search',
            ],
        },
    },
    options: [
        {
            displayName: 'AssignedTo',
            name: 'assignedTo',
            type: 'string',
            default: '',
						description: 'Tasks that match the Assigned To'
        },
				{
					displayName: 'StartDateBefore',
					name: 'startDateBefore',
					type: 'dateTime',
					default: null,
					description: 'Tasks with StartDate Before a date'
				},
				{
					displayName: 'DueDateOnOrAfter',
					name: 'dueDateOnOrAfter',
					type: 'dateTime',
					default: null,
					description: 'Tasks with DueDate On or After a date'
				},
				{
					displayName: 'Status',
					name: 'status',
					type: 'string',
					default: '',
					description: 'Tasks that matches the Status'
				},
				{
					displayName: 'ContextReference',
					name: 'contextReference',
					type: 'string',
					default: '',
					description: 'Tasks that matches the Context Reference'
				},
				{
					displayName: 'ContextId',
					name: 'contextId',
					type: 'string',
					default: '',
					description: 'Tasks that matches the Context ID'
				},
    ],
	},
]
