import { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
			},
		],
	},
];

const contactFields: INodeProperties[] = [
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Address Street',
		name: 'street',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Address Street 2',
		name: 'street2',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Address City',
		name: 'city',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Tax ID',
		name: 'vat',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Job Position',
		name: 'function',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Website',
		name: 'website',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Mobile',
		name: 'mobile',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Internal Notes',
		name: 'comment',
		type: 'string',
		default: '',
	},
];

export const contactDescription: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                contact:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'contactName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['contact'],
			},
		},
		description: 'Enter contact name',
	},

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['contact'],
			},
		},
		options: [...contactFields],
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get', 'delete'],
				resource: ['contact'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                contact:getAll                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},

	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['contact'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['contact'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			...contactFields,
		],
	},
];
