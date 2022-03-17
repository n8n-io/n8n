import { INodeProperties } from 'n8n-workflow';

export const starOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'star',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a star to an item.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a star from an item.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all stars of autenticated user.',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
];

export const starFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                star:add                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'star',
				],
			},
		},
		default: {},
		description: 'Options to set',
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				default: '',
				description: 'Channel to add star to, or channel where the message to add star to was posted (used with timestamp).',
			},
			{
				displayName: 'File Comment',
				name: 'fileComment',
				type: 'string',
				default: '',
				description: 'File comment to add star to.',
			},
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				default: '',
				description: 'File to add star to.',
			},
			{
				displayName: 'Timestamp',
				name: 'timestamp',
				type: 'string',
				default: '',
				description: 'Timestamp of the message to add star to.',
			},
		],
	},

	/* ----------------------------------------------------------------------- */
	/*                                 star:delete                             */
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'star',
				],
			},
		},
		default: {},
		description: 'Options to set',
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				default: '',
				description: 'Channel to add star to, or channel where the message to add star to was posted (used with timestamp).',
			},
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				default: '',
				description: 'File to add star to.',
			},
			{
				displayName: 'File Comment',
				name: 'fileComment',
				type: 'string',
				default: '',
				description: 'File comment to add star to.',
			},
			{
				displayName: 'Timestamp',
				name: 'timestamp',
				type: 'string',
				default: '',
				description: 'Timestamp of the message to add star to.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 star:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'star',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'star',
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
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
];
