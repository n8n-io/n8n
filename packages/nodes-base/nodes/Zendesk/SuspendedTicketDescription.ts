import {
	INodeProperties,
 } from 'n8n-workflow';

export const suspendedTicketOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'suspended',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a suspended ticket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a suspended ticket',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all suspended tickets',
			},
			{
				name: 'Recover',
				value: 'recover',
				description: 'Recover a suspended ticket',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const suspendedTicketFields = [
/* -------------------------------------------------------------------------- */
/*                                 suspended:get                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Suspended Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'suspended',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Suspended Ticket ID',
	},
/* -------------------------------------------------------------------------- */
/*                                   suspended:getAll                         */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	displayOptions: {
		show: {
			resource: [
				'suspended',
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
				'suspended',
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
	default: 100,
	description: 'How many results to return.',
},
{
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	displayOptions: {
		show: {
			resource: [
				'suspended',
			],
			operation: [
				'getAll',
			],
		},
	},
	options: [
		{
			displayName: 'Sort By',
			name: 'sortBy',
			type: 'options',
			options: [
				{
					name: 'Author Email',
					value: 'author_email',
				},
				{
					name: 'Cause',
					value: 'cause',
				},
				{
					name: 'Created At',
					value: 'created_at',
				},
				{
					name: 'Subject',
					value: 'subject',
				},
			],
			default: 'created_at',
			description: 'Defaults to sorting by created time',
		},
		{
			displayName: 'Sort Order',
			name: 'sortOrder',
			type: 'options',
			options: [
				{
					name: 'Asc',
					value: 'asc',
				},
				{
					name: 'Desc',
					value: 'desc',
				},
			],
			default: 'desc',
			description: 'Sort order',
		},
	],
},
/* -------------------------------------------------------------------------- */
/*                                suspended:delete                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Suspended Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'suspended',
				],
				operation: [
					'delete',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                suspended:Recover                           */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Suspended Ticket ID',
	name: 'id',
	type: 'string',
	default: '',
	required: true,
	displayOptions: {
		show: {
			resource: [
				'suspended',
			],
			operation: [
				'recover',
			],
		},
	},
},
] as INodeProperties[];
