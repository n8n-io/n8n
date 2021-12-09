import {
	INodeProperties,
} from 'n8n-workflow';

export const contactTagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contactTag',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
			},
			{
				name: 'Remove',
				value: 'remove',
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
				resource: [
					'contactTag',
				],
				operation: [
					'add',
				],
			},
		},
	},
	{
		displayName: 'Tags',
		name: 'tagsToAdd',
		description: 'Tags to add to the contact',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getTagsToAdd',
		},
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: [
					'contactTag',
				],
				operation: [
					'add',
				],
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
				resource: [
					'contactTag',
				],
				operation: [
					'remove',
				],
			},
		},
	},
	{
		displayName: 'Tags',
		name: 'tagsToRemove',
		description: 'Tags to remove from the contact',
		type: 'multiOptions',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTagsToRemove',
		},
		default: [],
		displayOptions: {
			show: {
				resource: [
					'contactTag',
				],
				operation: [
					'remove',
				],
			},
		},
	},
];
