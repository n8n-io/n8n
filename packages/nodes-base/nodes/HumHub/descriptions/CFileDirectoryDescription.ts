import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const cFileDirectoryOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'cFileDirectory',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all folders by content container',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create new directory',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get directory by id',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update directory by id',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a directory by id',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  cFileDirectoryFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 cFileDirectory:getAll	                  */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'cFileDirectory',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'The id of content container.',
	},
    ...getPagingParameters('cFileDirectory'),

	/* -------------------------------------------------------------------------- */
	/*                                 cFileDirectory:create                      */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'cFileDirectory',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The id of content container.',
	},
	{
		displayName: 'Target ID',
		name: 'targetId',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'cFileDirectory',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The id of the target directory.',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
        displayOptions: {
            show: {
				resource: [
					'cFileDirectory',
				],
				operation: [
					'create',
				],
            },
        },
		default: '',
		description: 'The name of the directory.',
	},
	{
		displayName: 'Folder Additional Fields',
		name: 'folderAdditionalFields',
		type: 'collection',
		required: true,

		displayOptions: {
			show: {
				resource: [
					'cFileDirectory',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the folder.',
			},
			{
				displayName: 'Is Visible',
				name: 'visibility',
				type: 'boolean',
				default: true,
				description: 'True if the folder is public.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 cFileDirectory:get                         */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'cFileDirectory',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The id of the directory.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 cFileDirectory:update                      */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'cFileDirectory',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The id of the directory.',
	},
	{
		displayName: 'Target ID',
		name: 'targetId',
		type: 'number',
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'cFileDirectory',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The id of the target directory',
	},
	{
		displayName: 'Folder',
		name: 'folder',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'cFileDirectory',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Name of the folder.',
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
				description: 'Description of the folder.',
			},
			{
				displayName: 'Is Visible',
				name: 'visibility',
				type: 'boolean',
				default: true,
				description: 'True if the folder is public.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 cFileDirectory:delete                      */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'cFileDirectory',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The id of the directory.',
	},

] as INodeProperties[];
