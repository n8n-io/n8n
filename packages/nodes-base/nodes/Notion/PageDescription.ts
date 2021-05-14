import {
	INodeProperties,
} from 'n8n-workflow';

import { 
	blocks,
} from './Blocks';

export const pageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a page.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a page.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update page properties.',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const pageFields = [

	/* -------------------------------------------------------------------------- */
	/*                                page:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Parent Type',
		name: 'parentType',
		type: 'options',
		options: [
			{
				name: 'Database',
				value: 'database',
			},
			{
				name: 'Page',
				value: 'page',
			},
		],
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
				parentType: [
					'page',
				],
			},
		},
		description: 'The ID of the parent page that this child page belongs to.',
	},
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getDatabases',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
				parentType: [
					'database',
				],
			},
		},
		description: 'The ID of the database that this page belongs to.',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
				parentType: [
					'page',
				],
			},
		},
		description: 'Page title. Appears at the top of the page and can be found via Quick Find.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	{
		displayName: 'Properties',
		name: 'propertiesUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
				parentType: [
					'database',
				],
			},
		},
		default: '',
		placeholder: 'Add Property',
		options: [
			{
				name: 'propertyValues',
				displayName: 'Property',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDatabaseProperties',
							loadOptionsDependsOn: [
								'databaseId',
							],
						},
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	...blocks('page', 'create'),
	/* -------------------------------------------------------------------------- */
	/*                                page:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'get',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                page:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The ID of the page to update.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'update',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	{
		displayName: 'Properties',
		name: 'propertiesUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		placeholder: 'Add Property',
		options: [
			{
				name: 'propertyValues',
				displayName: 'Property',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'The name of the property.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
] as INodeProperties[];
