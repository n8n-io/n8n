import {
	INodeProperties,
} from 'n8n-workflow';

export const contactPointOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
		description: 'The operation to perform.',
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
		description: 'Contact ID',
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
		description: 'Points',
	},
];
