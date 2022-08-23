import { INodeProperties } from 'n8n-workflow';

export const directMessageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['directMessage'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a direct message',
				action: 'Create a direct message',
			},
		],
		default: 'create',
	},
];

export const directMessageFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                directMessage:create                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['directMessage'],
			},
		},
		description: 'The ID of the user who should receive the direct message',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['directMessage'],
			},
		},
		description:
			'The text of your Direct Message. URL encode as necessary. Max length of 10,000 characters.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['directMessage'],
			},
		},
		options: [
			{
				displayName: 'Attachment',
				name: 'attachment',
				type: 'string',
				default: 'data',
				description:
					'Name of the binary property which contain data that should be added to the direct message as attachment',
			},
		],
	},
];
