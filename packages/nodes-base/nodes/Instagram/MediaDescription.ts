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
			},
		],
		default: 'getAll',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const mediaFields = [
	// ----------------------------------
	//         media:get
	// ----------------------------------
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		default: '',
		placeholder: '17998581729291220',
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'get',
				],
			},
		},
	},
	// ----------------------------------
	//         media: getAll
	// ----------------------------------
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'userMedia',
		description: 'Type of media to return.',
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
				name: 'User Media',
				value: 'userMedia',
				description: 'All images, videos or albums of a user.',
			},
			{
				name: 'Album Media',
				value: 'albumMedia',
				description: 'All images and videos in an album.',
			},
		],
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		placeholder: '17841457138349545',
		description: 'ID of the user whose media to return.',
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
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
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
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		displayOptions: {
			show: {
				resource: [
					'media',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
] as INodeProperties[];
