import {
	INodeProperties,
} from 'n8n-workflow';

import {
    getPagingParameters
} from '../GenericFunctions';

export const taskOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all tasks',
			},
			{
				name: 'Get All By Container',
				value: 'getAllByContainer',
				description: 'Find all tasks by container',
			},
			{
				name: 'Delete All By Container',
				value: 'deleteAllByContainer',
				description: 'Delete all tasks by container',
			},
            {
				name: 'Create',
				value: 'create',
				description: 'Create a new task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a task by id',
			},
            {
				name: 'Update',
				value: 'update',
				description: 'Update a task by id',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task by id',
			},
			{
				name: 'Change Status',
				value: 'changeStatus',
				description: 'Change task status',
			},
			{
				name: 'Revert',
				value: 'revert',
				description: 'Revert task',
			},
			{
				name: 'Attach Files',
				value: 'attachFiles',
				description: 'Attach files to task',
			},
			{
				name: 'Remove File',
				value: 'removeFile',
				description: 'Remove file from task',
			},

		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  taskFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 task:getAll	                              */
	/* -------------------------------------------------------------------------- */

    ...getPagingParameters('task'),

	/* -------------------------------------------------------------------------- */
	/*                                 task:getAllByContainer	                  */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'getAllByContainer',
				],
			},
		},
		default: '',
		description: 'The id of content container.',
	},
    ...getPagingParameters('task', 'getAllByContainer'),

	/* -------------------------------------------------------------------------- */
	/*                                 task:deleteAllByContainer	              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'deleteAllByContainer',
				],
			},
		},
		default: '',
		description: 'The id of content container.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:create                                */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The id of content container.',
	},
    {
        displayName: 'Task Title',
        name: 'taskTitle',
        type: 'string',
        displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
        required: true,
        default: '',
        description: 'The title of the task.',
    },
    {
        displayName: 'Task Additional Fields',
        name: 'taskAdditionalFields',
        type: 'collection',
        required: true,
        displayOptions: {
            show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
            },
        },
        default: [],
        description: '',
        options: [
            {
                displayName: 'Description',
                name: 'description',
                type: 'string',
                default: '',
                description: 'The description of the task.',
            },
            {
                displayName: 'Task List ID',
                name: 'task_list_id',
                type: 'number',
                default: '',
                description: 'The ID of the task list that the task belongs to.',
            },
            {
                displayName: 'Scheduling',
                name: 'scheduling',
                type: 'boolean',
                default: true,
                description: 'If the task has start and end dates.',
            },
            {
                displayName: 'All Day',
                name: 'all_day',
                type: 'boolean',
                default: '',
                description: 'If the task continues all day.',
            },
            {
                displayName: 'Selected Reminders',
                name: 'selectedRemindersStr',
                type: 'string',
                default: '',
                description: 'Id\'s of reminder mode as integers separated by comma.', // Array of integers <int64>
            },
            {
                displayName: 'Calendar Mode',
                name: 'cal_mode',
                type: 'boolean',
                default: true,
                description: 'Add schedule to the space calendar.',
            },
            {
                displayName: 'Assigned Users',
                name: 'assignedUsers',
                type: 'string',
                default: '',
                description: 'Guid\'s of user separated by comma.', // Array of strings
            },
            {
                displayName: 'Responsible Users',
                name: 'responsibleUsers',
                type: 'string',
                default: '',
                description: 'Guid\'s of user separated by comma.', // Array of strings
            },
            {
                displayName: 'Review',
                name: 'review',
                type: 'number',
                default: '',
                description: 'Review by responsible user.',
            },
        ],
    },
    {
        displayName: 'Start Date',
        name: 'start_date',
        type: 'string',
        displayOptions: {
            show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
            },
        },
        default: '',
        description: 'Required if Task scheduling param is set.',
    },
    {
        displayName: 'Start Time',
        name: 'start_time',
        type: 'string',
        displayOptions: {
            show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
            },
        },
        default: '',
        description: 'Required if Task scheduling param is set and Task all_day param isn\'t set.',
    },
    {
        displayName: 'End Date',
        name: 'end_date',
        type: 'string',
        displayOptions: {
            show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
            },
        },
        default: '',
        description: 'Required if Task scheduling param is set.',
    },
    {
        displayName: 'End Time',
        name: 'end_time',
        type: 'string',
        displayOptions: {
            show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
            },
        },
        default: '',
        description: 'Required if Task scheduling param is set and Task all_day param isn\'t set.',
    },
	{
        displayName: 'Task Form Additional Fields',
        name: 'taskFormAdditionalFields',
        type: 'collection',
        required: true,
        displayOptions: {
            show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
            },
        },
        default: [],
        description: '',
        options: [
            {
                displayName: 'Is Public',
                name: 'is_public',
                type: 'boolean',
                default: '',
                description: 'If the task is public.',
            },
            // {
            //     displayName: 'Start Date',
            //     name: 'start_date',
            //     type: 'string',
            //     default: '',
            //     description: 'Required if Task scheduling param is set.',
            // },
            // {
            //     displayName: 'Start Time',
            //     name: 'start_time',
            //     type: 'string',
            //     default: '',
            //     description: 'Required if Task scheduling param is set and Task all_day param isn\'t set.',
            // },
            // {
            //     displayName: 'End Date',
            //     name: 'end_date',
            //     type: 'string',
            //     default: '',
            //     description: 'Required if Task scheduling param is set.',
            // },
            // {
            //     displayName: 'End Time',
            //     name: 'end_time',
            //     type: 'string',
            //     default: '',
            //     description: 'Required if Task scheduling param is set and Task all_day param isn\'t set.',
            // },
            {
                displayName: 'Time Zone',
                name: 'timeZone',
                type: 'string',
                default: '',
                description: 'The time zone of the task.',
            },
            {
                displayName: 'New Items',
                name: 'newItems',
                type: 'string',
                default: '',
                description: 'Checklist items separated by comma.', // Array of strings
            },
        ],
    },

	/* -------------------------------------------------------------------------- */
	/*                                 task:get                                   */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The id of the task.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:update                                */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The id of the task.',
	},
	{
        displayName: 'Task',
        name: 'task',
        type: 'collection',
        displayOptions: {
            show: {
				resource: [
					'task',
				],
				operation: [
					'update',
				],
            },
        },
        default: [],
        description: '',
        options: [
            {
                displayName: 'Title',
                name: 'title',
                type: 'string',
                default: '',
                description: 'The title of the task.',
            },
            {
                displayName: 'Description',
                name: 'description',
                type: 'string',
                default: '',
                description: 'The description of the task',
            },
            {
                displayName: 'Task List ID',
                name: 'task_list_id',
                type: 'number',
                default: '',
                description: 'The task list ID',
            },
            {
                displayName: 'Scheduling',
                name: 'scheduling',
                type: 'boolean',
                default: true,
                description: 'If the task has start and end dates.',
            },
            {
                displayName: 'All Day',
                name: 'all_day',
                type: 'boolean',
                default: '',
                description: 'If the task continues all day.',
            },
            {
                displayName: 'Selected Reminders',
                name: 'selectedRemindersStr',
                type: 'string',
                default: '',
                description: 'Id\'s of reminder mode as integers separated by comma.', // Array of integers <int64>
            },
            {
                displayName: 'Calendar Mode',
                name: 'cal_mode',
                type: 'boolean',
                default: true,
                description: 'Add schedule to the space calendar.',
            },
            {
                displayName: 'Assigned Users',
                name: 'assignedUsers',
                type: 'string',
                default: '',
                description: 'Guid\'s of user separated by comma.', // Array of strings
            },
            {
                displayName: 'Responsible Users',
                name: 'responsibleUsers',
                type: 'string',
                default: '',
                description: 'Guid\'s of user separated by comma.', // Array of strings
            },
            {
                displayName: 'Review',
                name: 'review',
                type: 'number',
                default: '',
                description: 'Review by responsible user.',
            },
        ],
    },
	{
        displayName: 'Task Form',
        name: 'taskForm',
        type: 'collection',
        displayOptions: {
            show: {
				resource: [
					'task',
				],
				operation: [
					'update',
				],
            },
        },
        default: [],
        description: '',
        options: [
            {
                displayName: 'Is Public',
                name: 'is_public',
                type: 'boolean',
                default: true,
                description: 'If the task is public',
            },
            {
                displayName: 'Start Date',
                name: 'start_date',
                type: 'string',
                default: '',
                description: 'Required if Task scheduling param is set.',
            },
            {
                displayName: 'Start Time',
                name: 'start_time',
                type: 'string',
                default: '',
                description: 'Required if Task scheduling param is set and Task all_day param isn\'t set.',
            },
            {
                displayName: 'End Date',
                name: 'end_date',
                type: 'string',
                default: '',
                description: 'Required if Task scheduling param is set.',
            },
            {
                displayName: 'End Time',
                name: 'end_time',
                type: 'string',
                default: '',
                description: 'Required if Task scheduling param is set and Task all_day param isn\'t set.',
            },
            {
                displayName: 'new Items',
                name: 'newItems',
                type: 'string',
                default: '',
                description: 'Checklist items separated by comma.', // Array of strings
            },
        ],
    },

	/* -------------------------------------------------------------------------- */
	/*                                 task:delete	                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The id of the task.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:changeStatus                          */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'changeStatus',
				],
			},
		},
		default: '',
		description: 'The id of the task.',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'changeStatus',
				],
			},
		},
        options: [
            {
                name: '1 - pending',
                value: 1,
            },
            {
                name: '2 - in progress',
                value: 2,
            },
            {
                name: '3 - pending review',
                value: 3,
            },
            {
                name: '5 - completed',
                value: 5,
            },
        ],
		default: 1,
		description: 'Status of the task.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:revert                                */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'revert',
				],
			},
		},
		default: '',
		description: 'The id of content container.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:attachFiles                           */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'attachFiles',
				],
			},
		},
		default: '',
		description: 'The id of the task.',
	},
    {
		displayName: 'Files',
		name: 'files',
		placeholder: 'Add File',
		type: 'fixedCollection',
		default: '',
		description: 'Which files to send.',
		typeOptions: {
			multipleValues: true,
		},
        displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'attachFiles',
				],
			},
		},
		options: [
			{
				displayName: 'File',
				name: 'file',
				values: [
					{
						displayName: 'Property Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Name of the binary property which contains the data for the file to be sent.',
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:removeFile                            */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'removeFile',
				],
			},
		},
		default: '',
		description: 'The id of the task.',
	},
    {
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'removeFile',
				],
			},
		},
		default: '',
		description: 'The id of file to remove.',
	},

] as INodeProperties[];
