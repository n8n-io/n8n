import {
	INodeProperties,
} from 'n8n-workflow';

export const ticketDescription: INodeProperties[] = [
	// ----------------------------------
	//           operations
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a ticket',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a ticket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a ticket',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all tickets',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a ticket',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		description: 'Title of the ticket to create',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Group',
		name: 'group',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadGroupNames',
		},
		placeholder: 'First-Level Helpdesk',
		description: 'Group that will own the ticket to create. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Customer Email',
		name: 'customerEmail',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadCustomers',
		},
		description: 'Email address of the customer concerned in the ticket to create. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
		default: '',
		placeholder: 'hello@n8n.io',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Article',
		name: 'article',
		type: 'fixedCollection',
		placeholder: 'Add Article',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Article Details',
				name: 'articleDetails',
				values: [
					{
						displayName: 'Subject',
						name: 'subject',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Body',
						name: 'body',
						type: 'string',
						default: '',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
					},
					{
						displayName: 'Visibility',
						name: 'visibility',
						type: 'options',
						default: 'internal',
						options: [
							{
								name: 'External',
								value: 'external',
								description: 'Visible to customers',
							},
							{
								name: 'Internal',
								value: 'internal',
								description: 'Visible to help desk',
							}
						],
					},
					{
						displayName: 'Article Type',
						name: 'type',
						type: 'options',
						// https://docs.zammad.org/en/latest/api/ticket/articles.html
						options: [
							{
								name: 'Chat',
								value: 'chat',
							},
							{
								name: 'Email',
								value: 'email',
							},
							{
								name: 'Fax',
								value: 'fax',
							},
							{
								name: 'Note',
								value: 'note',
							},
							{
								name: 'Phone',
								value: 'phone',
							},
							{
								name: 'SMS',
								value: 'sms',
							},
						],
						default: 'note',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customFieldPairs',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'loadUserCustomFields',
								},
								default: '',
								description: 'Name of the custom field to set',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set on the custom field',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Group',
				name: 'group',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'loadGroupNames',
				},
				placeholder: 'First-Level Helpdesk',
				description: 'Group that will own the ticket to create. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				default: '',
			},
			{
				displayName: 'Customer Email',
				name: 'customerEmail',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'loadCustomers',
				},
				description: 'Email address of the customer concerned in the ticket to create. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				default: '',
				placeholder: 'hello@n8n.io',
			},
			{
				displayName: 'Article',
				name: 'articleUi',
				type: 'fixedCollection',
				placeholder: 'Add Article',
				required: true,
				default: {},
				options: [
					{
						displayName: 'Article Details',
						name: 'articleDetails',
						values: [
							{
								displayName: 'Subject',
								name: 'subject',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Body',
								name: 'body',
								type: 'string',
								default: '',
								typeOptions: {
									alwaysOpenEditWindow: true,
								},
							},
							{
								displayName: 'Visibility',
								name: 'visibility',
								type: 'options',
								default: 'internal',
								options: [
									{
										name: 'External',
										value: 'external',
										description: 'Visible to customers',
									},
									{
										name: 'Internal',
										value: 'internal',
										description: 'Visible to help desk',
									}
								],
							},
							{
								displayName: 'Article Type',
								name: 'type',
								type: 'options',
								// https://docs.zammad.org/en/latest/api/ticket/articles.html
								options: [
									{
										name: 'Chat',
										value: 'chat',
									},
									{
										name: 'Email',
										value: 'email',
									},
									{
										name: 'Fax',
										value: 'fax',
									},
									{
										name: 'Note',
										value: 'note',
									},
									{
										name: 'Phone',
										value: 'phone',
									},
									{
										name: 'SMS',
										value: 'sms',
									},
								],
								default: 'note',
							},
						],
					},
				],
			},
		],
	},
	// {
	// 	displayName: 'Article Additional Fields',
	// 	name: 'additionalFieldsArticle',
	// 	type: 'collection',
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'create',
	// 				'update',
	// 			],
	// 			resource: [
	// 				'ticket',
	// 			],
	// 		},
	// 	},
	// 	default: {},
	// 	placeholder: 'Add Field',
	// 	options: [
	// 		{
	// 			displayName: 'CC',
	// 			name: 'cc',
	// 			type: 'string',
	// 			default: '',
	// 		},
	// 		{
	// 			displayName: 'Content Type',
	// 			name: 'content_type',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The content type of the article',
	// 		},
	// 		{
	// 			displayName: 'In Reply To',
	// 			name: 'in_reply_to',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'What this article is a reply to',
	// 		},
	// 		{
	// 			displayName: 'Internal?',
	// 			name: 'internal',
	// 			type: 'boolean',
	// 			default: false,
	// 			description: 'Whether the article is internal',
	// 		},
	// 		{
	// 			displayName: 'Message ID',
	// 			name: 'message_id',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The message ID',
	// 		},
	// 		{
	// 			displayName: 'Reply To',
	// 			name: 'reply_to',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The reply to info',
	// 		},
	// 		{
	// 			displayName: 'To',
	// 			name: 'to',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The recipient',
	// 		},
	// 		{
	// 			displayName: 'Subject',
	// 			name: 'subject',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The subject of the article',
	// 		},
	// 		{
	// 			displayName: 'Time Unit',
	// 			name: 'time_unit',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The time unit of the article. This is ignored by the API but documented, so it is left here.',
	// 		},
	// 		{
	// 			displayName: 'Type',
	// 			name: 'type',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The type of the article',
	// 		},
	// 	],
	// },
	// {
	// 	displayName: 'Query',
	// 	name: 'query',
	// 	type: 'string',
	// 	default: '',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'ticket',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 		},
	// 	},
	// },
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'ticket',
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
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'ticket',
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Query to filter results by',
				placeholder: 'user.firstname:john',
			},
			{
				displayName: 'Sort',
				name: 'sortUi',
				type: 'fixedCollection',
				placeholder: 'Add Sort Options',
				default: {},
				options: [
					{
						displayName: 'Sort Options',
						name: 'sortDetails',
						values: [
							{
								displayName: 'Sort Key',
								name: 'sort_by',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'loadTicketFields',
								},
								default: '',
							},
							{
								displayName: 'Sort Order',
								name: 'order_by',
								type: 'options',
								options: [
									{
										name: 'Ascending',
										value: 'asc',
									},
									{
										name: 'Descending',
										value: 'desc',
									},
								],
								default: 'asc',
							},
						],
					},
				],
			},
		],
	},
];
