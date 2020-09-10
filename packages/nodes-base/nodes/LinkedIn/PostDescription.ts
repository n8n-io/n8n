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
				value: 'create',
				description: 'Create a new post',
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
		default: '',
		description: 'If to post on behalf of a user or an organization',
		options: [
			{
				name: 'Person',
				value: 'person'
			},
			{
				name: 'Organization',
				value: 'organization'
			}
		]
	},
	{
		displayName: 'Organization URN',
		name: 'organizationUrn',
		type: 'string',
		default: '',
		description: 'URN of given organization',
		displayOptions: {
			show: {
				postAs: [
					'organization'
				]
			},
		},
	},
	{
		displayName: 'Commentary',
		name: 'shareCommentary',
		type: 'string',
		default: '',
		description: 'Provides the primary content for the post'
	},
	{
		displayName: 'Media Category',
		name: 'shareMediaCategory',
		type: 'options',
		default: '',
		options: [
			{
				name: 'None',
				value: 'NONE',
				description: 'The post does not contain any media, and will only consist of text'
			},
			{
				name: 'Article',
				value: 'ARTICLE',
				description: 'The post contains an article URL'
			},
			{
				name: 'Image',
				value: 'IMAGE',
				description: 'The post contains an image'
			}
		]
	},
	{
		displayName: 'Visibility',
		name: 'visibility',
		type: 'options',
		default: '',
		description: 'Dictate if post will be seen by the public or only connections',
		displayOptions: {
			show: {
				postAs: [
					'person'
				]
			}
		},
		options: [
			{
				name: 'Connections',
				value: 'CONNECTIONS',
			},
			{
				name: 'Public',
				value: 'PUBLIC'
			}
		]
	},
	{
		displayName: 'Binary Property',
		displayOptions: {
			show: {
				resource: [
					'post'
				],
				operation: [
					'create',
				],
				shareMediaCategory: [
					'IMAGE'
				]
			},
		},
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		description: 'Object property name which holds binary data',
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
				description: 'Provide a short description for your image or article'
			},
			{
				displayName: 'Original URL',
				name: 'originalUrl',
				type: 'string',
				default: '',
				description: 'Provide the URL of the article you would like to share here',
				displayOptions: {
					show: {
						'/shareMediaCategory': [
							'ARTICLE'
						]
					}
				}
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Customize the title of your image or article'
			},
		]
	},
] as INodeProperties[];
