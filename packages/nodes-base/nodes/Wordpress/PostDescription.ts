import { INodeProperties } from 'n8n-workflow';

export const postOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
				description: ``,
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const postFields = [

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
				]
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
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content for the post',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'An alphanumeric identifier for the object unique to its type.',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'A password to protect access to the content and excerpt.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Publish',
						value: 'publish'
					},
					{
						name: 'Future',
						value: 'future'
					},
					{
						name: 'Draft',
						value: 'draft'
					},
					{
						name: 'Pending',
						value: 'pending'
					},
					{
						name: 'Private',
						value: 'private'
					},
				],
				default: '',
				description: 'A named status for the post.',
			},
			{
				displayName: 'Content Status',
				name: 'contentStatus',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open'
					},
					{
						name: 'Close',
						value: 'closed'
					},
				],
				default: '',
				description: 'Whether or not comments are open on the post.',
			},
			{
				displayName: 'Ping Status',
				name: 'pingStatus',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open'
					},
					{
						name: 'Close',
						value: 'closed'
					},
				],
				default: '',
				description: 'Whether or not comments are open on the post.',
			},
			{
				displayName: 'Sticky',
				name: 'sticky',
				type: 'boolean',
				default: '',
				description: 'Whether or not the object should be treated as sticky.',
			},
			{
				displayName: 'Categories',
				name: 'categories',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				default: [],
				description: 'The terms assigned to the object in the category taxonomy.',
			},
		]
	},

/* -------------------------------------------------------------------------- */
/*                                   user:alias                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'alias',
				]
			},
		},
		description: 'The old unique identifier of the user',
	},
	{
		displayName: 'New ID',
		name: 'newId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'alias',
				]
			},
		},
		description: 'The new unique identifier of the user',
	},
/* -------------------------------------------------------------------------- */
/*                                   user:unsubscribe                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'unsubscribe',
				]
			},
		},
		description: 'The unique identifier of the user',
	},
/* -------------------------------------------------------------------------- */
/*                                 user:resubscribe                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'resubscribe',
				]
			},
		},
		description: 'The unique identifier of the user',
	},
/* -------------------------------------------------------------------------- */
/*                                 user:delete                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'delete',
				]
			},
		},
		description: 'The unique identifier of the user',
	},
/* -------------------------------------------------------------------------- */
/*                                 user:addTags                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'addTags',
				]
			},
		},
		description: 'The unique identifier of the user',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'addTags',
				]
			},
		},
		description: 'Tags to add separated by ","',
	},
/* -------------------------------------------------------------------------- */
/*                                 user:removeTags                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'removeTags',
				]
			},
		},
		description: 'The unique identifier of the user',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'removeTags',
				]
			},
		},
		description: 'Tags to remove separated by ","',
	},
] as INodeProperties[];
