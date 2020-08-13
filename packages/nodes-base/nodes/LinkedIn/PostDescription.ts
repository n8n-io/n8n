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
				description: 'Create a new client',
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
		displayName: 'Visibility',
		name: 'clientName',
		type: 'options',
		default: '',
		options: [
			{
				name: 'Connections',
				value: 'connections'
			},
			{
				name: 'Public',
				value: 'public'
			}
		]
	},
	{
		displayName: 'Commentary',
		name: 'shareCommentary',
		type: 'string',
		default: '',
		description: 'Provides the primary content for the post.'
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
	// {
	// 	displayName: 'Media URN',
	// 	name: 'mediaUrn',
	// 	type: 'string',
	// 	default: '',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			shareMediaCategory: [
	// 				'IMAGE'
	// 			],
	// 		},
	// 	},
	// 	description: 'URN of the uploaded image asset.'
	// },
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
