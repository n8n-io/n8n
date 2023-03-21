import type { INodeProperties } from 'n8n-workflow';

export const contactListOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contactList'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add contact to a list',
				action: 'Add a contact to a list',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a contact from a list',
				action: 'Remove a contact from a list',
			},
		],
		default: 'add',
	},
];

export const contactListFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                contactList:add                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'By',
		name: 'by',
		type: 'options',
		options: [
			{
				name: 'Contact ID',
				value: 'id',
			},
			{
				name: 'Email',
				value: 'email',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['add'],
			},
		},
		default: 'email',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['add'],
				by: ['email'],
			},
		},
		default: '',
	},
	{
		displayName: 'Contact to Add',
		name: 'id',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['add'],
				by: ['id'],
			},
		},
		default: '',
	},
	{
		displayName: 'List to Add From',
		name: 'listId',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['add'],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                contactList:remove                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact to Remove',
		name: 'id',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['remove'],
			},
		},
		default: '',
	},
	{
		displayName: 'List to Remove From',
		name: 'listId',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['remove'],
			},
		},
		default: '',
	},
];
