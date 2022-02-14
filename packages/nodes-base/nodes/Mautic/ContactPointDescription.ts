import {
	INodeProperties,
} from 'n8n-workflow';

export const contactPointOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contactPoint',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add points to a contact',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove points from a contact',
			},
		],
		default: 'add',
		description: 'Add or remove points',
	},
];

export const contactPointFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                               contactPoint:add                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contactPoint',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Points',
		name: 'points',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contactPoint',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		default: '0',
	},
];
