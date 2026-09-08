import type { INodeProperties } from 'n8n-workflow';

import {
	GROUP_BY_OPTIONS,
	PAYMENT_METHODS,
	PREDEFINED_DATE_RANGES,
	SOURCE_ACCOUNT_TYPES,
	TRANSACTION_REPORT_COLUMNS,
	TRANSACTION_TYPES,
} from './constants';
import { toDisplayName, toOptions } from '../../GenericFunctions';

export const transactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getReport',
		options: [
			{
				name: 'Get report',
				value: 'getReport',
				action: 'Get a report',
			},
		],
		displayOptions: {
			show: {
				resource: ['transaction'],
			},
		},
	},
];

export const transactionFields: INodeProperties[] = [
	// ----------------------------------
	//       transaction: getReport
	// ----------------------------------
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['getReport'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['getReport'],
			},
		},
		options: [
			{
				displayName: 'Accounts payable paid',
				name: 'appaid',
				type: 'options',
				default: 'All',
				options: ['All', 'Paid', 'Unpaid'].map(toOptions),
			},
			{
				displayName: 'Accounts receivable paid',
				name: 'arpaid',
				type: 'options',
				default: 'All',
				options: ['All', 'Paid', 'Unpaid'].map(toOptions),
			},
			{
				displayName: 'Cleared status',
				name: 'cleared',
				type: 'options',
				default: 'Reconciled',
				options: ['Cleared', 'Uncleared', 'Reconciled', 'Deposited'].map(toOptions),
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'multiOptions',
				default: [],
				description: 'Columns to return',
				options: TRANSACTION_REPORT_COLUMNS,
			},
			{
				displayName: 'Customer names or IDs',
				name: 'customer',
				type: 'multiOptions',
				default: [],
				description:
					'Customer to filter results by. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getCustomers',
				},
			},
			{
				displayName: 'Date range (custom)',
				name: 'dateRangeCustom',
				placeholder: 'Add date range',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Date range properties',
						name: 'dateRangeCustomProperties',
						values: [
							{
								displayName: 'Start date',
								name: 'start_date',
								type: 'dateTime',
								default: '',
								description: 'Start date of the date range to filter results by',
							},
							{
								displayName: 'End date',
								name: 'end_date',
								type: 'dateTime',
								default: '',
								description: 'End date of the date range to filter results by',
							},
						],
					},
				],
			},
			{
				displayName: 'Date range (predefined)',
				name: 'date_macro',
				type: 'options',
				default: 'This Month',
				description: 'Predefined date range to filter results by',
				options: PREDEFINED_DATE_RANGES.map(toOptions),
			},
			{
				displayName: 'Date range for creation date (custom)',
				name: 'dateRangeCreationCustom',
				placeholder: 'Add creation date range',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Creation date range properties',
						name: 'dateRangeCreationCustomProperties',
						values: [
							{
								displayName: 'Start creation date',
								name: 'start_createdate',
								type: 'dateTime',
								default: '',
								description: 'Start date of the account creation date range to filter results by',
							},
							{
								displayName: 'End creation date',
								name: 'end_createdate',
								type: 'dateTime',
								default: '',
								description: 'End date of the account creation date range to filter results by',
							},
						],
					},
				],
			},
			{
				displayName: 'Date range for creation date (predefined)',
				name: 'createdate_macro',
				type: 'options',
				default: 'This Month',
				options: PREDEFINED_DATE_RANGES.map(toOptions),
				description: 'Predefined report account creation date range',
			},
			{
				displayName: 'Date range for due date (custom)',
				name: 'dateRangeDueCustom',
				placeholder: 'Add due date range',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Due date range properties',
						name: 'dateRangeDueCustomProperties',
						values: [
							{
								displayName: 'Start due date',
								name: 'start_duedate',
								type: 'dateTime',
								default: '',
								description: 'Start date of the due date range to filter results by',
							},
							{
								displayName: 'End due date',
								name: 'end_duedate',
								type: 'dateTime',
								default: '',
								description: 'End date of the due date range to filter results by',
							},
						],
					},
				],
			},
			{
				displayName: 'Date range for due date (predefined)',
				name: 'duedate_macro',
				type: 'options',
				default: 'This Month',
				description: 'Predefined due date range to filter results by',
				options: PREDEFINED_DATE_RANGES.map(toOptions),
			},
			{
				displayName: 'Date range for modification date (custom)',
				name: 'dateRangeModificationCustom',
				placeholder: 'Add modification date range',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Modification date range properties',
						name: 'dateRangeModificationCustomProperties',
						values: [
							{
								displayName: 'Start modification date',
								name: 'start_moddate',
								type: 'dateTime',
								default: '',
								description:
									'Start date of the account modification date range to filter results by',
							},
							{
								displayName: 'End modification date',
								name: 'end_moddate',
								type: 'dateTime',
								default: '',
								description: 'End date of the account modification date range to filter results by',
							},
						],
					},
				],
			},
			{
				displayName: 'Date range for modification date (predefined)',
				name: 'moddate_macro',
				type: 'options',
				default: 'This Month',
				description: 'Predefined account modifiction date range to filter results by',
				options: PREDEFINED_DATE_RANGES.map(toOptions),
			},
			{
				displayName: 'Department names or IDs',
				name: 'department',
				type: 'multiOptions',
				default: [],
				description:
					'Department to filter results by. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Document number',
				name: 'docnum',
				type: 'string',
				default: '',
				description: 'Transaction document number to filter results by',
			},
			{
				displayName: 'Group by',
				name: 'group_by',
				default: 'Account',
				type: 'options',
				description: 'Transaction field to group results by',
				options: GROUP_BY_OPTIONS.map(toOptions),
			},
			{
				displayName: 'Memo names or IDs',
				name: 'memo',
				type: 'multiOptions',
				default: [],
				description:
					'Memo to filter results by. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getMemos',
				},
			},
			{
				displayName: 'Payment method',
				name: 'payment_Method',
				type: 'options',
				default: 'Cash',
				description: 'Payment method to filter results by',
				options: PAYMENT_METHODS.map(toOptions),
			},
			{
				displayName: 'Printed status',
				name: 'printed',
				type: 'options',
				default: 'Printed',
				description: 'Printed state to filter results by',
				options: [
					{
						name: 'Printed',
						value: 'Printed',
					},
					{
						name: 'To be printed',
						value: 'To_be_printed',
					},
				],
			},
			{
				displayName: 'Quick Zoom URL',
				name: 'qzurl',
				type: 'boolean',
				default: true,
				description: 'Whether Quick Zoom URL information should be generated',
			},
			{
				displayName: 'Sort by',
				name: 'sort_by',
				type: 'options',
				default: 'account_name',
				description: 'Column to sort results by',
				options: TRANSACTION_REPORT_COLUMNS,
			},
			{
				displayName: 'Sort order',
				name: 'sort_order',
				type: 'options',
				default: 'Ascend',
				options: ['Ascend', 'Descend'].map(toOptions),
			},
			{
				displayName: 'Source account type',
				name: 'source_account_type',
				default: 'Bank',
				type: 'options',
				description: 'Account type to filter results by',
				options: SOURCE_ACCOUNT_TYPES.map(toOptions).map(toDisplayName),
			},
			{
				displayName: 'Term names or IDs',
				name: 'term',
				type: 'multiOptions',
				default: [],
				description:
					'Term to filter results by. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getTerms',
				},
			},
			{
				displayName: 'Transaction amount',
				name: 'bothamount',
				type: 'number',
				default: 0,
				typeOptions: {
					numberPrecision: 2,
				},
				description: 'Monetary amount to filter results by',
			},
			{
				displayName: 'Transaction type',
				name: 'transaction_type',
				type: 'options',
				default: 'CreditCardCharge',
				description: 'Transaction type to filter results by',
				options: TRANSACTION_TYPES.map(toOptions).map(toDisplayName),
			},
			{
				displayName: 'Vendor names or IDs',
				name: 'vendor',
				type: 'multiOptions',
				default: [],
				description:
					'Vendor to filter results by. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getVendors',
				},
			},
		],
	},
];
