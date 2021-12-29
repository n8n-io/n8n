import {
	INodeProperties,
} from 'n8n-workflow';

export const engagementOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'engagement',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an engagement',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an engagement',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an engagement',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all engagements',
			},
		],
		default: 'create',
		description: 'The operation to perform',
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
				resource: [
					'engagement',
				],
				operation: [
					'create',
				],
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
				resource: [
					'engagement',
				],
				operation: [
					'create',
				],
				type: [
					'task',
				],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				description: '',
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
				description: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Not Started',
						value: 'NOT_STARTED',
					},
					{
						name: 'In Progress',
						value: 'IN_PROGRESS',
					},
					{
						name: 'Waiting',
						value: 'WAITING',
					},
					{
						name: 'Completed',
						value: 'COMPLETED',
					},
					{
						name: 'Deferred',
						value: 'DEFERRED',
					},
				],
				default: '',
				description: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: '',
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
				resource: [
					'engagement',
				],
				operation: [
					'create',
				],
				type: [
					'email',
				],
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
				description: '',
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
				description: '',
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
				description: '',
			},
			{
				displayName: 'From Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: '',
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
				description: '',
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
				resource: [
					'engagement',
				],
				operation: [
					'create',
				],
				type: [
					'meeting',
				],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'dateTime',
				default: '',
				description: '',
			},
			{
				displayName: 'Internal Meeting Notes',
				name: 'internalMeetingNotes',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: '',
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
				resource: [
					'engagement',
				],
				operation: [
					'create',
				],
				type: [
					'call',
				],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'Duration Milliseconds',
				name: 'durationMilliseconds',
				type: 'number',
				default: 0,
				description: '',
			},
			{
				displayName: 'From Number',
				name: 'fromNumber',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'Recording URL',
				name: 'recordingUrl',
				type: 'string',
				default: '',
				description: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Queued',
						value: 'QUEUED',
					},
					{
						name: 'Ringing',
						value: 'RINGING',
					},
					{
						name: 'In Progress',
						value: 'IN_PROGRESS',
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
						name: 'Busy',
						value: 'BUSY',
					},
					{
						name: 'Failed',
						value: 'FAILED',
					},
					{
						name: 'No Answer',
						value: 'NO_ANSWER',
					},
					{
						name: 'Connecting',
						value: 'CONNECTING',
					},
					{
						name: 'Calling CRM User',
						value: 'CALLING_CRM_USER',
					},
				],
				default: 'QUEUED',
				description: '',
			},
			{
				displayName: 'To Number',
				name: 'toNumber',
				type: 'string',
				default: '',
				description: '',
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
				resource: [
					'engagement',
				],
				operation: [
					'create',
				],
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
						description: '',
					},
					{
						displayName: 'Contact IDs',
						name: 'contactIds',
						type: 'string',
						default: '',
						description: '',
					},
					{
						displayName: 'Deals IDs',
						name: 'dealIds',
						type: 'string',
						default: '',
						description: '',
					},
					{
						displayName: 'Owner IDs',
						name: 'ownerIds',
						type: 'string',
						default: '',
						description: '',
					},
					{
						displayName: 'Ticket IDs',
						name: 'ticketIds',
						type: 'string',
						default: '',
						description: '',
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
				resource: [
					'engagement',
				],
				operation: [
					'get',
					'delete',
				],
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
				resource: [
					'engagement',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'engagement',
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
			maxValue: 250,
		},
		default: 100,
		description: 'How many results to return',
	},
];
