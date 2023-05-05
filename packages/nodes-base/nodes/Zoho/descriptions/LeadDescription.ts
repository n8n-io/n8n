import type { INodeProperties } from 'n8n-workflow';

import {
	address,
	currencies,
	makeCustomFieldsFixedCollection,
	makeGetAllFields,
} from './SharedFields';

export const leadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['lead'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a lead',
				action: 'Create a lead',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a lead',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a lead',
				action: 'Delete a lead',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a lead',
				action: 'Get a lead',
			},
			{
				name: 'Get Fields',
				value: 'getFields',
				description: 'Get lead fields',
				action: 'Get lead fields',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many leads',
				action: 'Get many leads',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a lead',
				action: 'Update a lead',
			},
		],
		default: 'create',
	},
];

export const leadFields: INodeProperties[] = [
	// ----------------------------------------
	//             lead: create
	// ----------------------------------------
	{
		displayName: 'Company',
		name: 'Company',
		description: 'Company at which the lead works',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
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
				resource: ['lead'],
				operation: ['create'],
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
				resource: ['lead'],
				operation: ['create'],
			},
		},
		options: [
			address,
			{
				displayName: 'Annual Revenue',
				name: 'Annual_Revenue',
				type: 'number',
				default: '',
				description: 'Annual revenue of the lead’s company',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('lead'),
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
				description: 'Position of the lead at their company',
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
				description: 'Industry to which the lead belongs',
			},
			{
				displayName: 'Industry Type',
				name: 'Industry_Type',
				type: 'string',
				default: '',
				description: 'Type of industry to which the lead belongs',
			},
			{
				displayName: 'Lead Source',
				name: 'Lead_Source',
				type: 'string',
				default: '',
				description: 'Source from which the lead was created',
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
				description: 'Number of employees in the lead’s company',
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
	//             lead: upsert
	// ----------------------------------------
	{
		displayName: 'Company',
		name: 'Company',
		description: 'Company at which the lead works',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['upsert'],
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
				resource: ['lead'],
				operation: ['upsert'],
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
				resource: ['lead'],
				operation: ['upsert'],
			},
		},
		options: [
			address,
			{
				displayName: 'Annual Revenue',
				name: 'Annual_Revenue',
				type: 'number',
				default: '',
				description: 'Annual revenue of the lead’s company',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('lead'),
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
				description: 'Position of the lead at their company',
			},
			{
				displayName: 'Email',
				name: 'Email',
				type: 'string',
				default: '',
				description:
					'Email of the lead. If a record with this email exists it will be updated, otherwise a new one will be created.',
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
				description: 'Industry to which the lead belongs',
			},
			{
				displayName: 'Industry Type',
				name: 'Industry_Type',
				type: 'string',
				default: '',
				description: 'Type of industry to which the lead belongs',
			},
			{
				displayName: 'Lead Source',
				name: 'Lead_Source',
				type: 'string',
				default: '',
				description: 'Source from which the lead was created',
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
				description: 'Number of employees in the lead’s company',
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
		description: 'ID of the lead to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//                lead: get
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//               lead: getAll
	// ----------------------------------------
	...makeGetAllFields('lead'),

	// ----------------------------------------
	//               lead: update
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
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
				resource: ['lead'],
				operation: ['update'],
			},
		},
		options: [
			address,
			{
				displayName: 'Annual Revenue',
				name: 'Annual_Revenue',
				type: 'number',
				default: '',
				description: 'Annual revenue of the lead’s company',
			},
			{
				displayName: 'Company',
				name: 'Company',
				type: 'string',
				default: '',
				description: 'Company at which the lead works',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('lead'),
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
				description: 'Position of the lead at their company',
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
				description: 'Industry to which the lead belongs',
			},
			{
				displayName: 'Industry Type',
				name: 'Industry_Type',
				type: 'string',
				default: '',
				description: 'Type of industry to which the lead belongs',
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
				description: 'Source from which the lead was created',
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
				description: 'Number of employees in the lead’s company',
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
];
