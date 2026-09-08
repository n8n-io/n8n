import type { INodeProperties } from 'n8n-workflow';

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				source: ['contentApi'],
				resource: ['post'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a post',
				action: 'Get a post',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many posts',
				action: 'Get many posts',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a post',
				action: 'Create a post',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a post',
				action: 'Delete a post',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a post',
				action: 'Get a post',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many posts',
				action: 'Get many posts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a post',
				action: 'Update a post',
			},
		],
		default: 'get',
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
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['create'],
			},
		},
		description: "Post's title",
	},
	{
		displayName: 'Content format',
		name: 'contentFormat',
		type: 'options',
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Mobile doc',
				value: 'mobileDoc',
			},
			{
				name: 'Lexical',
				value: 'lexical',
			},
		],
		default: 'html',
		description: 'The format of the post',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['create'],
				contentFormat: ['html'],
			},
		},
		default: '',
		description: 'The content of the post to create',
	},
	{
		displayName: 'Content (JSON)',
		name: 'content',
		type: 'json',
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['create'],
				contentFormat: ['mobileDoc'],
			},
		},

		default: '',
		description:
			'Mobiledoc is the raw JSON format that Ghost uses to store post contents. <a href="https://ghost.org/docs/concepts/posts/#document-storage">Info</a>.',
	},
	{
		displayName: 'Content (JSON)',
		name: 'content',
		type: 'json',
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['create'],
				contentFormat: ['lexical'],
			},
		},

		default: '',
		description: 'Lexical is the JSON format returned by the Ghost Default editor',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Author names or IDs',
				name: 'authors',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getAuthors',
				},
				default: [],
			},
			{
				displayName: 'Cannonical URL',
				name: 'canonical_url',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Code injection foot',
				name: 'codeinjection_foot',
				type: 'string',
				default: '',
				description: 'The Code Injection allows you inject a small snippet into your Ghost site',
			},
			{
				displayName: 'Code injection head',
				name: 'codeinjection_head',
				type: 'string',
				default: '',
				description: 'The Code Injection allows you inject a small snippet into your Ghost site',
			},
			{
				displayName: 'Featured',
				name: 'featured',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Meta description',
				name: 'meta_description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Meta title',
				name: 'meta_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Open Graph description',
				name: 'og_description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Open Graph image',
				name: 'og_image',
				type: 'string',
				default: '',
				description: 'URL of the image',
			},
			{
				displayName: 'Open Graph title',
				name: 'og_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Published at',
				name: 'published_at',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
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
						name: 'Published',
						value: 'published',
					},
					{
						name: 'Scheduled',
						value: 'scheduled',
					},
				],
				default: 'draft',
			},
			{
				displayName: 'Tag names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Twitter description',
				name: 'twitter_description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Twitter image',
				name: 'twitter_image',
				type: 'string',
				default: '',
				description: 'URL of the image',
			},
			{
				displayName: 'Twitter title',
				name: 'twitter_title',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                post:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['delete'],
			},
		},
		description: 'The ID of the post to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                                post:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'By',
		name: 'by',
		type: 'options',
		default: 'id',
		required: true,
		options: [
			{
				name: 'ID',
				value: 'id',
			},
			{
				name: 'Slug',
				value: 'slug',
			},
		],
		displayOptions: {
			show: {
				source: ['contentApi', 'adminApi'],
				resource: ['post'],
				operation: ['get'],
			},
		},
		description: 'Get the post either by slug or ID',
	},
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['contentApi', 'adminApi'],
				resource: ['post'],
				operation: ['get'],
			},
		},
		description: 'The ID or slug of the post to get',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-url
				description:
					'Limit the fields returned in the response object. E.g. for posts fields=title,url.',
			},
			{
				displayName: 'Formats',
				name: 'formats',
				type: 'multiOptions',
				options: [
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Mobile doc',
						value: 'mobiledoc',
					},
					{
						name: 'Lexical',
						value: 'lexical',
					},
				],
				default: ['mobiledoc'],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				source: ['contentApi'],
				resource: ['post'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-url
				description:
					'Limit the fields returned in the response object. E.g. for posts fields=title,url.',
			},
			{
				displayName: 'Formats',
				name: 'formats',
				type: 'multiOptions',
				options: [
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Plaintext',
						value: 'plaintext',
					},
				],
				default: ['html'],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                post:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				source: ['contentApi', 'adminApi'],
				resource: ['post'],
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
				source: ['adminApi', 'contentApi'],
				resource: ['post'],
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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				source: ['contentApi'],
				resource: ['post'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include',
				name: 'include',
				type: 'multiOptions',
				options: [
					{
						name: 'Authors',
						value: 'authors',
					},
					{
						name: 'Tags',
						value: 'tags',
					},
				],
				default: [],
				description:
					'Tells the API to return additional data related to the resource you have requested',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-url
				description:
					'Limit the fields returned in the response object. E.g. for posts fields=title,url.',
			},
			{
				displayName: 'Formats',
				name: 'formats',
				type: 'multiOptions',
				options: [
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Plaintext',
						value: 'plaintext',
					},
					{
						name: 'Lexical',
						value: 'lexical',
					},
				],
				default: ['html'],
				description:
					'By default, only html is returned, however each post and page in Ghost has 2 available formats: html and plaintext',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include',
				name: 'include',
				type: 'multiOptions',
				options: [
					{
						name: 'Authors',
						value: 'authors',
					},
					{
						name: 'Tags',
						value: 'tags',
					},
				],
				default: [],
				description:
					'Tells the API to return additional data related to the resource you have requested',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-url
				description:
					'Limit the fields returned in the response object. E.g. for posts fields=title,url.',
			},
			{
				displayName: 'Formats',
				name: 'formats',
				type: 'multiOptions',
				options: [
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Mobile doc',
						value: 'mobiledoc',
					},
					{
						name: 'Lexical',
						value: 'lexical',
					},
				],
				default: ['mobiledoc'],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                post:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The ID of the post to update',
	},
	{
		displayName: 'Content format',
		name: 'contentFormat',
		type: 'options',
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['update'],
			},
		},
		options: [
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Mobile doc',
				value: 'mobileDoc',
			},
			{
				name: 'Lexical',
				value: 'lexical',
			},
		],
		default: 'html',
		description: 'The format of the post',
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				source: ['adminApi'],
				resource: ['post'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Author names or IDs',
				name: 'authors',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getAuthors',
				},
				default: [],
			},
			{
				displayName: 'Cannonical URL',
				name: 'canonical_url',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Code injection foot',
				name: 'codeinjection_foot',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Code injection head',
				name: 'codeinjection_head',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				displayOptions: {
					show: {
						'/contentFormat': ['html'],
					},
				},
				default: '',
			},
			{
				displayName: 'Content (JSON)',
				name: 'contentJson',
				type: 'json',
				displayOptions: {
					show: {
						'/contentFormat': ['mobileDoc'],
					},
				},
				default: '',
				description:
					'Mobiledoc is the raw JSON format that Ghost uses to store post contents. <a href="https://ghost.org/docs/concepts/posts/#document-storage">Info.</a>.',
			},
			{
				displayName: 'Content (JSON)',
				name: 'contentJson',
				type: 'json',
				displayOptions: {
					show: {
						'/contentFormat': ['lexical'],
					},
				},
				default: '',
				description: 'Lexical is the JSON format returned by the Ghost Default editor',
			},
			{
				displayName: 'Featured',
				name: 'featured',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Meta description',
				name: 'meta_description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Meta title',
				name: 'meta_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Open Graph description',
				name: 'og_description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Open Graph image',
				name: 'og_image',
				type: 'string',
				default: '',
				description: 'URL of the image',
			},
			{
				displayName: 'Open Graph title',
				name: 'og_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Published at',
				name: 'published_at',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
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
						name: 'Published',
						value: 'published',
					},
					{
						name: 'Scheduled',
						value: 'scheduled',
					},
				],
				default: 'draft',
			},
			{
				displayName: 'Tag names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: "Post's title",
			},
			{
				displayName: 'Twitter description',
				name: 'twitter_description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Twitter image',
				name: 'twitter_image',
				type: 'string',
				default: '',
				description: 'URL of the image',
			},
			{
				displayName: 'Twitter title',
				name: 'twitter_title',
				type: 'string',
				default: '',
			},
		],
	},
];
