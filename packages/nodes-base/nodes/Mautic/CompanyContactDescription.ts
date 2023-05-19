import type { INodeProperties } from 'n8n-workflow';

export const companyContactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['companyContact'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add contact to a company',
				action: 'Add a company contact',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a contact from a company',
				action: 'Remove a company contact',
			},
		],
		default: 'create',
	},
];

export const companyContactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                companyContact:add                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['companyContact'],
				operation: ['add', 'remove'],
			},
		},
		default: '',
		description: 'The ID of the contact',
	},
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['companyContact'],
				operation: ['add', 'remove'],
			},
		},
		default: '',
		description: 'The ID of the company',
	},
];
