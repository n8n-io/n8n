import type { INodeProperties } from 'n8n-workflow';

export const contactTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contactTag'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add a tag to a contact',
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove a tag from a contact',
			},
		],
		default: 'add',
	},
];

export const contactTagFields: INodeProperties[] = [
	// ----------------------------------------
	//               tag: add
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to add a tag to',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contactTag'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Tag Names or IDs',
		name: 'tagsToAdd',
		description:
			'Tags to add to the contact. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getTagsToAdd',
		},
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: ['contactTag'],
				operation: ['add'],
			},
		},
	},

	// ----------------------------------------
	//              tag: remove
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to remove the tag from',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contactTag'],
				operation: ['remove'],
			},
		},
	},
	{
		displayName: 'Tag Names or IDs',
		name: 'tagsToRemove',
		description:
			'Tags to remove from the contact. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'multiOptions',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTagsToRemove',
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['contactTag'],
				operation: ['remove'],
			},
		},
	},
];
