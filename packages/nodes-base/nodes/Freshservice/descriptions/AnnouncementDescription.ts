import type { INodeProperties } from 'n8n-workflow';

export const announcementOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['announcement'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an announcement',
				action: 'Create an announcement',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an announcement',
				action: 'Delete an announcement',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an announcement',
				action: 'Get an announcement',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many announcements',
				action: 'Get many announcements',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an announcement',
				action: 'Update an announcement',
			},
		],
		default: 'create',
	},
];

export const announcementFields: INodeProperties[] = [
	// ----------------------------------------
	//           announcement: create
	// ----------------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'bodyHtml',
		description: 'HTML supported',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Visibility',
		name: 'visibility',
		type: 'options',
		required: true,
		default: 'everyone',
		options: [
			{
				name: 'Agents Only',
				value: 'agents_only',
			},
			{
				name: 'Agents and Groups',
				value: 'grouped_visibility',
			},
			{
				name: 'Everyone',
				value: 'everyone',
			},
		],
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Visible From',
		name: 'visibleFrom',
		description: 'Timestamp at which announcement becomes active',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Additional Emails',
				name: 'additional_emails',
				type: 'string',
				default: '',
				description:
					'Comma-separated additional email addresses to which the announcement needs to be sent',
			},
			{
				displayName: 'Department Names or IDs',
				name: 'departments',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated IDs of departments that may view this announcement. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Visible From',
				name: 'visible_from',
				description: 'Timestamp at which announcement is active',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Visible Until',
				name: 'visible_till',
				description: 'Timestamp until which announcement is active',
				type: 'dateTime',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//           announcement: delete
	// ----------------------------------------
	{
		displayName: 'Announcement ID',
		name: 'announcementId',
		description: 'ID of the announcement to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//            announcement: get
	// ----------------------------------------
	{
		displayName: 'Announcement ID',
		name: 'announcementId',
		description: 'ID of the announcement to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//           announcement: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//           announcement: update
	// ----------------------------------------
	{
		displayName: 'Announcement ID',
		name: 'announcementId',
		description: 'ID of the announcement to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['announcement'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Additional Emails',
				name: 'additional_emails',
				type: 'string',
				default: '',
				description:
					'Comma-separated additional email addresses to which the announcement needs to be sent',
			},
			{
				displayName: 'Body',
				name: 'body_html',
				type: 'string',
				default: '',
				description: 'HTML supported',
			},
			{
				displayName: 'Department Names or IDs',
				name: 'departments',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated IDs of departments that may view this announcement. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Visibility',
				name: 'visibility',
				type: 'options',
				default: 'everyone',
				options: [
					{
						name: 'Agents Only',
						value: 'agents_only',
					},
					{
						name: 'Agents and Groups',
						value: 'grouped_visibility',
					},
					{
						name: 'Everyone',
						value: 'everyone',
					},
				],
			},
		],
	},
];
