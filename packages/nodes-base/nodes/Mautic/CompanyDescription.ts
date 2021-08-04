import {
	INodeProperties,
} from 'n8n-workflow';

export const companyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new company',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a company',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a company',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all companies',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a company',
			},
		],
		default: 'create',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const companyFields = [

	/* -------------------------------------------------------------------------- */
	/*                                company:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The name of the company to create.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'create',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Is Published',
				name: 'isPublished',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Overwrite With Blank',
				name: 'overwriteWithBlank',
				type: 'boolean',
				default: false,
				description: 'If true, then empty values are set to fields. Otherwise empty values are skipped',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                               company:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'company',
				],
			},
		},
		default: '',
		description: 'The ID of the company to update.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'update',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Company Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Company name',
			},
			{
				displayName: 'Is Published',
				name: 'isPublished',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Overwrite With Blank',
				name: 'overwriteWithBlank',
				type: 'boolean',
				default: false,
				description: 'If true, then empty values are set to fields. Otherwise empty values are skipped',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 company:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'company',
				],
			},
		},
		default: '',
		description: 'The ID of the company to return.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'get',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                company:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 30,
		},
		default: 30,
		description: 'How many results to return.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Order Direction',
				name: 'orderByDir',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: '',
				description: 'Sort direction: asc or desc.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyFields',
				},
				default: '',
				description: 'Column to sort by. Can use any column listed in the response.',
			},
			{
				displayName: 'Search',
				name: 'isPublished',
				type: 'boolean',
				default: '',
				description: 'String or search command to filter entities by.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                               company:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'company',
				],
			},
		},
		default: '',
		description: 'The ID of the company to delete.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'delete',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
] as INodeProperties[];
