import { INodeProperties } from 'n8n-workflow';

export const engagementOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['engagement'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an engagement',
				action: 'Create an engagement',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an engagement',
				action: 'Delete an engagement',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an engagement',
				action: 'Get an engagement',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many engagements',
				action: 'Get many engagements',
			},
		],
		default: 'create',
	},
];

export const engagementFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                engagement:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Call',
				value: 'call',
			},
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'Meeting',
				value: 'meeting',
			},
			{
				name: 'Task',
				value: 'task',
			},
		],
		displayOptions: {
			show: {
				resource: ['engagement'],
				operation: ['create'],
			},
		},
		default: '',
	},
	{
		displayName: 'Metadata',
		name: 'metadata',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['engagement'],
				operation: ['create'],
				type: ['task'],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
			},
			{
				displayName: 'For Object Type',
				name: 'forObjectType',
				type: 'options',
				options: [
					{
						name: 'Company',
						value: 'COMPANY',
					},
					{
						name: 'Contact',
						value: 'CONTACT',
					},
				],
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Completed',
						value: 'COMPLETED',
					},
					{
						name: 'Deferred',
						value: 'DEFERRED',
					},
					{
						name: 'In Progress',
						value: 'IN_PROGRESS',
					},
					{
						name: 'Not Started',
						value: 'NOT_STARTED',
					},
					{
						name: 'Waiting',
						value: 'WAITING',
					},
				],
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Metadata',
		name: 'metadata',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['engagement'],
				operation: ['create'],
				type: ['email'],
			},
		},
		options: [
			{
				displayName: 'BCC',
				name: 'bcc',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add BCC',
				},
				default: '',
			},
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add CC',
				},
				default: '',
			},
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				default: '',
			},
			{
				displayName: 'From First Name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'From Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'To Emails',
				name: 'toEmail',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Email',
				},
				default: '',
			},
		],
	},
	{
		displayName: 'Metadata',
		name: 'metadata',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['engagement'],
				operation: ['create'],
				type: ['meeting'],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
			},
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Internal Meeting Notes',
				name: 'internalMeetingNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Metadata',
		name: 'metadata',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['engagement'],
				operation: ['create'],
				type: ['call'],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Duration Milliseconds',
				name: 'durationMilliseconds',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'From Number',
				name: 'fromNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Recording URL',
				name: 'recordingUrl',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Busy',
						value: 'BUSY',
					},
					{
						name: 'Calling CRM User',
						value: 'CALLING_CRM_USER',
					},
					{
						name: 'Canceled',
						value: 'CANCELED',
					},
					{
						name: 'Completed',
						value: 'COMPLETED',
					},
					{
						name: 'Connecting',
						value: 'CONNECTING',
					},
					{
						name: 'Failed',
						value: 'FAILED',
					},
					{
						name: 'In Progress',
						value: 'IN_PROGRESS',
					},
					{
						name: 'No Answer',
						value: 'NO_ANSWER',
					},
					{
						name: 'Queued',
						value: 'QUEUED',
					},
					{
						name: 'Ringing',
						value: 'RINGING',
					},
				],
				default: 'QUEUED',
			},
			{
				displayName: 'To Number',
				name: 'toNumber',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['engagement'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Associations',
				name: 'associations',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Company IDs',
						name: 'companyIds',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Contact IDs',
						name: 'contactIds',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Deals IDs',
						name: 'dealIds',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Owner IDs',
						name: 'ownerIds',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Ticket IDs',
						name: 'ticketIds',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  engagement:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Engagement ID',
		name: 'engagementId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['engagement'],
				operation: ['get', 'delete'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular engagement',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 engagement:getAll                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['engagement'],
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
				resource: ['engagement'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 100,
		description: 'Max number of results to return',
	},
];
