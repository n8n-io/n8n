import type { INodeProperties } from 'n8n-workflow';

export const pageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['page'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a page',
				action: 'Create a page',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a page',
				action: 'Get a page',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many pages',
				action: 'Get many pages',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a page',
				action: 'Update a page',
			},
		],
		default: 'create',
	},
];

export const pageFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                page:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['create'],
			},
		},
		description: 'The title for the page',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Author Name or ID',
				name: 'authorId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAuthors',
				},
				default: '',
				description:
					'The ID for the author of the object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Parent ID',
				name: 'parent',
				type: 'number',
				default: '',
				description: 'The ID for the parent of the post',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content for the page',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'An alphanumeric identifier for the object unique to its type',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'A password to protect access to the content and excerpt',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Draft',
						value: 'draft',
					},
					{
						name: 'Future',
						value: 'future',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Publish',
						value: 'publish',
					},
				],
				default: 'draft',
				description: 'A named status for the page',
			},
			{
				displayName: 'Comment Status',
				name: 'commentStatus',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Close',
						value: 'closed',
					},
				],
				default: 'open',
				description: 'Whether or not comments are open on the page',
			},
			{
				displayName: 'Ping Status',
				name: 'pingStatus',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Close',
						value: 'closed',
					},
				],
				default: 'open',
				description: 'If the a message should be send to announce the page',
			},
			{
				displayName: 'Template',
				name: 'pageTemplate',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Elementor Template',
								name: 'elementor',
								type: 'boolean',
								default: true,
								description: 'Whether site uses elementor page builder',
							},
							{
								displayName: 'Template',
								name: 'template',
								type: 'string',
								default: '',
								description: 'The theme file to use',
								displayOptions: {
									show: {
										elementor: [false],
									},
								},
							},
							{
								displayName: 'Template',
								name: 'template',
								type: 'options',
								options: [
									{
										name: 'Standard',
										value: '',
									},
									{
										name: 'Elementor Canvas',
										value: 'elementor_canvas',
									},
									{
										name: 'Elementor Header Footer',
										value: 'elementor_header_footer',
									},
									{
										name: 'Elementor Theme',
										value: 'elementor_theme',
									},
								],
								default: '',
								description: 'The Elementor template to use',
								displayOptions: {
									show: {
										elementor: [true],
									},
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Menu Order',
				name: 'menuOrder',
				type: 'number',
				default: 0,
				description: 'The order of the page in relation to other pages',
			},
			{
				displayName: 'Featured Media ID',
				name: 'featuredMediaId',
				type: 'number',
				default: '',
				description: 'The ID of the featured media for the page',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 page:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['update'],
			},
		},
		description: 'Unique identifier for the object',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Author Name or ID',
				name: 'authorId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAuthors',
				},
				default: '',
				description:
					'The ID for the author of the object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Parent ID',
				name: 'parent',
				type: 'number',
				default: '',
				description: 'The ID for the parent of the post',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title for the page',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content for the page',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'An alphanumeric identifier for the object unique to its type',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'A password to protect access to the content and excerpt',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Draft',
						value: 'draft',
					},
					{
						name: 'Future',
						value: 'future',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Publish',
						value: 'publish',
					},
				],
				default: 'draft',
				description: 'A named status for the page',
			},
			{
				displayName: 'Comment Status',
				name: 'commentStatus',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Close',
						value: 'closed',
					},
				],
				default: 'open',
				description: 'Whether or not comments are open on the page',
			},
			{
				displayName: 'Ping Status',
				name: 'pingStatus',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Close',
						value: 'closed',
					},
				],
				default: 'open',
				description: 'Whether or not comments are open on the page',
			},
			{
				displayName: 'Template',
				name: 'pageTemplate',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Elementor Template',
								name: 'elementor',
								type: 'boolean',
								default: true,
								description: 'Whether site uses elementor page builder',
							},
							{
								displayName: 'Template',
								name: 'template',
								type: 'string',
								default: '',
								description: 'The theme file to use',
								displayOptions: {
									show: {
										elementor: [false],
									},
								},
							},
							{
								displayName: 'Template',
								name: 'template',
								type: 'options',
								options: [
									{
										name: 'Standard',
										value: '',
									},
									{
										name: 'Elementor Canvas',
										value: 'elementor_canvas',
									},
									{
										name: 'Elementor Header Footer',
										value: 'elementor_header_footer',
									},
									{
										name: 'Elementor Theme',
										value: 'elementor_theme',
									},
								],
								default: '',
								description: 'The Elementor template to use',
								displayOptions: {
									show: {
										elementor: [true],
									},
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Menu Order',
				name: 'menuOrder',
				type: 'number',
				default: 0,
				description: 'The order of the page in relation to other pages',
			},
			{
				displayName: 'Comment Status',
				name: 'commentStatus',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Closed',
						value: 'closed',
					},
				],
				default: 'open',
				description: 'Whether or not comments are open on the page',
			},
			{
				displayName: 'Featured Media ID',
				name: 'featuredMediaId',
				type: 'number',
				default: '',
				description: 'The ID of the featured media for the page',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  page:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier for the object',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The password for the page if it is password protected',
			},
			{
				displayName: 'Context',
				name: 'context',
				type: 'options',
				options: [
					{
						name: 'View',
						value: 'view',
					},
					{
						name: 'Embed',
						value: 'embed',
					},
					{
						name: 'Edit',
						value: 'edit',
					},
				],
				default: 'view',
				description: 'Scope under which the request is made; determines fields present in response',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                   page:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['page'],
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
				resource: ['page'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'After',
				name: 'after',
				type: 'dateTime',
				default: '',
				description: 'Limit response to pages published after a given ISO8601 compliant date',
			},
			{
				displayName: 'Author Names or IDs',
				name: 'author',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getAuthors',
				},
				description:
					'Limit result set to pages assigned to specific authors. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Before',
				name: 'before',
				type: 'dateTime',
				default: '',
				description: 'Limit response to pages published before a given ISO8601 compliant date',
			},
			{
				displayName: 'Context',
				name: 'context',
				type: 'options',
				options: [
					{
						name: 'View',
						value: 'view',
					},
					{
						name: 'Embed',
						value: 'embed',
					},
					{
						name: 'Edit',
						value: 'edit',
					},
				],
				default: 'view',
				description: 'Scope under which the request is made; determines fields present in response',
			},
			{
				displayName: 'Menu Order',
				name: 'menuOrder',
				type: 'number',
				default: 0,
				description: 'Limit result set to items with a specific menu order value',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: 'desc',
				description: 'Order sort attribute ascending or descending',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				options: [
					{
						name: 'Author',
						value: 'author',
					},
					{
						name: 'Date',
						value: 'date',
					},
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Include',
						value: 'include',
					},
					{
						name: 'Include Slugs',
						value: 'include_slugs',
					},
					{
						name: 'Modified',
						value: 'modified',
					},
					{
						name: 'Parent',
						value: 'parent',
					},
					{
						name: 'Relevance',
						value: 'relevance',
					},
					{
						name: 'Slug',
						value: 'slug',
					},
					{
						name: 'Title',
						value: 'title',
					},
				],
				default: 'id',
				description: 'Sort collection by object attribute',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Current page of the collection',
			},
			{
				displayName: 'Parent Page ID',
				name: 'parent',
				type: 'number',
				default: '',
				description: 'Limit result set to items with a particular parent page ID',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Limit results to those matching a string',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Draft',
						value: 'draft',
					},
					{
						name: 'Future',
						value: 'future',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Publish',
						value: 'publish',
					},
				],
				default: 'publish',
				description: 'The status of the page',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 page:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['delete'],
			},
		},
		description: 'Unique identifier for the object',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['delete'],
			},
		},
		options: [
			{
				displayName: 'Force',
				name: 'force',
				type: 'boolean',
				default: false,
				description: 'Whether to bypass trash and force deletion',
			},
		],
	},
];
