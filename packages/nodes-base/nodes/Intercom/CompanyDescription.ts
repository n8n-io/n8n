import { INodeProperties } from "n8n-workflow";

export const companyOpeations = [
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
				name: 'Update',
				value: 'update',
				description: 'Update a company',
			},
			{
				name: 'View',
				value: 'view',
				description: 'View a company',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List companies',
			},
			{
				name: 'Users',
				value: 'users',
				description: `List company's users`,
			},
		],
		default: '',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const companyFields = [

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
				default: '',
				description: 'The Intercom defined id representing the company',
			},
			{
				name: 'Company ID',
				value: 'companyId',
				default: '',
				description: 'The company_id you have given to the company',
			},
		],
		default: '',
		description: 'List by'
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
/* -------------------------------------------------------------------------- */
/*                                company:list                                */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'List by',
		name: 'listBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'list',
				],
			},
		},
		options: [
			{
				name: 'Segment ID',
				value: 'segmentId',
				default: '',
				description: 'Segment representing the Lead',
			},
			{
				name: 'Tag ID',
				value: 'tagId',
				default: '',
				description: 'Tag representing the Lead',
			},
			{
				name: 'All',
				value: 'all',
				default: '',
				description: 'List all users',
			},
		],
		default: '',
		description: 'List by'
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
					'list',
				],
			},
			hide: {
				listBy: [
					'all'
				]
			}
		},
		description: 'list by value',
	},

/* -------------------------------------------------------------------------- */
/*                                company:view                                */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'View By',
		name: 'viewBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'view',
				],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'id',
				default: '',
				description: 'The Intercom defined id representing the company',
			},
			{
				name: 'Company ID',
				value: 'companyId',
				default: '',
				description: 'The company_id you have given to the company',
			},
			{
				name: 'Name',
				value: 'name',
				default: '',
				description: 'The name of the company',
			},
		],
		default: '',
		description: 'View by'
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
					'view',
				],
			},
		},
		description: 'View by value',
	},

/* -------------------------------------------------------------------------- */
/*                            company:create/update                           */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'Company Id',
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
					'update'
				],
			},
		},
		description: 'The company id you have defined for the company',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'company'
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'company'
				],
			},
		},
		options: [
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
				description: `The URL for this company's website. Please note that the value specified here is not validated. Accepts any string.`,
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				description: 'The industry that this company operates in',
			},
		]
	},
	{
		displayName: 'Custom Attributes',
		name: 'customAttributesJson',
		type: 'json',
		required: false,
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
		description: 'A hash of key/value pairs to represent custom data you want to attribute to a user.',
	},
	{
		displayName: 'Custom Attributes',
		name: 'customAttributesUi',
		type: 'fixedCollection',
		default: '',
		placeholder: 'Add Attribute',
		typeOptions: {
			multipleValues: true,
		},
		required: false,
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
			}
		],
		description: 'A hash of key/value pairs to represent custom data you want to attribute to a user.',
	},
] as INodeProperties[];

