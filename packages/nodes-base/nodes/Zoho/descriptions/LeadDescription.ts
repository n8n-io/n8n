import {
	INodeProperties,
} from 'n8n-workflow';

import {
	address,
	makeGetAllFields,
} from './SharedFields';

export const leadOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
			{
				name: 'Upsert',
				value: 'upsert',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const leadFields = [
	// ----------------------------------------
	//          lead: create + upsert
	// ----------------------------------------
	{
		displayName: 'Company',
		name: 'Company',
		description: 'Company at which the lead works.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
					'upsert',
				],
			},
		},
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
					'upsert',
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
				resource: [
					'lead',
				],
				operation: [
					'create',
					'upsert',
				],
			},
		},
		options: [
			address,
			{
				displayName: 'Annual Revenue',
				name: 'Annual_Revenue',
				type: 'number',
				default: '',
				description: 'Annual revenue of the lead’s company.',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'string',
				default: '',
				description: 'Symbol of the currency in which revenue is generated.',
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Designation',
				name: 'Designation',
				type: 'string',
				default: '',
				description: 'Position of the lead at their company.',
			},
			{
				displayName: 'Email',
				name: 'Email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email Opt Out',
				name: 'Email_Opt_Out',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Fax',
				name: 'Fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'First_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Full Name',
				name: 'Full_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Industry',
				name: 'Industry',
				type: 'string',
				default: '',
				description: 'Industry to which the lead belongs.',
			},
			{
				displayName: 'Industry Type',
				name: 'Industry_Type',
				type: 'string',
				default: '',
				description: 'Type of industry to which the lead belongs.',
			},
			{
				displayName: 'Lead Source',
				name: 'Lead_Source',
				type: 'string',
				default: '',
				description: 'Source from which the lead was created.',
			},
			{
				displayName: 'Lead Status',
				name: 'Lead_Status',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile',
				name: 'Mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Number of Employees',
				name: 'No_of_Employees',
				type: 'number',
				default: '',
				description: 'Number of employees in the lead’s company.',
			},
			{
				displayName: 'Phone',
				name: 'Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Salutation',
				name: 'Salutation',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Secondary Email',
				name: 'Secondary_Email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Skype ID',
				name: 'Skype_ID',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Twitter',
				name: 'Twitter',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Website',
				name: 'Website',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//               lead: delete
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//                lead: get
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//               lead: getAll
	// ----------------------------------------
	...makeGetAllFields('lead'),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Approved',
				name: 'approved',
				type: 'boolean',
				default: true,
				description: 'Retrieve only approved leads. Defaults to true.',
			},
			{
				displayName: 'Converted',
				name: 'converted',
				type: 'boolean',
				default: false,
				description: 'Retrieve only converted leads. Defaults to false.',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLeadFields',
				},
				default: [],
			},
			{
				displayName: 'Include Child',
				name: 'include_child',
				type: 'boolean',
				default: false,
				description: 'Retrieve only leads from child territories.',
			},
			{
				displayName: 'Sort By',
				name: 'sort_by',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLeadFields',
				},
				default: [],
				description: 'Field to sort leads by.',
			},
			{
				displayName: 'Sort Order',
				name: 'sort_order',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'asc',
					},
					{
						name: 'Descending',
						value: 'desc',
					},
				],
				default: 'desc',
				description: 'Ascending or descending order sort order.',
			},
			{
				displayName: 'Territory ID',
				name: 'territory_id',
				type: 'string',
				default: '',
				description: 'Retrieve only leads from this territory.',
			},
		],
	},

	// ----------------------------------------
	//               lead: update
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to update.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'update',
				],
			},
		},
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
					'lead',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			address,
			{
				displayName: 'Annual Revenue',
				name: 'Annual_Revenue',
				type: 'number',
				default: '',
				description: 'Annual revenue of the lead’s company.',
			},
			{
				displayName: 'Company',
				name: 'Company',
				type: 'string',
				default: '',
				description: 'Company at which the lead works.',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'string',
				default: '',
				description: 'Symbol of the currency in which revenue is generated.',
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Designation',
				name: 'Designation',
				type: 'string',
				default: '',
				description: 'Position of the lead at their company.',
			},
			{
				displayName: 'Email',
				name: 'Email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email Opt Out',
				name: 'Email_Opt_Out',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Fax',
				name: 'Fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'First_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Full Name',
				name: 'Full_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Industry',
				name: 'Industry',
				type: 'string',
				default: '',
				description: 'Industry to which the lead belongs.',
			},
			{
				displayName: 'Industry Type',
				name: 'Industry_Type',
				type: 'string',
				default: '',
				description: 'Type of industry to which the lead belongs.',
			},
			{
				displayName: 'Last Name',
				name: 'Last_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Lead Source',
				name: 'Lead_Source',
				type: 'string',
				default: '',
				description: 'Source from which the lead was created.',
			},
			{
				displayName: 'Lead Status',
				name: 'Lead_Status',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile',
				name: 'Mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Number of Employees',
				name: 'No_of_Employees',
				type: 'number',
				default: '',
				description: 'Number of employees in the lead’s company.',
			},
			{
				displayName: 'Phone',
				name: 'Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Salutation',
				name: 'Salutation',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Secondary Email',
				name: 'Secondary_Email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Skype ID',
				name: 'Skype_ID',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Twitter',
				name: 'Twitter',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Website',
				name: 'Website',
				type: 'string',
				default: '',
			},
		],
	},
] as INodeProperties[];
