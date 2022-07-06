import { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				action: 'Create a company',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a company',
				action: 'Get a company',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all companies',
				action: 'Get all companies',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a company',
				action: 'Update a company',
			},
			{
				name: 'Users',
				value: 'users',
				description: 'List company\'s users',
				action: 'List users of a company',
			},
		],
		default: 'create',
	},
];

export const companyFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                company:users                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List By',
		name: 'listBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'users',
				],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'id',
				description: 'The Intercom defined ID representing the company',
			},
			{
				name: 'Company ID',
				value: 'companyId',
				description: 'The company_id you have given to the company',
			},
		],
		default: '',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'users',
				],
			},
		},
		description: 'View by value',
	},
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
					'users',
				],
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
				resource: [
					'company',
				],
				operation: [
					'users',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 60,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                company:getAll                                */
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
		description: 'Whether to return all results or only up to a given limit',
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
			maxValue: 60,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
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
				displayName: 'Segment ID',
				name: 'segment_id',
				type: 'string',
				default: '',
				description: 'Segment representing the Lead',
			},
			{
				displayName: 'Tag ID',
				name: 'tag_id',
				type: 'string',
				default: '',
				description: 'Tag representing the Lead',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                company:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Select By',
		name: 'selectBy',
		type: 'options',
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
		options: [
			{
				name: 'Company ID',
				value: 'companyId',
				description: 'The company_id you have given to the company',
			},
			{
				name: 'ID',
				value: 'id',
				description: 'The Intercom defined ID representing the company',
			},
			{
				name: 'Name',
				value: 'name',
				description: 'The name of the company',
			},
		],
		default: '',
		description: 'What property to use to query the company',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
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
		description: 'View by value',
	},

	/* -------------------------------------------------------------------------- */
	/*                            company:create/update                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
		description: 'The company ID you have defined for the company',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'company',
				],
			},
		},
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
					'update',
				],
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				default: '',
				description: 'The industry that this company operates in',
			},
			{
				displayName: 'Monthly Spend',
				name: 'monthlySpend',
				type: 'string',
				default: '',
				description: 'The phone number of the user',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: '',
				description: 'Name of the user',
			},
			{
				displayName: 'Plan',
				name: 'plan',
				type: 'string',
				default: '',
				placeholder: '',
				description: 'The name of the plan you have associated with the company',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'number',
				default: '',
				description: 'The number of employees in this company',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'The URL for this company\'s website. Please note that the value specified here is not validated. Accepts any string.',
			},
		],
	},
	{
		displayName: 'Custom Attributes',
		name: 'customAttributesJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'create',
					'update',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'A hash of key/value pairs to represent custom data you want to attribute to a user',
	},
	{
		displayName: 'Custom Attributes',
		name: 'customAttributesUi',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Attribute',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'create',
					'update',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				name: 'customAttributesValues',
				displayName: 'Attributes',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
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
		description: 'A hash of key/value pairs to represent custom data you want to attribute to a user',
	},
];
