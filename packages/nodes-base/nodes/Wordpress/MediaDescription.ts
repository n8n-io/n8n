import type { INodeProperties } from 'n8n-workflow';

export const mediaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['media'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a media item',
				action: 'Create a media item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a media item',
				action: 'Delete a media item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a media item',
				action: 'Get a media item',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many media items',
				action: 'Get many media items',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a media item',
				action: 'Update a media item',
			},
		],
		default: 'create',
	},
];

export const mediaFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                media:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		placeholder: 'image.png',
		description: 'The name of the file to upload',
		displayOptions: {
			show: {
				resource: ['media'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['media'],
				operation: ['create'],
			},
		},
		description: 'Name of the binary property which contains the data for the file to be uploaded',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['media'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Alt Text',
				name: 'altText',
				type: 'string',
				default: '',
				description: 'Alternative text to display when attachment is not displayed',
			},
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
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				default: '',
				description: 'The caption for the attachment',
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description for the attachment',
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
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				default: '',
				description: 'The ID of the associated post of the attachment',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title for the attachment',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                media:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['media'],
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
				resource: ['media'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Alt Text',
				name: 'altText',
				type: 'string',
				default: '',
				description: 'Alternative text to display when attachment is not displayed',
			},
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
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				default: '',
				description: 'The caption for the attachment',
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description for the attachment',
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
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				default: '',
				description: 'The ID of the associated post of the attachment',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title for the attachment',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  media:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['media'],
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
				resource: ['media'],
				operation: ['get'],
			},
		},
		options: [
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
	/*                                   media:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['media'],
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
				resource: ['media'],
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
				resource: ['media'],
				operation: ['getAll'],
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
				description:
					'Limit result set to posts assigned to specific authors. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Before',
				name: 'before',
				type: 'dateTime',
				default: '',
				description: 'Limit response to posts published before a given ISO8601 compliant date',
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
				displayName: 'Media Type',
				name: 'mediaType',
				type: 'options',
				options: [
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Video',
						value: 'video',
					},
					{
						name: 'Audio',
						value: 'audio',
					},
					{
						name: 'Application',
						value: 'application',
					},
				],
				default: 'image',
				description: 'Limit result set to attachments of a particular media type',
			},
			{
				displayName: 'Mime Type',
				name: 'mimeType',
				type: 'string',
				default: '',
				description: 'Limit result set to attachments of a particular mime type',
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
				default: 'date',
				description: 'Sort collection by object attribute',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'Limit result set to items with particular parent IDs',
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
						name: 'Inherit',
						value: 'inherit',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Trash',
						value: 'trash',
					},
				],
				default: 'inherit',
				description: 'Limit result set to posts assigned one or more statuses',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                media:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['media'],
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
				resource: ['media'],
				operation: ['delete'],
			},
		},
		options: [
			{
				displayName: 'Force',
				name: 'force',
				type: 'boolean',
				default: true,
				description: 'Whether to bypass trash and force deletion',
			},
		],
	},
];
