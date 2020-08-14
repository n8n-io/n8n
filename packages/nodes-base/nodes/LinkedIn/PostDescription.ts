import { INodeProperties } from "n8n-workflow";

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
				value: 'create'
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const postFields = [
/* -------------------------------------------------------------------------- */
/*                                 post:create                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Post As',
		name: 'postAs',
		type: 'options',
		options: [
			{
				name: 'User',
				value: 'user',
			},
			{
				name: 'Organization',
				value: 'organization',
			},
		],
		default: 'user',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create'
				]
			},
		},
		description: 'Which entity to post as.',
	},
	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create'
				],
				postAs: [
					'organization'
				]
			},
		},
		required: true,
		description: 'Identification of organization.',
	},
	{
		displayName: 'Person',
		name: 'person',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPersonUrn',
		},
		default: [],
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create'
				],
				postAs: [
					'user'
				]
			},
		},
		required: true,
		description: 'Person account belongs to.',
	},
	{
		displayName: 'Visibility',
		name: 'visibility',
		type: 'options',
		default: 'CONNECTIONS',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create'
				]
			},
		},
		options: [
			{
				name: 'Connections',
				value: 'CONNECTIONS'
			},
			{
				name: 'Public',
				value: 'PUBLIC'
			}
		]
	},
	{
		displayName: 'Commentary',
		name: 'shareCommentary',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create'
				]
			},
		},
		description: 'Provides the primary content for the post.'
	},
	{
		displayName: 'Media Category',
		name: 'shareMediaCategory',
		type: 'options',
		default: 'NONE',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create'
				]
			},
		},
		options: [
			{
				name: 'None',
				value: 'NONE',
				description: 'The post does not contain any media, and will only consist of text.'
			},
			{
				name: 'Article',
				value: 'ARTICLE',
				description: 'The post contains an article URL.'
			},
			{
				name: 'Image',
				value: 'IMAGE',
				description: 'The post contains an image.'
			}
		]
	},
	{
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create'
				],
				shareMediaCategory: [
					'IMAGE'
				],
			},
		},
        description: 'Object property name which holds binary data.',
        required: true,
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
					'create'
				],
				shareMediaCategory: [
					'IMAGE', 'ARTICLE'
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Provide a short description for your image or article.'
			},
			{
				displayName: 'Original URL',
				name: 'originalUrl',
				type: 'string',
				default: '',
				description: 'Provide the URL of the article you would like to share here.'
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Customize the title of your image or article.'
			},
		]
	},
] as INodeProperties[];
