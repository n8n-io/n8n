import { INodeProperties } from 'n8n-workflow';

export const listOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['list'],
			},
		},
		options: [
			{
				name: 'Add Member to List',
				value: 'add',
				description: 'Add a member to a list',
				action: 'Add a member to a list',
			},
		],
		default: 'add',
	},
];

export const listFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                directMessage:create                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['list'],
				operation: ['add'],
			},
		},
		description: 'The ID of list you want to add the user to',
	},
	{
		displayName: 'User ID',
		name: 'userID',
		type: 'string',
		typeOptions: {
			// alwaysOpenEditWindow: true,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['list'],
				operation: ['add'],
			},
		},
		description: 'The ID of the user you want to add to the list',
	},
];
