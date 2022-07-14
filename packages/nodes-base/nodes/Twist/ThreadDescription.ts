import {
	INodeProperties,
} from 'n8n-workflow';

export const threadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new thread in a channel',
				action: 'Create a thread',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a thread',
				action: 'Delete a thread',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get information about a thread',
				action: 'Get a thread',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all threads',
				action: 'Get all threads',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a thread',
				action: 'Update a thread',
			},
		],
		default: 'create',
	},
];

export const threadFields: INodeProperties[] = [
	/*-------------------------------------------------------------------------- */
	/*                                thread:create                              */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'thread',
				],
			},
		},
		required: true,
		description: 'The ID of the channel',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'thread',
				],
			},
		},
		required: true,
		description: 'The title of the new thread (1 < length < 300)',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'thread',
				],
			},
		},
		required: true,
		description: 'The content of the thread',
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
					'thread',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Actions',
				name: 'actionsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Action',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Action',
						name: 'actionValues',
						values: [
							{
								displayName: 'Action',
								name: 'action',
								type: 'options',
								description: 'The action of the button',
								options: [
									{
										name: 'Open URL',
										value: 'open_url',
									},
									{
										name: 'Prefill Message',
										value: 'prefill_message',
									},
									{
										name: 'Send Reply',
										value: 'send_reply',
									},
								],
								default: '',
							},
							{
								displayName: 'Button Text',
								name: 'button_text',
								type: 'string',
								description: 'The text for the action button',
								default: '',
							},
							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								displayOptions: {
									show: {
										action: [
											'send_reply',
											'prefill_message',
										],
									},
								},
								description: 'The text for the action button',
								default: '',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description: 'The type of the button. (Currently only <code>action</code> is available).',
								options: [
									{
										name: 'Action',
										value: 'action',
									},
								],
								default: '',
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								displayOptions: {
									show: {
										action: [
											'open_url',
										],
									},
								},
								description: 'URL to redirect',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Attachments',
				name: 'binaryProperties',
				type: 'string',
				default: 'data',
				description: 'Name of the property that holds the binary data. Multiple can be defined separated by comma.',
			},
			{
				displayName: 'Direct Mention Names or IDs',
				name: 'direct_mentions',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: [
						'workspaceId',
					],
				},
				default: [],
				description: 'The users that are directly mentioned. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Recipient Names or IDs',
				name: 'recipients',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: [
						'workspaceId',
					],
				},
				default: [],
				description: 'The users that will attached to the thread. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Send as Integration',
				name: 'send_as_integration',
				type: 'boolean',
				default: false,
				description: 'Whether to display the integration as the thread creator',
			},
			{
				displayName: 'Temporary ID',
				name: 'temp_id',
				type: 'number',
				default: 0,
				description: 'The temporary ID of the thread',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  thread:get/delete                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'get',
					'delete',
				],
				resource: [
					'thread',
				],
			},
		},
		required: true,
		description: 'The ID of the thread',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 thread:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'thread',
				],
			},
		},
		required: true,
		description: 'The ID of the channel',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'thread',
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
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'As IDs',
				name: 'as_ids',
				type: 'boolean',
				default: false,
				description: 'Whether only the IDs of the threads are returned',
			},
			{
				displayName: 'Filter By',
				name: 'filter_by',
				type: 'options',
				options: [
					{
						name: 'Attached to Me',
						value: 'attached_to_me',
					},
					{
						name: 'Everyone',
						value: 'everyone',
					},
					{
						name: 'Starred',
						value: 'is_starred',
					},
				],
				default: '',
				description: 'A filter can be one of <code>attached_to_me</code>, <code>everyone</code> and <code>is_starred</code>',
			},
			{
				displayName: 'Newer Than',
				name: 'newer_than_ts',
				type: 'dateTime',
				default: '',
				description: 'Limits threads to those newer when the specified Unix time',
			},
			{
				displayName: 'Older Than',
				name: 'older_than_ts',
				type: 'dateTime',
				default: '',
				description: 'Limits threads to those older than the specified Unix time',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  thread:update                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'thread',
				],
			},
		},
		required: true,
		description: 'The ID of the thread',
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
					'thread',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Actions',
				name: 'actionsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Action',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Action',
						name: 'actionValues',
						values: [
							{
								displayName: 'Action',
								name: 'action',
								type: 'options',
								description: 'The action of the button',
								options: [
									{
										name: 'Open URL',
										value: 'open_url',
									},
									{
										name: 'Prefill Message',
										value: 'prefill_message',
									},
									{
										name: 'Send Reply',
										value: 'send_reply',
									},
								],
								default: '',
							},
							{
								displayName: 'Button Text',
								name: 'button_text',
								type: 'string',
								description: 'The text for the action button',
								default: '',
							},
							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								displayOptions: {
									show: {
										action: [
											'send_reply',
											'prefill_message',
										],
									},
								},
								description: 'The text for the action button',
								default: '',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description: 'The type of the button. (Currently only <code>action</code> is available).',
								options: [
									{
										name: 'Action',
										value: 'action',
									},
								],
								default: '',
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								displayOptions: {
									show: {
										action: [
											'open_url',
										],
									},
								},
								description: 'URL to redirect',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Attachments',
				name: 'binaryProperties',
				type: 'string',
				default: 'data',
				description: 'Name of the property that holds the binary data. Multiple can be defined separated by comma.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content of the thread',
			},
			{
				displayName: 'Direct Mention Names or IDs',
				name: 'direct_mentions',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: [
						'workspaceId',
					],
				},
				default: [],
				description: 'The users that are directly mentioned. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title of the thread (1 < length < 300)',
			},
		],
	},
];
