import {
	INodeProperties,
} from 'n8n-workflow';

/* https://developers.freshdesk.com/api/#companies */

export const companyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
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
				description: 'Get a company',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all companies',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a company',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const companyFields = [

	/* -------------------------------------------------------------------------- */
	/*                                company:create/update                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		placeholder: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'company',
				],
			},
		},
		default: '',
		description: 'Name of the company.',
		required: true,
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'company',
				],
			},
		},
		description: `Description of the company`,
	},
	{
		displayName: 'Company ID',
		name: 'id',
		type: 'number',
		default: '',
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
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
		default: {},
		options: [
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'Any specific note about the company.',
			},
			{
				displayName: 'Health Score',
				name: 'health_score',
				type: 'string',
				default: '',
				description: 'The strength of your relationship with the company.',
			},
			{
				displayName: 'Account Tier',
				name: 'account_tier',
				type: 'string',
				default: '',
				description: 'Classification based on how much value the company brings to your business.',
			},
			{
				displayName: 'Renewal Date',
				name: 'renewal_date',
				type: 'date',
				default: '',
				description: 'Date when your contract or relationship with the company is due for renewal.',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				default: '',
				description: 'The industry the company serves in.',
			},
			{
				displayName: 'Domains',
				name: 'domains',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Domain',
				description: 'Domains of the company. Email addresses of contacts that contain this domain will be associated with that company automatically.',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				type: 'fixedCollection',
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				description: `Key value pairs containing the name and value of the custom field.`,
				default: [],
				options: [
					{
						displayName: 'Custom Field',
						name: 'customField',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: `Custom Field\'s name.`,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: `Custom Field\'s values.`,
							},
						],
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                company:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'id',
		type: 'number',
		default: '',
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
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                company:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'id',
		type: 'number',
		default: '',
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
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                company:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Created At',
				name: 'created_at',
				type: 'date',
				default: '',
			},
			{
				displayName: 'Updated At',
				name: 'updated_at',
				type: 'date',
				default: '',
			},
		],
	},
] as INodeProperties[];
