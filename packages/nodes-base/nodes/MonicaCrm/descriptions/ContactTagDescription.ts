import {
	INodeProperties,
} from 'n8n-workflow';

export const contactTagOperations = [
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
				name: 'Add Tag',
				value: 'addTag',
			},
			{
				name: 'Remove Tag',
				value: 'removeTag',
			},
		],
		default: 'addTag',
	},
] as INodeProperties[];

export const contactTagFields = [
	// ----------------------------------------
	//               tag: addTag
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
					'addTag',
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
					'addTag',
				],
			},
		},
	},

	// ----------------------------------------
	//              tag: removeTag
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
					'removeTag',
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
					'removeTag',
				],
			},
		},
	},
] as INodeProperties[];
