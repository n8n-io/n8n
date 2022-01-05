import {
	INodeProperties,
} from 'n8n-workflow';

import {
	toDisplayName,
	toOptions,
} from '../../GenericFunctions';

import {
	GROUP_BY_OPTIONS,
	PAYMENT_METHODS,
	PREDEFINED_DATE_RANGES,
	SOURCE_ACCOUNT_TYPES,
	TRANSACTION_REPORT_COLUMNS,
	TRANSACTION_TYPES,
} from './constants';

export const transactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'getReport',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get Report',
				value: 'getReport',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'transaction',
				],
			},
		},
	},
];

export const transactionFields: INodeProperties[] = [
	// ----------------------------------
	//       transaction: getReport
	// ----------------------------------
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'transaction',
				],
				operation: [
					'getReport',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'transaction',
				],
				operation: [
					'getReport',
				],
			},
		},
		options: [
			{
				displayName: 'Accounts Payable Paid',
				name: 'appaid',
				type: 'options',
				default: 'All',
				options: ['All', 'Paid', 'Unpaid'].map(toOptions),
			},
			{
				displayName: 'Accounts Receivable Paid',
				name: 'arpaid',
				type: 'options',
				default: 'All',
				options: ['All', 'Paid', 'Unpaid'].map(toOptions),
			},
			{
				displayName: 'Cleared Status',
				name: 'cleared',
				type: 'options',
				default: 'Reconciled',
				options: ['Cleared', 'Uncleared', 'Reconciled', 'Deposited'].map(toOptions),
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'multiOptions',
				default: '',
				description: 'Columns to return',
				options: TRANSACTION_REPORT_COLUMNS,
			},
			{
				displayName: 'Customer',
				name: 'customer',
				type: 'multiOptions',
				default: [],
				description: 'Customer to filter results by',
				typeOptions: {
					loadOptionsMethod: 'getCustomers',
				},
			},
			{
				displayName: 'Date Range (Custom)',
				name: 'dateRangeCustom',
				placeholder: 'Add Date Range',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Date Range Properties',
						name: 'dateRangeCustomProperties',
						values: [
							{
								displayName: 'Start Date',
								name: 'start_date',
								type: 'dateTime',
								default: '',
								description: 'Start date of the date range to filter results by',
							},
							{
								displayName: 'End Date',
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
				displayName: 'Date Range (Predefined)',
				name: 'date_macro',
				type: 'options',
				default: 'This Month',
				description: 'Predefined date range to filter results by',
				options: PREDEFINED_DATE_RANGES.map(toOptions),
			},
			{
				displayName: 'Date Range for Creation Date (Custom)',
				name: 'dateRangeCreationCustom',
				placeholder: 'Add Creation Date Range',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Creation Date Range Properties',
						name: 'dateRangeCreationCustomProperties',
						values: [
							{
								displayName: 'Start Creation Date',
								name: 'start_createdate',
								type: 'dateTime',
								default: '',
								description: 'Start date of the account creation date range to filter results by',
							},
							{
								displayName: 'End Creation Date',
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
				displayName: 'Date Range for Creation Date (Predefined)',
				name: 'createdate_macro',
				type: 'options',
				default: 'This Month',
				options: PREDEFINED_DATE_RANGES.map(toOptions),
				description: 'Predefined report account creation date range',
			},
			{
				displayName: 'Date Range for Due Date (Custom)',
				name: 'dateRangeDueCustom',
				placeholder: 'Add Due Date Range',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Due Date Range Properties',
						name: 'dateRangeDueCustomProperties',
						values: [
							{
								displayName: 'Start Due Date',
								name: 'start_duedate',
								type: 'dateTime',
								default: '',
								description: 'Start date of the due date range to filter results by',
							},
							{
								displayName: 'End Due Date',
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
				displayName: 'Date Range for Due Date (Predefined)',
				name: 'duedate_macro',
				type: 'options',
				default: 'This Month',
				description: 'Predefined due date range to filter results by',
				options: PREDEFINED_DATE_RANGES.map(toOptions),
			},
			{
				displayName: 'Date Range for Modification Date (Custom)',
				name: 'dateRangeModificationCustom',
				placeholder: 'Add Modification Date Range',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Modification Date Range Properties',
						name: 'dateRangeModificationCustomProperties',
						values: [
							{
								displayName: 'Start Modification Date',
								name: 'start_moddate',
								type: 'dateTime',
								default: '',
								description: 'Start date of the account modification date range to filter results by',
							},
							{
								displayName: 'End Modification Date',
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
				displayName: 'Date Range for Modification Date (Predefined)',
				name: 'moddate_macro',
				type: 'options',
				default: 'This Month',
				description: 'Predefined account modifiction date range to filter results by',
				options: PREDEFINED_DATE_RANGES.map(toOptions),
			},
			{
				displayName: 'Document Number',
				name: 'docnum',
				type: 'string',
				default: '',
				description: 'Transaction document number to filter results by',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'multiOptions',
				default: [],
				description: 'Department to filter results by',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Group By',
				name: 'group_by',
				default: 'Account',
				type: 'options',
				description: 'Transaction field to group results by',
				options: GROUP_BY_OPTIONS.map(toOptions),
			},
			{
				displayName: 'Memo',
				name: 'memo',
				type: 'multiOptions',
				default: [],
				description: 'Memo to filter results by',
				typeOptions: {
					loadOptionsMethod: 'getMemos',
				},
			},
			{
				displayName: 'Payment Method',
				name: 'payment_Method',
				type: 'options',
				default: 'Cash',
				description: 'Payment method to filter results by',
				options: PAYMENT_METHODS.map(toOptions),
			},
			{
				displayName: 'Printed Status',
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
						name: 'To Be Printed',
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
				displayName: 'Sort By',
				name: 'sort_by',
				type: 'options',
				default: 'account_name',
				description: 'Column to sort results by',
				options: TRANSACTION_REPORT_COLUMNS,
			},
			{
				displayName: 'Sort Order',
				name: 'sort_order',
				type: 'options',
				default: 'Ascend',
				options: ['Ascend', 'Descend'].map(toOptions),
			},
			{
				displayName: 'Term',
				name: 'term',
				type: 'multiOptions',
				default: [],
				description: 'Term to filter results by',
				typeOptions: {
					loadOptionsMethod: 'getTerms',
				},
			},
			{
				displayName: 'Transaction Amount',
				name: 'bothamount',
				type: 'number',
				default: 0,
				typeOptions: {
					numberPrecision: 2,
				},
				description: 'Monetary amount to filter results by',
			},
			{
				displayName: 'Transaction Type',
				name: 'transaction_type',
				type: 'options',
				default: 'CreditCardCharge',
				description: 'Transaction type to filter results by',
				options: TRANSACTION_TYPES.map(toOptions).map(toDisplayName),
			},

			{
				displayName: 'Source Account Type',
				name: 'source_account_type',
				default: 'Bank',
				type: 'options',
				description: 'Account type to filter results by',
				options: SOURCE_ACCOUNT_TYPES.map(toOptions).map(toDisplayName),
			},
			{
				displayName: 'Vendor',
				name: 'vendor',
				type: 'multiOptions',
				default: [],
				description: 'Vendor to filter results by',
				typeOptions: {
					loadOptionsMethod: 'getVendors',
				},
			},
		],
	},
];
