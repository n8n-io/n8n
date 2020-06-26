import {
	INodeProperties,
} from 'n8n-workflow';

export const mediaOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all images, videos and albums or all fields and edges.',
			},
		],
		default: 'getAll',
		description: 'Operation to perform.',
	},
] as INodeProperties[];

export const mediaFields = [
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'userMedia',
		description: 'The type of media to be returned',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				name: 'User media',
				value: 'userMedia',
				description: 'A list of images, videos, or albums on a user',
			},
			{
				name: 'Album media',
				value: 'albumMedia',
				description: 'A list of images and videos on an album',
			},
			{
				name: 'Media fields and edges',
				value: 'mediaFieldsAndEdges',
				description: 'Fields and edges on an image, video, or album',
			},
		],
	},
	{
		displayName: 'User ID for media',
		name: 'userIdForMedia',
		type: 'string',
		default: '',
		placeholder: '17841457138349545',
		description: 'The ID of the user whose media is to be returned',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'getAll',
				],
				type: [
					'userMedia',
				],
			},
		},
	},
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		default: '',
		placeholder: '17998581729291220',
		description: 'The ID of the media to be returned',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'getAll',
				],
				type: [
					'albumMedia',
					'mediaFieldsAndEdges',
				],
			},
		},
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		options: [
			{
				name: 'Caption',
				value: 'caption',
			},
			{
				name: 'ID',
				value: 'id',
			},
			{
				name: 'Media type',
				value: 'media_type',
			},
			{
				name: 'Media URL',
				value: 'media_url',
			},
			{
				name: 'Permalink',
				value: 'permalink',
			},
			{
				name: 'Thumbnail URL',
				value: 'thumbnail_url',
			},
			{
				name: 'Timestamp',
				value: 'timestamp',
			},
			{
				name: 'Username',
				value: 'username',
			},
			{
				name: 'Children',
				value: 'children',
			},
		],
		default: '',
		description: 'Fields of the media be retrieved',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'getAll',
				],
				type: [
					'userMedia',
					'mediaFieldsAndEdges',
				]
			},
		},
	},
] as INodeProperties[];
