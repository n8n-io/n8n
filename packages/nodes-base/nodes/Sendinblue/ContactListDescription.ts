import {INodeProperties} from 'n8n-workflow';

export const contactListActions = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		displayOptions: {
			show: {
				apiResource: ['contactLists'],
			},
		},
		default: 'get',
		options: [
			{
				name: 'Create',
				description: 'Create a contact list',
				value: 'create',
			},
			{
				name: 'Get',
				description: 'Get a contact  list\'s details',
				value: 'get',
			},
			/* @todo Get lists in a folder */
			/* @todo Get all the lists */
			{
				name: 'Update',
				description: 'Update a contact list',
				value: 'update',
			},
			{
				name: 'Delete',
				description: 'Delete a contact list',
				value: 'delete',
			},
		],
	},
] as INodeProperties[];

export const contactListFields = [
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'number',
		description: 'ID of the list',
		displayOptions: {
			show: {
				apiResource: ['contactLists'],
				action: ['get', 'update', 'delete'],
			},
		},
		default: '',
		required: true,
	},
	{
		displayName: 'List Name',
		name: 'listName',
		type: 'string',
		description: 'Name of the list',
		displayOptions: {
			show: {
				apiResource: ['contactLists'],
				action: ['create'],
			},
		},
		default: 'List',
		required: true,
	},
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'number',
		description: 'ID of the list folder',
		displayOptions: {
			show: {
				apiResource: ['contactLists'],
				action: ['create'],
			},
		},
		default: '',
		required: true,
	},
] as INodeProperties[];

export const contactListOptions = [
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				apiResource: ['contactLists'],
			},
		},
		options: [
			{
				displayName: 'List Name',
				name: 'listName',
				type: 'string',
				description: 'Name of the list',
				displayOptions: {
					show: {
						'/action': ['update'],
					},
				},
				default: 'List',
				required: false,
			},
			{
				displayName: 'Folder ID',
				name: 'folderId',
				type: 'number',
				description: 'ID of the list folder',
				displayOptions: {
					show: {
						'/action': ['update'],
					},
				},
				default: '',
				required: false,
			},
		],
	},
] as INodeProperties[];