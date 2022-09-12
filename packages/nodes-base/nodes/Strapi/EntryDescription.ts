import { INodeProperties } from 'n8n-workflow';

export const entryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: ['entry'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an entry',
				action: 'Create an entry',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an entry',
				action: 'Delete an entry',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an entry',
				action: 'Get an entry',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all entries',
				action: 'Get many entries',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an entry',
				action: 'Update an entry',
			},
		],
		default: 'get',
	},
];

export const entryFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                entry:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['create'],
			},
		},
		description: 'Name of the content type',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['create'],
			},
		},
		default: '',
		placeholder: 'id,name,description',
		description:
			'Comma-separated list of the properties which should used as columns for the new rows',
	},

	/* -------------------------------------------------------------------------- */
	/*                                entry:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['delete'],
			},
		},
		description: 'Name of the content type',
	},
	{
		displayName: 'Entry ID',
		name: 'entryId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['delete'],
			},
		},
		description: 'The ID of the entry to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                                entry:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['get'],
			},
		},
		description: 'Name of the content type',
	},
	{
		displayName: 'Entry ID',
		name: 'entryId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['get'],
			},
		},
		description: 'The ID of the entry to get',
	},

	/* -------------------------------------------------------------------------- */
	/*                                entry:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['getAll'],
			},
		},
		description: 'Name of the content type',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Publication State',
				name: 'publicationState',
				type: 'options',
				options: [
					{
						name: 'Live',
						value: 'live',
					},
					{
						name: 'Preview',
						value: 'preview',
					},
				],
				default: '',
				description: 'Only select entries matching the publication state provided',
			},
			{
				displayName: 'Sort Fields',
				name: 'sort',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Sort Field',
				},
				default: '',
				placeholder: 'name:asc',
				description:
					'Name of the fields to sort the data by. By default will be sorted ascendingly. To modify that behavior, you have to add the sort direction after the name of sort field preceded by a colon. For example: <code>name:asc</code>.',
			},
			{
				displayName: 'Where (JSON)',
				name: 'where',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description:
					'JSON query to filter the data. <a href="https://strapi.io/documentation/developer-docs/latest/developer-resources/content-api/content-api.html#filters">More info</a>.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                entry:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['update'],
			},
		},
		description: 'Name of the content type',
	},
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['update'],
			},
		},
		default: 'id',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Name of the property which decides which rows in the database should be updated. Normally that would be "id".',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['entry'],
				operation: ['update'],
			},
		},
		default: '',
		placeholder: 'id,name,description',
		description:
			'Comma-separated list of the properties which should used as columns for the new rows',
	},
];
