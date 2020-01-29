import { INodeProperties } from "n8n-workflow";

export const timeEntryOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
			},
		},
		options: [
			{
				name: 'Create via Duration',
				value: 'createByDuration',
				description: 'Create a time entry via duration',
			},
			{
				name: 'Create via Start and End Time',
				value: 'createByStartEnd',
				description: 'Create a time entry via start and end time',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Delete a time entry`,
			},
			{
				name: 'Delete External Reference',
				value: 'deleteExternal',
				description: `Delete a time entry’s external reference.`,
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a time entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all time entries',
			},
			{
				name: 'Restart',
				value: 'restartTime',
				description: 'Restart a time entry',
			},
			{
				name: 'Stop',
				value: 'stopTime',
				description: 'Stop a time entry',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a time entry',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const timeEntryFields = [
/* -------------------------------------------------------------------------- */
/*                                timeEntry:getAll                            */
/* -------------------------------------------------------------------------- */

{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	displayOptions: {
		show: {
			resource: [
				'timeEntry',
			],
			operation: [
				'getAll',
			],
		},
	},
	default: false,
	description: 'Returns a list of your time entries.',
},
{
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	displayOptions: {
		show: {
			resource: [
				'timeEntry',
			],
			operation: [
				'getAll',
			],
			returnAll: [
				false,
			],
		},
	},
	typeOptions: {
		minValue: 1,
		maxValue: 100,
	},
	default: 100,
	description: 'How many results to return.',
},
{
	displayName: 'Filters',
	name: 'filters',
	type: 'collection',
	placeholder: 'Add Filter',
	default: {},
	displayOptions: {
		show: {
			resource: [
				'timeEntry',
			],
			operation: [
				'getAll',
			],
		},
	},
	options: [
		{
			displayName: 'User ID',
			name: 'user_id',
			type: 'string',
			default: '',
			description: 'Only return time entries belonging to the user with the given ID.',
		},
		{
			displayName: 'Client ID',
			name: 'client_id',
			type: 'string',
			default: '',
			description: 'Only return time entries belonging to the client with the given ID.',
		},
		{
			displayName: 'Is Billed',
			name: 'is_billed',
			type: 'boolean',
			default: '',
			description: 'Pass true to only return time entries that have been invoiced and false to return time entries that have not been invoiced.',
		},
		{
			displayName: 'Is Running',
			name: 'is_running',
			type: 'string',
			default: '',
			description: 'Pass true to only return running time entries and false to return non-running time entries.',
		},
		{
			displayName: 'Updated Since',
			name: 'updated_since',
			type: 'string',
			default: '',
			description: 'Only return time entries that have been updated since the given date and time.',
		},
		{
			displayName: 'From',
			name: 'from',
			type: 'dateTime',
			default: '',
			description: 'Only return time entries with a spent_date on or after the given date.',
		},
		{
			displayName: 'To',
			name: 'to',
			type: 'dateTime',
			default: '',
			description: 'Only return time entries with a spent_date on or before the given date.',
		},
		{
			displayName: 'Page',
			name: 'page',
			type: 'string',
			default: '',
			description: 'The page number to use in pagination. For instance, if you make a list request and receive 100 records, your subsequent call can include page=2 to retrieve the next page of the list. (Default: 1)',
		}
	]
},

/* -------------------------------------------------------------------------- */
/*                                timeEntry:get                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Time Entry Id',
	name: 'id',
	type: 'string',
	default: '',
	required: true,
	displayOptions: {
		show: {
			operation: [
				'get',
			],
			resource: [
				'timeEntry',
			],
		},
	},
	description: 'The ID of the time entry you are retrieving.',
},

/* -------------------------------------------------------------------------- */
/*                                timeEntry:delete                            */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Time Entry Id',
	name: 'id',
	type: 'string',
	default: '',
	required: true,
	displayOptions: {
		show: {
			operation: [
				'delete',
			],
			resource: [
				'timeEntry',
			],
		},
	},
	description: 'The ID of the time entry you are deleting.',
},

/* -------------------------------------------------------------------------- */
/*                                timeEntry:deleteExternal                           */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Time Entry Id',
	name: 'id',
	type: 'string',
	default: '',
	required: true,
	displayOptions: {
		show: {
			operation: [
				'deleteExternal',
			],
			resource: [
				'timeEntry',
			],
		},
	},
	description: 'The ID of the time entry whose external reference you are deleting.',
},

/* -------------------------------------------------------------------------- */
/*                                timeEntry:stopTime                           */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Time Entry Id',
	name: 'id',
	type: 'string',
	default: '',
	required: true,
	displayOptions: {
		show: {
			operation: [
				'stopTime',
			],
			resource: [
				'timeEntry',
			],
		},
	},
	description: 'Stop a running time entry. Stopping a time entry is only possible if it’s currently running.',
},

/* -------------------------------------------------------------------------- */
/*                                timeEntry:restartTime                           */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Time Entry Id',
	name: 'id',
	type: 'string',
	default: '',
	required: true,
	displayOptions: {
		show: {
			operation: [
				'restartTime',
			],
			resource: [
				'timeEntry',
			],
		},
	},
	description: 'Restart a stopped time entry. Restarting a time entry is only possible if it isn’t currently running.',
},

/* -------------------------------------------------------------------------- */
/*                                timeEntry:update                           */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Time Entry Id',
	name: 'id',
	type: 'string',
	default: '',
	required: true,
	displayOptions: {
		show: {
			operation: [
				'update',
			],
			resource: [
				'timeEntry',
			],
		},
	},
	description: 'The ID of the time entry to update.',
},
{
	displayName: 'Update Fields',
	name: 'updateFields',
	type: 'collection',
	placeholder: 'Add Field',
	displayOptions: {
		show: {
			operation: [
				'update',
			],
			resource: [
				'timeEntry',
			],
		},
	},
	default: {},
	options: [
		{
			displayName: 'Project Id',
			name: 'projectId',
			type: 'string',
			default: '',
			description: 'The ID of the project to associate with the time entry.',
		},
		{
			displayName: 'Task Id',
			name: 'taskId',
			type: 'string',
			default: '',
			description: 'The ID of the task to associate with the time entry.',
		},
		{
			displayName: 'Spent Date',
			name: 'spentDate',
			type: 'dateTime',
			default: '',
			description: 'The ISO 8601 formatted date the time entry was spent.',
		},
		{
			displayName: 'Started Time',
			name: 'startedTime',
			type: 'string',
			default: '',
			description: 'The time the entry started. Defaults to the current time. Example: “8:00am”.',
		},
		{
			displayName: 'Ended Time',
			name: 'endedTime',
			type: 'string',
			default: '',
			description: 'The time the entry ended.',
		},
		{
			displayName: 'Hours',
			name: 'hours',
			type: 'string',
			default: '',
			description: 'The current amount of time tracked.',
		},
		{
			displayName: 'Notes',
			name: 'notes',
			type: 'string',
			default: '',
			description: 'These are notes about the time entry..',
		}
	],
},

/* -------------------------------------------------------------------------- */
/*                                timeEntry:createByDuration                           */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Create Fields',
	name: 'createFields',
	type: 'collection',
	placeholder: 'Add Field',
	displayOptions: {
		show: {
			operation: [
				'createByDuration',
			],
			resource: [
				'timeEntry',
			],
		},
	},
	default: {},
	options: [
		{
			displayName: 'Project Id',
			name: 'projectId',
			type: 'string',
			default: '',
			description: 'The ID of the project to associate with the time entry.',
		},
		{
			displayName: 'Task Id',
			name: 'taskId',
			type: 'string',
			default: '',
			description: 'The ID of the task to associate with the time entry.',
		},
		{
			displayName: 'Spent Date',
			name: 'spentDate',
			type: 'dateTime',
			default: '',
			description: 'The ISO 8601 formatted date the time entry was spent.',
		},
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string',
			default: '',
			description: 'The ID of the user to associate with the time entry. Defaults to the currently authenticated user’s ID.',
		},
		{
			displayName: 'Hours',
			name: 'hours',
			type: 'string',
			default: '',
			description: 'The current amount of time tracked.',
		},
		{
			displayName: 'Notes',
			name: 'notes',
			type: 'string',
			default: '',
			description: 'These are notes about the time entry..',
		}
	],
},

/* -------------------------------------------------------------------------- */
/*                                timeEntry:createByStartEnd                           */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Create Fields',
	name: 'createFields',
	type: 'collection',
	placeholder: 'Add Field',
	displayOptions: {
		show: {
			operation: [
				'createByStartEnd',
			],
			resource: [
				'timeEntry',
			],
		},
	},
	default: {},
	options: [
		{
			displayName: 'Project Id',
			name: 'projectId',
			type: 'string',
			default: '',
			description: 'The ID of the project to associate with the time entry.',
		},
		{
			displayName: 'Task Id',
			name: 'taskId',
			type: 'string',
			default: '',
			description: 'The ID of the task to associate with the time entry.',
		},
		{
			displayName: 'Spent Date',
			name: 'spentDate',
			type: 'dateTime',
			default: '',
			description: 'The ISO 8601 formatted date the time entry was spent.',
		},
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string',
			default: '',
			description: 'The ID of the user to associate with the time entry. Defaults to the currently authenticated user’s ID.',
		},
		{
			displayName: 'Started Time',
			name: 'startedTime',
			type: 'string',
			default: '',
			description: 'The time the entry started. Defaults to the current time. Example: “8:00am”.',
		},
		{
			displayName: 'Ended Time',
			name: 'endedTime',
			type: 'string',
			default: '',
			description: 'The time the entry ended.',
		},
		{
			displayName: 'Notes',
			name: 'notes',
			type: 'string',
			default: '',
			description: 'These are notes about the time entry..',
		}
	],
},



] as INodeProperties[];
