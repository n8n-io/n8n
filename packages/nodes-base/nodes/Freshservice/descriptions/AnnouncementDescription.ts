import {
	INodeProperties,
} from 'n8n-workflow';

export const announcementOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'announcement',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an announcement',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an announcement',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an announcement',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all announcements',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an announcement',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const announcementFields = [
	// ----------------------------------------
	//           announcement: create
	// ----------------------------------------
	{
		displayName: 'Title',
		name: 'title',
		description: 'Title of the announcement',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'announcement',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Body in HTML',
		name: 'body_html',
		description: 'Body of the announcement in HTML',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'announcement',
				],
				operation: [
					'create',
				],
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
				resource: [
					'announcement',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Visible From',
		name: 'visible_from',
		description: 'Timestamp at which announcement becomes active',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'announcement',
				],
				operation: [
					'create',
				],
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
				resource: [
					'announcement',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Additional Emails',
				name: 'additional_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated additional email addresses to which the announcement needs to be sent',
			},
			{
				displayName: 'Created By',
				name: 'created_by',
				type: 'options',
				default: '',
				description: 'ID of the agent who created this announcement',
				typeOptions: {
					loadOptionsMethod: [
						'getAgents',
					],
				},
			},
			{
				displayName: 'Departments',
				name: 'departments',
				type: 'multiOptions',
				default: [],
				description: 'Comma-separated IDs of departments that may view this announcement',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: 'active',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Archived',
						value: 'archived',
					},
					{
						name: 'Scheduled',
						value: 'scheduled',
					},
				],
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
				resource: [
					'announcement',
				],
				operation: [
					'delete',
				],
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
				resource: [
					'announcement',
				],
				operation: [
					'get',
				],
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
				resource: [
					'announcement',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'How many results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'announcement',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
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
				resource: [
					'announcement',
				],
				operation: [
					'update',
				],
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
				resource: [
					'announcement',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Additional Emails',
				name: 'additional_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated additional email addresses to which the announcement needs to be sent',
			},
			{
				displayName: 'Body in HTML',
				name: 'body_html',
				type: 'string',
				default: '',
				description: 'Body of the announcement in HTML',
			},
			{
				displayName: 'Departments',
				name: 'departments',
				type: 'multiOptions',
				default: [],
				description: 'Comma-separated IDs of departments that may view this announcement',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the announcement',
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
] as INodeProperties[];
