import type { INodeProperties } from 'n8n-workflow';

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
				description: 'Send a direct message to a user',
				action: 'Create Direct Message',
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
		displayName: 'User',
		name: 'user',
		type: 'resourceLocator',
		default: { mode: 'username', value: '' },
		required: true,
		description: 'The user you want to send the message to',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['directMessage'],
			},
		},
		modes: [
			{
				displayName: 'By Username',
				name: 'username',
				type: 'string',
				validation: [],
				placeholder: 'e.g. n8n',
				url: '',
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [],
				placeholder: 'e.g. 1068479892537384960',
				url: '',
			},
		],
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		typeOptions: {
			rows: 2,
		},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['directMessage'],
			},
		},
		description:
			'The text of the direct message. URL encoding is required. Max length of 10,000 characters.',
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
				displayName: 'Attachment ID',
				name: 'attachments',
				type: 'string',
				default: '',
				placeholder: '1664279886239010824',
				description: 'The attachment ID to associate with the message',
			},
		],
	},
];
