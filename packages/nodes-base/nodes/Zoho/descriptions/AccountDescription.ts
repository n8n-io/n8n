import { INodeProperties } from 'n8n-workflow';

import {
	billingAddress,
	currencies,
	makeCustomFieldsFixedCollection,
	makeGetAllFields,
	shippingAddress,
} from './SharedFields';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an account',
				action: 'Create an account',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or Update an account',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an account',
				action: 'Delete an account',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an account',
				action: 'Get an account',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all accounts',
				action: 'Get all accounts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an account',
				action: 'Update an account',
			},
		],
		default: 'create',
	},
];

export const accountFields: INodeProperties[] = [
	// ----------------------------------------
	//            account: create
	// ----------------------------------------
	{
		displayName: 'Account Name',
		name: 'accountName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['create'],
			},
		},
	},

	// ----------------------------------------
	//          account: upsert
	// ----------------------------------------
	{
		displayName: 'Account Name',
		name: 'accountName',
		description:
			'Name of the account. If a record with this account name exists it will be updated, otherwise a new one will be created.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['upsert'],
			},
		},
	},

	// ----------------------------------------
	//        account: create + upsert
	// ----------------------------------------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['create', 'upsert'],
			},
		},
		options: [
			{
				displayName: 'Account Number',
				name: 'Account_Number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Account Site',
				name: 'Account_Site',
				type: 'string',
				default: '',
				description: 'Name of the account’s location, e.g. Headquarters or London',
			},
			{
				displayName: 'Account Type Name or ID',
				name: 'Account_Type',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getAccountType',
				},
				default: [],
			},
			{
				displayName: 'Annual Revenue',
				name: 'Annual_Revenue',
				type: 'number',
				default: '',
			},
			billingAddress,
			{
				displayName: 'Contact Details',
				name: 'Contact_Details',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('account'),
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Employees',
				name: 'Employees',
				type: 'number',
				default: '',
				description: 'Number of employees in the account’s company',
			},
			{
				displayName: 'Exchange Rate',
				name: 'Exchange_Rate',
				type: 'number',
				default: '',
				description: 'Exchange rate of the default currency to the home currency',
			},
			{
				displayName: 'Fax',
				name: 'Fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Industry',
				name: 'Industry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'Phone',
				type: 'string',
				default: '',
			},
			shippingAddress,
			{
				displayName: 'Ticker Symbol',
				name: 'Ticker_Symbol',
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
	//             account: delete
	// ----------------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		description: 'ID of the account to delete. Can be found at the end of the URL.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               account: get
	// ----------------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		description: 'ID of the account to retrieve. Can be found at the end of the URL.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             account: getAll
	// ----------------------------------------
	...makeGetAllFields('account'),

	// ----------------------------------------
	//             account: update
	// ----------------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		description: 'ID of the account to update. Can be found at the end of the URL.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
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
				resource: ['account'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Account Name',
				name: 'Account_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Account Number',
				name: 'Account_Number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Account Site',
				name: 'Account_Site',
				type: 'string',
				default: '',
				description: 'Name of the account’s location, e.g. Headquarters or London',
			},
			{
				displayName: 'Account Type Name or ID',
				name: 'Account_Type',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getAccountType',
				},
				default: [],
			},
			{
				displayName: 'Annual Revenue',
				name: 'Annual_Revenue',
				type: 'number',
				default: '',
			},
			billingAddress,
			{
				displayName: 'Contact Details',
				name: 'Contact_Details',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('account'),
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Employees',
				name: 'Employees',
				type: 'number',
				default: '',
				description: 'Number of employees in the account’s company',
			},
			{
				displayName: 'Exchange Rate',
				name: 'Exchange_Rate',
				type: 'number',
				default: '',
				description: 'Exchange rate of the default currency to the home currency',
			},
			{
				displayName: 'Fax',
				name: 'Fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Industry',
				name: 'Industry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'Phone',
				type: 'string',
				default: '',
			},
			shippingAddress,
			{
				displayName: 'Ticker Symbol',
				name: 'Ticker_Symbol',
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
