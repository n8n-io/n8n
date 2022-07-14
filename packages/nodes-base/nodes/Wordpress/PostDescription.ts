import { INodeProperties } from 'n8n-workflow';

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'post',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a post',
				action: 'Create a post',
			},
			// {
			// 	name: 'Delete',
			// 	value: 'delete',
			// 	description: 'Delete a post',
			// },
			{
				name: 'Get',
				value: 'get',
				description: 'Get a post',
				action: 'Get a post',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all posts',
				action: 'Get all posts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a post',
				action: 'Update a post',
			},
		],
		default: 'create',
	},
];

export const postFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                post:create                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The title for the post',
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
					'post',
				],
				operation: [
					'create',
				],
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
				description: 'The ID for the author of the object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The content for the post',
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
				description: 'A named status for the post',
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
				description: 'Whether or not comments are open on the post',
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
				description: 'If the a message should be send to announce the post',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Aside',
						value: 'aside',
					},
					{
						name: 'Audio',
						value: 'audio',
					},
					{
						name: 'Chat',
						value: 'chat',
					},
					{
						name: 'Gallery',
						value: 'gallery',
					},
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Link',
						value: 'link',
					},
					{
						name: 'Quote',
						value: 'quote',
					},
					{
						name: 'Standard',
						value: 'standard',
					},
					{
						name: 'Status',
						value: 'status',
					},
					{
						name: 'Video',
						value: 'video',
					},
				],
				default: 'standard',
				description: 'Whether or not comments are open on the post',
			},
			{
				displayName: 'Sticky',
				name: 'sticky',
				type: 'boolean',
				default: false,
				description: 'Whether or not the object should be treated as sticky',
			},
			{
				displayName: 'Category Names or IDs',
				name: 'categories',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				default: [],
				description: 'The terms assigned to the object in the category taxonomy. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'The terms assigned to the object in the post_tag taxonomy. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Template',
				name: 'postTemplate',
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
										elementor: [ false ],
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
										elementor: [ true ],
									},
								},
							},
						],
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 post:update                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'update',
				],
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
				resource: [
					'post',
				],
				operation: [
					'update',
				],
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
				description: 'The ID for the author of the object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title for the post',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The content for the post',
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
				description: 'A named status for the post',
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
				description: 'Whether or not comments are open on the post',
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
				description: 'Whether or not comments are open on the post',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Aside',
						value: 'aside',
					},
					{
						name: 'Audio',
						value: 'audio',
					},
					{
						name: 'Chat',
						value: 'chat',
					},
					{
						name: 'Gallery',
						value: 'gallery',
					},
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Link',
						value: 'link',
					},
					{
						name: 'Quote',
						value: 'quote',
					},
					{
						name: 'Standard',
						value: 'standard',
					},
					{
						name: 'Status',
						value: 'status',
					},
					{
						name: 'Video',
						value: 'video',
					},
				],
				default: 'standard',
				description: 'The format of the post',
			},
			{
				displayName: 'Sticky',
				name: 'sticky',
				type: 'boolean',
				default: false,
				description: 'Whether or not the object should be treated as sticky',
			},
			{
				displayName: 'Category Names or IDs',
				name: 'categories',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				default: [],
				description: 'The terms assigned to the object in the category taxonomy. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'The terms assigned to the object in the post_tag taxonomy. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Template',
				name: 'postTemplate',
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
										elementor: [ false ],
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
										elementor: [ true ],
									},
								},
							},
						],
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                  post:get                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Unique identifier for the object',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'The password for the post if it is password protected',
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
/*                                   post:getAll                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'post',
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
					'post',
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
			maxValue: 10,
		},
		default: 5,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'After',
				name: 'after',
				type: 'dateTime',
				default: '',
				description: 'Limit response to posts published after a given ISO8601 compliant date',
			},
			{
				displayName: 'Author Names or IDs',
				name: 'author',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getAuthors',
				},
				description: 'Limit result set to posts assigned to specific authors. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Before',
				name: 'before',
				type: 'dateTime',
				default: '',
				description: 'Limit response to posts published before a given ISO8601 compliant date',
			},
			{
				displayName: 'Category Names or IDs',
				name: 'categories',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				description: 'Limit result set to all items that have the specified term assigned in the categories taxonomy. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
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
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Exclude Categories',
				name: 'excludedCategories',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				description: 'Limit result set to all items except those that have the specified term assigned in the categories taxonomy. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Exclude Tags',
				name: 'excludedTags',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				description: 'Limit result set to all items except those that have the specified term assigned in the tags taxonomy. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
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
				description: 'The status of the post',
			},
			{
				displayName: 'Sticky',
				name: 'sticky',
				type: 'boolean',
				default: false,
				description: 'Whether to limit the result set to items that are sticky',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				description: 'Limit result set to all items that have the specified term assigned in the tags taxonomy. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 post:delete                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Unique identifier for the object',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'delete',
				],
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
