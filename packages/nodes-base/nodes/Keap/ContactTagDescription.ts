import {
	INodeProperties,
 } from 'n8n-workflow';

export const contactTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contactTag',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Add a list of tags to a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Delete a contact's tag`,
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: `Retrieve all contact's tags`,
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const contactTagFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 contactTag:create                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contactTag',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Tag IDs',
		name: 'tagIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contactTag',
				],
			},
		},
		default: [],
	},
/* -------------------------------------------------------------------------- */
/*                                 contactTag:delete                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'contactTag',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Tag IDs',
		name: 'tagIds',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'contactTag',
				],
			},
		},
		default: 'Tag IDs, multiple ids can be set separated by comma.',
	},
/* -------------------------------------------------------------------------- */
/*                                 contactTag:getAll                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contactTag',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contactTag',
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
				operation: [
					'getAll',
				],
				resource: [
					'contactTag',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
		description: 'How many results to return.',
	},
];
