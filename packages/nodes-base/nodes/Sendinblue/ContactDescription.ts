import {
	INodeProperties,
} from 'n8n-workflow';

export const contactActions = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		displayOptions: {
			show: {
				apiResource: ['contacts'],
			},
		},
		options: [
			{
				name: 'Create',
				description: 'Create a contact',
				value: 'create',
			},
			{
				name: 'Get',
				description: 'Get a contact\'s details',
				value: 'get',
			},
			{
				name: 'Update',
				description: 'Update a contact',
				value: 'update',
			},
			{
				name: 'Delete',
				description: 'Delete a contact',
				value: 'delete',
			},
			/* @todo Get contacts in a list */
			{
				name: 'Add to list',
				description: 'Add existing contact(s) to a list',
				value: 'addToList',
			},
			{
				name: 'Remove from list',
				description: 'Remove existing contact(s) from a list',
				value: 'removeFromList',
			},
		],
		default: 'get',
	},
] as INodeProperties[];

export const contactFields = [
	{
		displayName: 'eMail Address',
		name: 'email',
		type: 'string',
		description: 'Email address of the contact.',
		displayOptions: {
			show: {
				apiResource: ['contacts'],
				action: ['create', 'get', 'update', 'delete'],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'number',
		description: 'ID of the list',
		displayOptions: {
			show: {
				apiResource: ['contacts'],
				action: ['addToList', 'removeFromList'],
			},
		},
		default: 1,
		required: true,
	},
	{
		displayName: 'eMail Addresses Property Name',
		name: 'emailAddresses',
		type: 'string',
		description: 'Emails to add to a list. You can pass a maximum of 150 emails for addition in one request.',
		displayOptions: {
			show: {
				'apiResource': ['contacts'],
				'action': ['addToList', 'removeFromList'],
			},
		},
		default: 'emails',
		required: true,
	},

] as INodeProperties[];

export const contactOptions = [
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				apiResource: ['contacts'],
			},
		},
		options: [
			{
				displayName: 'Attributes Property Name',
				name: 'attributes',
				type: 'string',
				description: 'Pass the set of attributes and their values. These attributes must be present in your SendinBlue account. For eg:\n' +
					'{"FNAME":"Elly", "LNAME":"Roger"}',
				displayOptions: {
					show: {
						'/action': ['create', 'update'],
					},
				},
				default: 'attributes',
			},
			{
				displayName: 'Update Enabled',
				name: 'updateEnabled',
				type: 'boolean',
				description: 'Facilitate to update the existing contact in the same request (updateEnabled = true)',
				displayOptions: {
					show: {
						'/action': ['create'],
					},
				},
				default: false,
			},
		],
	},
] as INodeProperties[];