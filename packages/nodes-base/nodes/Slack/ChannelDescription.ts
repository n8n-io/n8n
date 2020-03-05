import { INodeProperties } from 'n8n-workflow';

export const channelOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'channel',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Initiates a public or private channel-based conversation',
			},
			{
				name: 'Invite',
				value: 'invite',
				description: 'Invite a user to a channel',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const channelFields = [

/* -------------------------------------------------------------------------- */
/*                                channel:create                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'channel',
		type: 'string',
		default: '',
		placeholder: 'Channel name',
		displayOptions: {
			show: {
				operation: [
					'create'
				],
				resource: [
					'channel',
				],
			},
		},
		required: true,
		description: 'The name of the channel to create.',
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
					'channel',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Is Private',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Users',
				name: 'users',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                 channel:invite                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel ID',
		name: 'channel',
		type: 'string',
		default: '',
		placeholder: 'myChannel',
		displayOptions: {
			show: {
				operation: [
					'invite'
				],
				resource: [
					'channel',
				],
			},
		},
		required: true,
		description: 'The ID of the channel to invite user to.',
	},
	{
		displayName: 'User ID',
		name: 'username',
		type: 'string',
		default: '',
		placeholder: 'frank',
		displayOptions: {
			show: {
				operation: [
					'invite'
				],
				resource: [
					'channel',
				],
			},
		},
		required: true,
		description: 'The ID of the user to invite into channel.',
	},
/* -------------------------------------------------------------------------- */
/*                                  channel:get                               */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                  channel:delete                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                 channel:getAll                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'channel',
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
					'channel',
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'channel',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields to include separated by ,',
			},
		]
	},
] as INodeProperties[];
