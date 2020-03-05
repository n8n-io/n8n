import { INodeProperties } from 'n8n-workflow';

export const messageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				name: 'Post',
				value: 'post',
				description: 'Post a message into a channel',
			},
		],
		default: 'post',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const messageFields = [

/* -------------------------------------------------------------------------- */
/*                                message:post                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel',
		name: 'channel',
		type: 'string',
		default: '',
		placeholder: 'Channel name',
		displayOptions: {
			show: {
				operation: [
					'post'
				],
				resource: [
					'message',
				],
			},
		},
		required: true,
		description: 'The channel to send the message to.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				operation: [
					'post'
				],
				resource: [
					'message',
				],
			},
		},
		description: 'The text to send.',
	},
	{
		displayName: 'As User',
		name: 'as_user',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: [
					'post'
				],
				resource: [
					'message',
				],
			},
		},
		description: 'Post the message as authenticated user instead of bot.',
	},
	{
		displayName: 'User Name',
		name: 'username',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				as_user: [
					false
				],
				operation: [
					'post'
				],
				resource: [
					'message',
				],
			},
		},
		description: 'Set the bot\'s user name.',
	},
	{
		displayName: 'Attachments',
		name: 'attachments',
		type: 'collection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add attachment',
		},
		displayOptions: {
			show: {
				operation: [
					'post'
				],
				resource: [
					'message',
				],
			},
		},
		default: {}, // TODO: Remove comment: has to make default array for the main property, check where that happens in UI
		description: 'The attachment to add',
		placeholder: 'Add attachment item',
		options: [
			{
				displayName: 'Fallback Text',
				name: 'fallback',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Required plain-text summary of the attachment.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text to send.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Title of the message.',
			},
			{
				displayName: 'Title Link',
				name: 'title_link',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Link of the title.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '#ff0000',
				description: 'Color of the line left of text.',
			},
			{
				displayName: 'Pretext',
				name: 'pretext',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text which appears before the message block.',
			},
			{
				displayName: 'Author Name',
				name: 'author_name',
				type: 'string',
				default: '',
				description: 'Name that should appear.',
			},
			{
				displayName: 'Author Link',
				name: 'author_link',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Link for the author.',
			},
			{
				displayName: 'Author Icon',
				name: 'author_icon',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Icon which should appear for the user.',
			},
			{
				displayName: 'Image URL',
				name: 'image_url',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'URL of image.',
			},
			{
				displayName: 'Thumbnail URL',
				name: 'thumb_url',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'URL of thumbnail.',
			},
			{
				displayName: 'Footer',
				name: 'footer',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text of footer to add.',
			},
			{
				displayName: 'Footer Icon',
				name: 'footer_icon',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Icon which should appear next to footer.',
			},
			{
				displayName: 'Timestamp',
				name: 'ts',
				type: 'dateTime',
				default: '',
				description: 'Time message relates to.',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				placeholder: 'Add Fields',
				description: 'Fields to add to message.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'item',
						displayName: 'Item',
						values: [
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
								description: 'Title of the item.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the item.',
							},
							{
								displayName: 'Short',
								name: 'short',
								type: 'boolean',
								default: true,
								description: 'If items can be displayed next to each other.',
							},
						]
					},
				],
			}
		],
	},
	{
		displayName: 'Other Options',
		name: 'otherOptions',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'post'
				],
				resource: [
					'message',
				],
			},
		},
		default: {},
		description: 'Other options to set',
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Icon Emoji',
				name: 'icon_emoji',
				type: 'string',
				displayOptions: {
					show: {
						'/as_user': [
							false
						],
						'/operation': [
							'post'
						],
						'/resource': [
							'message',
						],
					},
				},
				default: '',
				description: 'Emoji to use as the icon for this message. Overrides icon_url.',
			},
			{
				displayName: 'Icon URL',
				name: 'icon_url',
				type: 'string',
				displayOptions: {
					show: {
						'/as_user': [
							false
						],
						'/operation': [
							'post'
						],
						'/resource': [
							'message',
						],
					},
				},
				default: '',
				description: 'URL to an image to use as the icon for this message.',
			},
			{
				displayName: 'Make Reply',
				name: 'thread_ts',
				type: 'string',
				default: '',
				description: 'Provide another message\'s ts value to make this message a reply.',
			},
			{
				displayName: 'Unfurl Links',
				name: 'unfurl_links',
				type: 'boolean',
				default: false,
				description: 'Pass true to enable unfurling of primarily text-based content.',
			},
			{
				displayName: 'Unfurl Media',
				name: 'unfurl_media',
				type: 'boolean',
				default: true,
				description: 'Pass false to disable unfurling of media content.',
			},
			{
				displayName: 'Markdown',
				name: 'mrkdwn',
				type: 'boolean',
				default: true,
				description: 'Use Slack Markdown parsing.',
			},
			{
				displayName: 'Reply Broadcast',
				name: 'reply_broadcast',
				type: 'boolean',
				default: false,
				description: 'Used in conjunction with thread_ts and indicates whether reply should be made visible to everyone in the channel or conversation.',
			},
			{
				displayName: 'Link Names',
				name: 'link_names',
				type: 'boolean',
				default: false,
				description: 'Find and link channel names and usernames.',
			},
		],
	},
/* ----------------------------------------------------------------------- */
/*                                 message:update                          */
/* ----------------------------------------------------------------------- */
	{
		displayName: 'message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				]
			},
		},
		description: 'Id of message that needs to be fetched',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Activity Date',
				name: 'activityDate',
				type: 'dateTime',
				default: '',
				description: `Represents the due date of the message.<br/>
				This field has a timestamp that is always set to midnight <br/>
				in the Coordinated Universal Time (UTC) time zone.`,
			},
			{
				displayName: 'Call Disposition',
				name: 'callDisposition',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: `Represents the result of a given call, for example, “we'll call back,” or “call<br/>
				 unsuccessful.” Limit is 255 characters. Not subject to field-level security, available for any user<br/>
				  in an organization with Salesforce CRM Call Center.`,
			},
			{
				displayName: 'Call Duration In Seconds',
				name: 'callDurationInSeconds',
				type: 'number',
				default: '',
				description: `Duration of the call in seconds. Not subject to field-level security,<br/>
				 available for any user in an organization with Salesforce CRM Call Cente`,
			},
			{
				displayName: 'Call Object',
				name: 'callObject',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: `Name of a call center. Limit is 255 characters. <br/>
				Not subject to field-level security, available for any user in an <br/>
				organization with Salesforce CRM Call Center.`,
			},
			{
				displayName: 'Call Type',
				name: 'callType',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getmessageCallTypes',
				},
				description: 'The type of call being answered: Inbound, Internal, or Outbound.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Contains a text description of the message.',
			},
			{
				displayName: 'Is ReminderSet',
				name: 'isReminderSet',
				type: 'boolean',
				default: false,
				description: 'Indicates whether a popup reminder has been set for the message (true) or not (false).',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'ID of the User who owns the record.',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getmessagePriorities',
				},
				description: `Indicates the importance or urgency of a message, such as high or low.`,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getmessageStatuses',
				},
				description: 'The current status of the message, such as In Progress or Completed.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getmessageSubjects',
				},
				description: 'The subject line of the message, such as “Call” or “Send Quote.” Limit: 255 characters.',
			},
			{
				displayName: 'Recurrence Day Of Month',
				name: 'recurrenceDayOfMonth',
				type: 'number',
				default: '',
				description: 'The day of the month in which the message repeats.',
			},
			{
				displayName: 'Recurrence Day Of Week Mask',
				name: 'recurrenceDayOfWeekMask',
				type: 'number',
				default: '',
				description: `The day or days of the week on which the message repeats.<br/>
				This field contains a bitmask. The values are as follows: Sunday = 1 Monday = 2<br/>
				Tuesday = 4 Wednesday = 8 Thursday = 16 Friday = 32 Saturday = 64<br/>
				Multiple days are represented as the sum of their numerical values.<br/>
				For example, Tuesday and Thursday = 4 + 16 = 20.`,
			},
			{
				displayName: 'Recurrence End Date Only',
				name: 'recurrenceEndDateOnly',
				type: 'dateTime',
				default: '',
				description: `The last date on which the message repeats. This field has a timestamp that<br/>
				is always set to midnight in the Coordinated Universal Time (UTC) time zone.`,
			},
			{
				displayName: 'Recurrence Instance',
				name: 'recurrenceInstance',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getmessageRecurrenceInstances',
				},
				default: '',
				description: `The frequency of the recurring message. For example, “2nd” or “3rd.”`,
			},
			{
				displayName: 'Recurrence Interval',
				name: 'recurrenceInterval',
				type: 'number',
				default: '',
				description: 'The interval between recurring messages.',
			},
			{
				displayName: 'Recurrence Month Of Year',
				name: 'recurrenceMonthOfYear',
				type: 'options',
				options: [
					{
						name: 'January',
						value: 'January'
					},
					{
						name: 'February',
						value: 'February'
					},
					{
						name: 'March',
						value: 'March'
					},
					{
						name: 'April',
						value: 'April'
					},
					{
						name: 'May',
						value: 'May'
					},
					{
						name: 'June',
						value: 'June'
					},
					{
						name: 'July',
						value: 'July'
					},
					{
						name: 'August',
						value: 'August'
					},
					{
						name: 'September',
						value: 'September'
					},
					{
						name: 'October',
						value: 'October'
					},
					{
						name: 'November',
						value: 'November'
					},
					{
						name: 'December',
						value: 'December'
					}
				],
				default: '',
				description: 'The month of the year in which the message repeats.',
			},
			{
				displayName: 'Recurrence Start Date Only',
				name: 'recurrenceEndDateOnly',
				type: 'dateTime',
				default: '',
				description: `The date when the recurring message begins.<br/>
				Must be a date and time before RecurrenceEndDateOnly.`,
			},
			{
				displayName: 'Recurrence Regenerated Type',
				name: 'recurrenceRegeneratedType',
				type: 'options',
				default: '',
				options: [
					{
						name: 'After due date',
						value: 'RecurrenceRegenerateAfterDueDate'
					},
					{
						name: 'After date completed',
						value: 'RecurrenceRegenerateAfterToday'
					},
					{
						name: '(message Closed)',
						value: 'RecurrenceRegenerated'
					}
				],
				description: `Represents what triggers a repeating message to repeat.<br/>
				 Add this field to a page layout together with the RecurrenceInterval field,<br/>
				  which determines the number of days between the triggering date (due date or close date)<br/>
				  and the due date of the next repeating message in the series.Label is Repeat This message.`,
			},
			{
				displayName: 'Recurrence Type',
				name: 'recurrenceType',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getmessageRecurrenceTypes'
				},
				description: 'Website for the message.',
			},
			{
				displayName: 'Recurrence TimeZone SidKey',
				name: 'recurrenceTimeZoneSidKey',
				type: 'string',
				default: '',
				description: `The time zone associated with the recurring message.<br/>
				 For example, “UTC-8:00” for Pacific Standard Time.`,
			},
			{
				displayName: 'Reminder Date Time',
				name: 'reminderDateTime',
				type: 'dateTime',
				default: '',
				description: `Represents the time when the reminder is scheduled to fire,<br/>
				if IsReminderSet is set to true. If IsReminderSet is set to false, then the<br/>
				 user may have deselected the reminder checkbox in the Salesforce user interface,<br/>
				 or the reminder has already fired at the time indicated by the value.`,
			},
			{
				displayName: 'What Id',
				name: 'whatId',
				type: 'string',
				default: '',
				description: `The WhatId represents nonhuman objects such as accounts, opportunities,<br/>
				campaigns, cases, or custom objects. WhatIds are polymorphic. Polymorphic means a<br/>
				WhatId is equivalent to the ID of a related object.`,
			},
			{
				displayName: 'Who Id',
				name: 'whoId',
				type: 'string',
				default: '',
				description: `The WhoId represents a human such as a lead or a contact.<br/>
				WhoIds are polymorphic. Polymorphic means a WhoId is equivalent to a contact’s ID or a lead’s ID.`,
			},
		]
	},

/* -------------------------------------------------------------------------- */
/*                                  message:get                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'get',
				]
			},
		},
		description: 'Id of message that needs to be fetched',
	},
/* -------------------------------------------------------------------------- */
/*                                  message:delete                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'delete',
				]
			},
		},
		description: 'Id of message that needs to be fetched',
	},
/* -------------------------------------------------------------------------- */
/*                                 message:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'message',
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
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields to include separated by ,',
			},
		]
	},
] as INodeProperties[];
