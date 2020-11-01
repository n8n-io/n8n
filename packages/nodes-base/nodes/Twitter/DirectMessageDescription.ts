import {
	INodeProperties,
} from 'n8n-workflow';

export const directMessageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'directMessage',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a direct message',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const directMessageFields = [
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
				operation: [
					'create',
				],
				resource: [
					'directMessage',
				],
			},
		},
		description: 'The ID of the user who should receive the direct message.',
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
				operation: [
					'create',
				],
				resource: [
					'directMessage',
				],
			},
		},
		description: 'The text of your Direct Message. URL encode as necessary. Max length of 10,000 characters.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'directMessage',
				],
			},
		},
		options: [
			{
				displayName: 'Attachment',
				name: 'attachment',
				type: 'string',
				default: 'data',
				description: 'Name of the binary propertie which contain<br />data which should be added to directMessage as attachment.',
			},
		],
	},
] as INodeProperties[];
