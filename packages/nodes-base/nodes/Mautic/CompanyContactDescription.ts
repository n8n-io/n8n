import {
	INodeProperties,
} from 'n8n-workflow';

export const companyContactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'companyContact',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add contact to a company',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a contact from a company',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
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
				resource: [
					'companyContact',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		default: '',
		description: 'The ID of the contact.',
	},
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'companyContact',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		default: '',
		description: 'The ID of the company.',
	},
];
