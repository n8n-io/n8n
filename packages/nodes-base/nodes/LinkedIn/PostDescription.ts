import type { INodeProperties } from 'n8n-workflow';

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['post'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new post',
				action: 'Create a post',
			},
		],
		default: 'create',
	},
];

export const postFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 post:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Post As',
		name: 'postAs',
		type: 'options',
		default: 'person',
		description: 'If to post on behalf of a user or an organization',
		options: [
			{
				name: 'Person',
				value: 'person',
			},
			{
				name: 'Organization',
				value: 'organization',
			},
		],
	},
	{
		displayName: 'Person Name or ID',
		name: 'person',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPersonUrn',
		},
		default: '',
		required: true,
		description:
			'Person as which the post should be posted as. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				operation: ['create'],
				postAs: ['person'],
				resource: ['post'],
			},
		},
	},
	{
		displayName: 'Organization URN',
		name: 'organization',
		type: 'string',
		default: '',
		placeholder: '1234567',
		description: 'URN of Organization as which the post should be posted as',
		displayOptions: {
			show: {
				operation: ['create'],
				postAs: ['organization'],
				resource: ['post'],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		description: 'The primary content of the post',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['post'],
			},
		},
	},
	{
		displayName: 'Media Category',
		name: 'shareMediaCategory',
		type: 'options',
		default: 'NONE',
		options: [
			{
				name: 'None',
				value: 'NONE',
				description: 'The post does not contain any media, and will only consist of text',
			},
			{
				name: 'Article',
				value: 'ARTICLE',
				description: 'The post contains an article URL',
			},
			{
				name: 'Image',
				value: 'IMAGE',
				description: 'The post contains an image',
			},
		],
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['post'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['post'],
				shareMediaCategory: ['IMAGE'],
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
				operation: ['create'],
				resource: ['post'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Provide a short description for your image or article',
				displayOptions: {
					show: {
						'/shareMediaCategory': ['ARTICLE', 'IMAGE'],
					},
				},
			},
			{
				displayName: 'Original URL',
				name: 'originalUrl',
				type: 'string',
				default: '',
				description: 'Provide the URL of the article you would like to share here',
				displayOptions: {
					show: {
						'/shareMediaCategory': ['ARTICLE'],
					},
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Customize the title of your image or article',
				displayOptions: {
					show: {
						'/shareMediaCategory': ['ARTICLE', 'IMAGE'],
					},
				},
			},
			{
				displayName: 'Visibility',
				name: 'visibility',
				type: 'options',
				default: 'PUBLIC',
				description: 'Dictate if post will be seen by the public or only connections',
				displayOptions: {
					show: {
						'/postAs': ['person'],
					},
				},
				options: [
					{
						name: 'Connections',
						value: 'CONNECTIONS',
					},
					{
						name: 'Public',
						value: 'PUBLIC',
					},
				],
			},
		],
	},
];
