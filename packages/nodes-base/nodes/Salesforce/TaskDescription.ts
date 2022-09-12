import { INodeProperties } from 'n8n-workflow';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a task',
				action: 'Create a task',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task',
				action: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a task',
				action: 'Get a task',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all tasks',
				action: 'Get many tasks',
			},
			{
				name: 'Get Summary',
				value: 'getSummary',
				description: "Returns an overview of task's metadata",
				action: 'Get a task summary',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
				action: 'Update a task',
			},
		],
		default: 'create',
	},
];

export const taskFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                task:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Status Name or ID',
		name: 'status',
		type: 'options',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTaskStatuses',
		},
		description:
			'The current status of the task, such as In Progress or Completed. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Activity Date',
				name: 'activityDate',
				type: 'dateTime',
				default: '',
				description:
					'Represents the due date of the task. This field has a timestamp that is always set to midnight in the Coordinated Universal Time (UTC) time zone.',
			},
			{
				displayName: 'Call Disposition',
				name: 'callDisposition',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description:
					"Represents the result of a given call, for example, “we'll call back,” or “call unsuccessful.” Limit is 255 characters. Not subject to field-level security, available for any user in an organization with Salesforce CRM Call Center.",
			},
			{
				displayName: 'Call Duration In Seconds',
				name: 'callDurationInSeconds',
				type: 'number',
				default: '',
				description:
					'Duration of the call in seconds. Not subject to field-level security, available for any user in an organization with Salesforce CRM Call Center.',
			},
			{
				displayName: 'Call Object',
				name: 'callObject',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description:
					'Name of a call center. Limit is 255 characters. Not subject to field-level security, available for any user in an organization with Salesforce CRM Call Center.',
			},
			{
				displayName: 'Call Type Name or ID',
				name: 'callType',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskCallTypes',
				},
				description:
					'The type of call being answered: Inbound, Internal, or Outbound. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description:
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Contains a text description of the task',
			},
			{
				displayName: 'Is ReminderSet',
				name: 'isReminderSet',
				type: 'boolean',
				default: false,
				description: 'Whether a popup reminder has been set for the task (true) or not (false)',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description:
					'ID of the User who owns the record. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Priority Name or ID',
				name: 'priority',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskPriorities',
				},
				description:
					'Indicates the importance or urgency of a task, such as high or low. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Recurrence Type Name or ID',
				name: 'recurrenceType',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskRecurrenceTypes',
				},
				description:
					'Recurrence Type of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Recurrence Instance Name or ID',
				name: 'recurrenceInstance',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTaskRecurrenceInstances',
				},
				default: '',
				description:
					'The frequency of the recurring task. For example, “2nd” or “3rd.”. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Recurrence Interval',
				name: 'recurrenceInterval',
				type: 'number',
				default: '',
				description: 'The interval between recurring tasks',
			},
			{
				displayName: 'Recurrence Day Of Month',
				name: 'recurrenceDayOfMonth',
				type: 'number',
				default: '',
				description: 'The day of the month in which the task repeats',
			},
			{
				displayName: 'Recurrence Day Of Week Mask',
				name: 'recurrenceDayOfWeekMask',
				type: 'number',
				default: '',
				description:
					'The day or days of the week on which the task repeats. This field contains a bitmask. The values are as follows: Sunday = 1 Monday = 2 Tuesday = 4 Wednesday = 8 Thursday = 16 Friday = 32 Saturday = 64 Multiple days are represented as the sum of their numerical values. For example, Tuesday and Thursday = 4 + 16 = 20.',
			},
			{
				displayName: 'Recurrence End Date Only',
				name: 'recurrenceEndDateOnly',
				type: 'dateTime',
				default: '',
				description:
					'The last date on which the task repeats. This field has a timestamp that is always set to midnight in the Coordinated Universal Time (UTC) time zone.',
			},
			{
				displayName: 'Recurrence Month Of Year',
				name: 'recurrenceMonthOfYear',
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'January',
						value: 'January',
					},
					{
						name: 'February',
						value: 'February',
					},
					{
						name: 'March',
						value: 'March',
					},
					{
						name: 'April',
						value: 'April',
					},
					{
						name: 'May',
						value: 'May',
					},
					{
						name: 'June',
						value: 'June',
					},
					{
						name: 'July',
						value: 'July',
					},
					{
						name: 'August',
						value: 'August',
					},
					{
						name: 'September',
						value: 'September',
					},
					{
						name: 'October',
						value: 'October',
					},
					{
						name: 'November',
						value: 'November',
					},
					{
						name: 'December',
						value: 'December',
					},
				],
				default: '',
				description: 'The month of the year in which the task repeats',
			},
			{
				displayName: 'Recurrence Regenerated Type',
				name: 'recurrenceRegeneratedType',
				type: 'options',
				default: '',
				options: [
					{
						name: 'After Due Date',
						value: 'RecurrenceRegenerateAfterDueDate',
					},
					{
						name: 'After Date Completed',
						value: 'RecurrenceRegenerateAfterToday',
					},
					{
						name: '(Task Closed)',
						value: 'RecurrenceRegenerated',
					},
				],
				description:
					'Represents what triggers a repeating task to repeat. Add this field to a page layout together with the RecurrenceInterval field, which determines the number of days between the triggering date (due date or close date) and the due date of the next repeating task in the series. Label is Repeat This Task.',
			},
			{
				displayName: 'Recurrence Start Date Only',
				name: 'recurrenceEndDateOnly',
				type: 'dateTime',
				default: '',
				description:
					'The date when the recurring task begins. Must be a date and time before RecurrenceEndDateOnly.',
			},
			{
				displayName: 'Recurrence TimeZone SidKey',
				name: 'recurrenceTimeZoneSidKey',
				type: 'string',
				default: '',
				description:
					'The time zone associated with the recurring task. For example, “UTC-8:00” for Pacific Standard Time.',
			},
			{
				displayName: 'Reminder Date Time',
				name: 'reminderDateTime',
				type: 'dateTime',
				default: '',
				description:
					'Represents the time when the reminder is scheduled to fire, if IsReminderSet is set to true. If IsReminderSet is set to false, then the user may have deselected the reminder checkbox in the Salesforce user interface, or the reminder has already fired at the time indicated by the value.',
			},
			{
				displayName: 'Subject Name or ID',
				name: 'subject',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskSubjects',
				},
				description:
					'The subject line of the task, such as “Call” or “Send Quote.” Limit: 255 characters. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Type Name or ID',
				name: 'type',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskTypes',
				},
				description:
					'Represents Type of the task, such as Call or Meeting. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'What ID',
				name: 'whatId',
				type: 'string',
				default: '',
				description:
					'The WhatId represents nonhuman objects such as accounts, opportunities, campaigns, cases, or custom objects. WhatIds are polymorphic. Polymorphic means a WhatId is equivalent to the ID of a related object.',
			},
			{
				displayName: 'Who ID',
				name: 'whoId',
				type: 'string',
				default: '',
				description:
					'The WhoId represents a human such as a lead or a contact. WhoIds are polymorphic. Polymorphic means a WhoId is equivalent to a contact’s ID or a lead’s ID.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
		description: 'ID of task that needs to be fetched',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Activity Date',
				name: 'activityDate',
				type: 'dateTime',
				default: '',
				description:
					'Represents the due date of the task. This field has a timestamp that is always set to midnight in the Coordinated Universal Time (UTC) time zone.',
			},
			{
				displayName: 'Call Disposition',
				name: 'callDisposition',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description:
					"Represents the result of a given call, for example, “we'll call back,” or “call unsuccessful.” Limit is 255 characters. Not subject to field-level security, available for any user in an organization with Salesforce CRM Call Center.",
			},
			{
				displayName: 'Call Duration In Seconds',
				name: 'callDurationInSeconds',
				type: 'number',
				default: '',
				description:
					'Duration of the call in seconds. Not subject to field-level security, available for any user in an organization with Salesforce CRM Call Center.',
			},
			{
				displayName: 'Call Object',
				name: 'callObject',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description:
					'Name of a call center. Limit is 255 characters. Not subject to field-level security, available for any user in an organization with Salesforce CRM Call Center.',
			},
			{
				displayName: 'Call Type Name or ID',
				name: 'callType',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskCallTypes',
				},
				description:
					'The type of call being answered: Inbound, Internal, or Outbound. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description:
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Contains a text description of the task',
			},
			{
				displayName: 'Is ReminderSet',
				name: 'isReminderSet',
				type: 'boolean',
				default: false,
				description: 'Whether a popup reminder has been set for the task (true) or not (false)',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description:
					'ID of the User who owns the record. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Priority Name or ID',
				name: 'priority',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskPriorities',
				},
				description:
					'Indicates the importance or urgency of a task, such as high or low. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Status Name or ID',
				name: 'status',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskStatuses',
				},
				description:
					'The current status of the task, such as In Progress or Completed. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Subject Name or ID',
				name: 'subject',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskSubjects',
				},
				description:
					'The subject line of the task, such as “Call” or “Send Quote.” Limit: 255 characters. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Recurrence Day Of Month',
				name: 'recurrenceDayOfMonth',
				type: 'number',
				default: '',
				description: 'The day of the month in which the task repeats',
			},
			{
				displayName: 'Recurrence Day Of Week Mask',
				name: 'recurrenceDayOfWeekMask',
				type: 'number',
				default: '',
				description:
					'The day or days of the week on which the task repeats. This field contains a bitmask. The values are as follows: Sunday = 1 Monday = 2 Tuesday = 4 Wednesday = 8 Thursday = 16 Friday = 32 Saturday = 64. Multiple days are represented as the sum of their numerical values. For example, Tuesday and Thursday = 4 + 16 = 20.',
			},
			{
				displayName: 'Recurrence End Date Only',
				name: 'recurrenceEndDateOnly',
				type: 'dateTime',
				default: '',
				description:
					'The last date on which the task repeats. This field has a timestamp that is always set to midnight in the Coordinated Universal Time (UTC) time zone.',
			},
			{
				displayName: 'Recurrence Instance Name or ID',
				name: 'recurrenceInstance',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTaskRecurrenceInstances',
				},
				default: '',
				description:
					'The frequency of the recurring task. For example, “2nd” or “3rd.”. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Recurrence Interval',
				name: 'recurrenceInterval',
				type: 'number',
				default: '',
				description: 'The interval between recurring tasks',
			},
			{
				displayName: 'Recurrence Month Of Year',
				name: 'recurrenceMonthOfYear',
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'January',
						value: 'January',
					},
					{
						name: 'February',
						value: 'February',
					},
					{
						name: 'March',
						value: 'March',
					},
					{
						name: 'April',
						value: 'April',
					},
					{
						name: 'May',
						value: 'May',
					},
					{
						name: 'June',
						value: 'June',
					},
					{
						name: 'July',
						value: 'July',
					},
					{
						name: 'August',
						value: 'August',
					},
					{
						name: 'September',
						value: 'September',
					},
					{
						name: 'October',
						value: 'October',
					},
					{
						name: 'November',
						value: 'November',
					},
					{
						name: 'December',
						value: 'December',
					},
				],
				default: '',
				description: 'The month of the year in which the task repeats',
			},
			{
				displayName: 'Recurrence Start Date Only',
				name: 'recurrenceEndDateOnly',
				type: 'dateTime',
				default: '',
				description:
					'The date when the recurring task begins. Must be a date and time before RecurrenceEndDateOnly.',
			},
			{
				displayName: 'Recurrence Regenerated Type',
				name: 'recurrenceRegeneratedType',
				type: 'options',
				default: '',
				options: [
					{
						name: 'After Due Date',
						value: 'RecurrenceRegenerateAfterDueDate',
					},
					{
						name: 'After Date Completed',
						value: 'RecurrenceRegenerateAfterToday',
					},
					{
						name: '(Task Closed)',
						value: 'RecurrenceRegenerated',
					},
				],
				description:
					'Represents what triggers a repeating task to repeat. Add this field to a page layout together with the RecurrenceInterval field, which determines the number of days between the triggering date (due date or close date) and the due date of the next repeating task in the series. Label is Repeat This Task.',
			},
			{
				displayName: 'Recurrence Type Name or ID',
				name: 'recurrenceType',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskRecurrenceTypes',
				},
				description:
					'Website for the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Recurrence TimeZone SidKey',
				name: 'recurrenceTimeZoneSidKey',
				type: 'string',
				default: '',
				description:
					'The time zone associated with the recurring task. For example, “UTC-8:00” for Pacific Standard Time.',
			},
			{
				displayName: 'Reminder Date Time',
				name: 'reminderDateTime',
				type: 'dateTime',
				default: '',
				description:
					'Represents the time when the reminder is scheduled to fire, if IsReminderSet is set to true. If IsReminderSet is set to false, then the user may have deselected the reminder checkbox in the Salesforce user interface, or the reminder has already fired at the time indicated by the value.',
			},
			{
				displayName: 'Type Name or ID',
				name: 'type',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTaskTypes',
				},
				description:
					'Represents Type of the task, such as Call or Meeting. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'What ID',
				name: 'whatId',
				type: 'string',
				default: '',
				description:
					'The WhatId represents nonhuman objects such as accounts, opportunities, campaigns, cases, or custom objects. WhatIds are polymorphic. Polymorphic means a WhatId is equivalent to the ID of a related object.',
			},
			{
				displayName: 'Who ID',
				name: 'whoId',
				type: 'string',
				default: '',
				description:
					'The WhoId represents a human such as a lead or a contact. WhoIds are polymorphic. Polymorphic means a WhoId is equivalent to a contact’s ID or a lead’s ID.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  task:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['get'],
			},
		},
		description: 'ID of task that needs to be fetched',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  task:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['delete'],
			},
		},
		description: 'ID of task that needs to be fetched',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Conditions',
				name: 'conditionsUi',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'The condition to set',
				default: {},
				options: [
					{
						name: 'conditionValues',
						displayName: 'Condition',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getTaskFields',
								},
								default: '',
								description:
									'For date, number, or boolean, please use expressions. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: '<',
										value: '<',
									},
									{
										name: '<=',
										value: '<=',
									},
									{
										name: '=',
										value: 'equal',
									},
									{
										name: '>',
										value: '>',
									},
									{
										name: '>=',
										value: '>=',
									},
								],
								default: 'equal',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields to include separated by ,',
			},
		],
	},
];
