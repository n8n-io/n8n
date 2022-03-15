import {
	INodeProperties,
} from 'n8n-workflow';

export const listOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a list',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a list',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a list',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all lists',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a list',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const listFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 list:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If set to true, all the results will be returned.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'list',
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
			maxValue: 1000,
		},
		default: 100,
		description: 'How many results to return.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 list:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'list',
				],
			},
		},
		default: '',
		description: 'Name of the list.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 list:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'list',
				],
			},
		},
		default: '',
		description: 'ID of the list.',
	},
	{
		displayName: 'Delete Contacts',
		name: 'deleteContacts',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'list',
				],
			},
		},
		description: 'Delete all contacts on the list.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 list:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'list',
				],
			},
		},
		default: '',
		description: 'ID of the list.',
	},
	{
		displayName: 'Contact Sample',
		name: 'contactSample',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'list',
				],
			},
		},
		description: 'Return the contact sample.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 list:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'list',
				],
			},
		},
		default: '',
		description: 'ID of the list.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'list',
				],
			},
		},
		default: '',
		description: 'Name of the list.',
	},
];
