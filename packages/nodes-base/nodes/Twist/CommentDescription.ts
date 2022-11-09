import { INodeProperties } from 'n8n-workflow';

export const commentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['comment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new comment to a thread',
				action: 'Create a comment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a comment',
				action: 'Delete a comment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get information about a comment',
				action: 'Get a comment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all comments',
				action: 'Get many comments',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a comment',
				action: 'Update a comment',
			},
		],
		default: 'create',
	},
];

export const commentFields: INodeProperties[] = [
	/*-------------------------------------------------------------------------- */
	/*                                comment:create                             */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['comment'],
			},
		},
		required: true,
		description: 'The ID of the thread',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['comment'],
			},
		},
		required: true,
		description: 'The content of the comment',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['create'],
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
										action: ['send_reply', 'prefill_message'],
									},
								},
								description: 'The text for the action button',
								default: '',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description:
									'The type of the button. (Currently only <code>action</code> is available).',
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
										action: ['open_url'],
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
				description:
					'Name of the property that holds the binary data. Multiple can be defined separated by comma.',
			},
			{
				displayName: 'Direct Mention Names or IDs',
				name: 'direct_mentions',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: ['workspaceId'],
				},
				default: [],
				description:
					'The users that are directly mentioned. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Mark Thread Position',
				name: 'mark_thread_position',
				type: 'boolean',
				default: true,
				description: 'Whether the position of the thread is marked',
			},
			{
				displayName: 'Recipient Names or IDs',
				name: 'recipients',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: ['workspaceId'],
				},
				default: [],
				description:
					'The users that will attached to the comment. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Temporary ID',
				name: 'temp_id',
				type: 'number',
				default: 0,
				description: 'The temporary ID of the comment',
			},
			{
				displayName: 'Send as Integration',
				name: 'send_as_integration',
				type: 'boolean',
				default: false,
				description: 'Whether to display the integration as the comment creator',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  comment:get/delete                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['get', 'delete'],
				resource: ['comment'],
			},
		},
		required: true,
		description: 'The ID of the comment',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 comment:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['comment'],
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
				resource: ['comment'],
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
				resource: ['comment'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'As IDs',
				name: 'as_ids',
				type: 'boolean',
				default: false,
				description: 'Whether only the IDs of the comments are returned',
			},
			{
				displayName: 'Ending Object Index',
				name: 'to_obj_index',
				type: 'number',
				default: 50,
				description: 'Limit comments ending at the specified object index',
			},
			{
				displayName: 'Newer Than',
				name: 'newer_than_ts',
				type: 'dateTime',
				default: '',
				description: 'Limits comments to those newer when the specified Unix time',
			},
			{
				displayName: 'Older Than',
				name: 'older_than_ts',
				type: 'dateTime',
				default: '',
				description: 'Limits comments to those older than the specified Unix time',
			},
			{
				displayName: 'Order By',
				name: 'order_by',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'ASC',
					},
					{
						name: 'DESC',
						value: 'DESC',
					},
				],
				default: 'ASC',
				description: 'The order of the comments returned - one of DESC or ASC',
			},
			{
				displayName: 'Starting Object Index',
				name: 'from_obj_index',
				type: 'number',
				default: 0,
				description: 'Limit comments starting at the specified object index',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  comment:update                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['comment'],
			},
		},
		required: true,
		description: 'The ID of the comment',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['update'],
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
										action: ['send_reply', 'prefill_message'],
									},
								},
								description: 'The text for the action button',
								default: '',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description:
									'The type of the button. (Currently only <code>action</code> is available).',
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
										action: ['open_url'],
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
				description:
					'Name of the property that holds the binary data. Multiple can be defined separated by comma.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content of the comment',
			},
			{
				displayName: 'Direct Mention Names or IDs',
				name: 'direct_mentions',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: ['workspaceId'],
				},
				default: [],
				description:
					'The users that are directly mentioned. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
];
