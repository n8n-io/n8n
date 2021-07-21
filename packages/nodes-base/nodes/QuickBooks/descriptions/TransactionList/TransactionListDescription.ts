import {
	INodeProperties,
} from 'n8n-workflow';

import {
	snakeCase
} from 'change-case'

export const transactionListOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'transactionList',
				],
			},
		},
	},
] as INodeProperties[];

const dateMacros = (() => {
	return [
		'Today', 
		'Yesterday', 
		'This Week', 
		'Last Week', 
		'This Week-to-date', 
		'Last Week-to-date', 
		'Next Week', 
		'Next 4 Weeks', 
		'This Month', 
		'Last Month', 
		'This Month-to-date', 
		'Last Month-to-date', 
		'Next Month', 
		'This Fiscal Quarter', 
		'Last Fiscal Quarter', 
		'This Fiscal Quarter-to-date', 
		'Last Fiscal Quarter-to-date', 
		'Next Fiscal Quarter', 
		'This Fiscal Year', 
		'Last Fiscal Year', 
		'This Fiscal Year-to-date', 
		'Last Fiscal Year-to-date', 
		'Next Fiscal Year',
	].map(option => ({
		name: option,
		value: option,
	}));
})();

const columns = [
	'account_name',
	'create_by',
	'create_date',
	'cust_msg',
	'due_date',
	'doc_num',
	'inv_date',
	'is_ap_paid',
	'is_cleared',
	'is_no_post',
	'last_mod_by',
	'memo',
	'name',
	'other_account',
	'pmt_mthd',
	'printed',
	'sales_cust1',
	'sales_cust2',
	'sales_cust3',
	'term_name',
	'tracking_num',
	'tx_date',
	'txn_type',
	'dept_name',
];

export const transactionListFields = [
	// ----------------------------------
	//         transactionList: get
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			(() => {
				const displayName = 'Date Macro';
				
				return {
					displayName,
					name: snakeCase(displayName),
					type: 'options',
					default: 'This Month',
					options: dateMacros,
					description: 'Predefined date range. Use if you want the report to cover a standard report date range; otherwise, use the start_date and end_date to cover an explicit report date range.',
				}
			})(),
			(() => {
				const displayName = 'Payment Method';
				const supportedValues = [
					'Cash',
					'Check',
					'Dinners Club',
					'American Express',
					'Discover',
					'Master Card',
					'Visa',
				];
				const options = supportedValues.map(value => ({
					name: value,
					value,
				}));
				return {
					displayName,
					name: snakeCase(displayName),
					type: 'options',
					default: 'Cash',
					options,
					description: 'Filters report contents based on payment method.',
				};
			})(),
			(() => {
				const displayName = 'Due Date Macro';
				
				return {
					displayName,
					name: 'duedate_macro',
					type: 'options',
					default: 'This Month',
					options: dateMacros,
					description: 'Predefined date range of due dates for balances to include in the report; otherwise, use the start_duedate and end_duedate to cover an explicit report date range.',
				};
			})(),
			(() => {
				const displayName = 'AR Paid';
				const supportedValues = [
					'All',
					'Paid',
					'Unpaid',
				];
				const options = supportedValues.map(value => ({
					name: value,
					value,
				}));
				return {
					displayName,
					name: 'arpaid',
					type: 'options',
					default: 'All',
					options,
				};
			})(),
			{
				displayName: 'Both Amount',
				name: 'bothamount',
				type: 'number',
				default: 0,
				description: 'Filters report contents to include information for specified transaction amount. For example, bothamount=1233.45 limits report contents to transactions of amount 1233.45.',
			},
			(() => {
				const displayName = 'Transaction Type';
				const supportedValues = [
					'CreditCardCharge',
					'Check',
					'Invoice',
					'ReceivePayment',
					'JournalEntry',
					'Bill',
					'CreditCardCredit',
					'VendorCredit',
					'Credit',
					'BillPaymentCheck',
					'BillPaymentCreditCard',
					'Charge',
					'Transfer',
					'Deposit',
					'Statement',
					'BillableCharge',
					'TimeActivity',
					'CashPurchase',
					'SalesReceipt',
					'CreditMemo',
					'CreditRefund',
					'Estimate',
					'InventoryQuantityAdjustment',
					'PurchaseOrder',
					'GlobalTaxPayment',
					'GlobalTaxAdjustment',
					'Service Tax Refund',
					'Service Tax Gross Adjustment',
					'Service Tax Reversal',
					'Service Tax Defer',
					'Service Tax Partial Utilisation',
				];
				const options = supportedValues.map(value => ({
					name: value,
					value,
				}));
				return {
					displayName,
					name: snakeCase(displayName),
					type: 'options',
					default: 'CreditCardCharge',
					options,
					description: 'Filters report contents based transaction type.',
				};
			})(),
			{
				displayName: 'Document No.',
				name: 'docnum',
				type: 'string',
				default: '',
				description: 'Filters report contents to include information for specified transaction number, as found in the docnum parameter of the transaction object.',
			},
			{
				displayName: 'Start Mod Date',
				name: 'start_moddate',
				type: 'dateTime',
				default: '',
				description: 'Specify an explicit account modification report date range. start_moddate must used with end_moddate, and be less than end_moddate. Use if you want the report to cover an explicit date range; otherwise, use the moddate_macro to cover a standard report date range.',
			},
			(() => {
				const displayName = 'Source Account Type';
				const supportedValues = [
					'AccountsPayable',
					'AccountsReceivable',
					'Bank',
					'CostOfGoodsSold',
					'CreditCard',
					'Equity',
					'Expense',
					'FixedAsset',
					'Income',
					'LongTermLiability',
					'NonPosting',
					'OtherAsset',
					'OtherCurrentAsset',
					'OtherCurrentLiability',
					'OtherExpense',
					'OtherIncome',
				];
				const options = supportedValues.map(value => ({
					name: value,
					value,
				}));
				return {
					displayName,
					name: snakeCase(displayName),
					default: 'Bank',
					options,
					description: 'Account type from which transactions are included in the report.',
				};
			})(),
			(() => {
				const displayName = 'Group By';
				const supportedValues = [
					'Name',
					'Account',
					'Transaction Type',
					'Customer',
					'Vendor',
					'Employee',
					'Location',
					'Payment Method',
					'Day',
					'Week',
					'Month',
					'Quarter',
					'Year',
					'None',
				];
				const options = supportedValues.map(value => ({
					name: value,
					value,
				}));
				return {
					displayName,
					name: snakeCase(displayName),
					type: 'options',
					default: 'Account',
					options,
					description: 'The field in the transaction by which to group results.',
				};
			})(),
			{
				displayName: 'Start Date',
				name: 'start_date',
				type: 'dateTime',
				default: '',
				description: 'The start date of the report. start_date must be used with end_date, and be less than end_date. Use if you want the report to cover an explicit date range; otherwise, use date_macro to cover a standard report date range. If not specified value of date_macro is used.',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				description: 'Filters report contents to include information for specified departments if so configured in the company file. Supported values: One or more comma-separated department IDs as returned in the attribute, Department.Id of the Department object response code.',
			},
			{
				displayName: 'Start Due Date',
				name: 'start_duedate',
				type: 'dateTime',
				default: '',
				description: 'The range of dates over which receivables are due. start_duedate must be used with end_duedate, and be less than end_duedate. If not specified, all data is returned.',
			},
			(() => {
				const displayName = 'Columns';
				const supportedValues = columns;
				const options = supportedValues.map(value => ({
					name: value,
					value,
				}));
				return {
					displayName,
					name: snakeCase(displayName),
					type: 'multiOptions',
					default: '',
					options,
					description: 'Column types to be shown in the report.',
				};
			})(),
			{
				displayName: 'End Due Date',
				name: 'end_duedate',
				type: 'dateTime',
				default: '',
				description: 'The range of dates over which receivables are due. start_duedate must be used with end_duedate, and be less than end_duedate. If not specified, all data is returned.',
			},
			{
				displayName: 'Vendor',
				name: 'vendor',
				type: 'string',
				default: '',
				placeholder: 'vendorID1,vendorID2',
				description: 'Filters report contents to include information for specified vendors. Supported Values: One or more comma separated vendor IDs as returned in the attribute, Vendor.Id, of the Vendor object response code.',
			},
			{
				displayName: 'End Date',
				name: 'end_date',
				type: 'dateTime',
				default: '',
				description: 'The end date of the report. start_date must be used with end_date, and be less than end_date. Use if you want the report to cover an explicit date range; otherwise, use date_macro to cover a standard report date range. If not specified value of date_macro is used.',
			},
			{
				displayName: 'Memo',
				name: 'memo',
				type: 'string',
				default: '',
				placeholder: 'memoID1,memoID2',
				description: 'Filters report contents to include information for specified memo. Supported Values: One or more comma separated memo IDs.',
			},
			(() => {
				const displayName = 'AP Paid';
				const supportedValues = [
					'All',
					'Paid',
					'Unpaid',
				];
				const options = supportedValues.map(value => ({
					name: value,
					value,
				}));
				return {
					displayName,
					name: 'appaid',
					type: 'options',
					default: 'All',
					options,
				};
			})(),
			(() => {
				const displayName = 'Mod Date Macro';
				
				return {
					displayName,
					name: 'moddate_macro',
					type: 'options',
					default: 'This Month',
					options: dateMacros,
					description: 'Predefined report account modification date range. Use if you want the report to cover a standard report date range when accounts were modified; otherwise, use the start_moddate and end_moddate to cover an explicit report date range.',
				};
			})(),
			(() => {
				const displayName = 'Printed';
				const supportedValues = [
					'Printed',
					'To_be_printed',
				];
				const options = supportedValues.map(value => ({
					name: value,
					value,
				}));
				return {
					displayName,
					name: snakeCase(displayName),
					type: 'options',
					default: 'Printed',
					options,
				};
			})(),
			(() => {
				const displayName = 'Create Date Macro';
				
				return {
					displayName,
					name: 'createdate_macro',
					type: 'options',
					default: 'This Month',
					options: dateMacros,
					description: 'Predefined report account create date range. Use if you want the report to cover a standard create report date range; otherwise, use start_createdate and end_createdate to cover an explicit report date range.',
				};
			})(),
			(() => {
				const displayName = 'Cleared';
				const supportedValues = [
					'Cleared',
					'Uncleared',
					'Reconciled',
					'Deposited',
				];
				const options = supportedValues.map(value => ({
					name: value,
					value,
				}));
				return {
					displayName,
					name: snakeCase(displayName),
					type: 'options',
					default: 'Reconciled',
					options,
				};
			})(),
			{
				displayName: 'Customer',
				name: 'customer',
				type: 'string',
				description: 'Filters report contents to include information for specified customers. Supported Values: One or more comma separated customer IDs as returned in the attribute, Customer.Id, of the Customer object response code.',
			},
			(() => {
				const displayName = 'Quick Zoom URL';
				const supportedValues = [
					true,
					false,
				];
				const options = supportedValues.map(value => ({
					name: value.toString(),
					value,
				}));
				return {
					displayName,
					name: 'qzurl',
					type: 'options',
					default: true,
					options,
				};
			})(),
			{
				displayName: 'Term',
				name: 'term',
				type: 'string',
				default: '',
				description: 'Filters report contents based on term or terms supplied. Supported Values: One or more comma separated term IDs as returned in the attribute, Term.Id of the Term object response code.',
			},
			(() => {
				const displayName = 'End Create Date';
				
				return {
					displayName,
					name: 'end_createdate',
					type: 'dateTime',
					default: '',
					description: 'Specify an explicit account create report date range. start_createdate must be used with end_createdate, and be less than end_createdate. Use if you want the report to cover an explicit date range; otherwise, use createdate_macro to cover a standard report date range.',
				};
			})(),
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filters report contents based on the specified comma separated list of ids for the name list customer, vendor, or employee objects. Query the Customer, Vendor, or Employee name list resource to determine the list of objects for this reference. Specify values found in Customer.Id, Vendor.Id, and Employee.Id. For example, name=1,4,7 includes data in the report for namelist ids 1, 4, and 7 vendor and employee objects.',
			},
			(() => {
				const displayName = 'Sort By';
				const supportedValues = columns;
				const options = supportedValues.map(value => ({
					name: value,
					value,
				}));
				return {
					displayName,
					name: snakeCase(displayName),
					type: 'options',
					default: '',
					options,
					description: 'The column type used in sorting report rows. Specify a column type as defined with the columns query parameter.',
				};
			})(),
			(() => {
				const displayName = 'Sort Order';
				const supportedValues = [
					'ascend',
					'descend',
				];
				const options = supportedValues.map(value => ({
					name: value.toString(),
					value,
				}));
				return {
					displayName,
					name: snakeCase(displayName),
					type: 'options',
					default: 'ascend',
					options,
				};
			})(),
			(() => {
				const displayName = 'Start Create Date';
				
				return {
					displayName,
					name: 'start_createdate',
					type: 'dateTime',
					default: '',
					description: 'Specify an explicit account create report date range. start_createdate must be used with end_createdate, and be less than end_date. Use if you want the report to cover an explicit date range; otherwise, use createdate_macro to cover a standard report date range.',
				};
			})(),
			{
				displayName: 'End Mod Date',
				name: 'end_moddate',
				type: 'dateTime',
				default: '',
				description: 'Specify an explicit account modification report date range. start_moddate must be used with end_moddate, and be less than end_moddate. Use if you want the report to cover an explicit date range; otherwise, use the moddate_macro to cover a standard report date range.',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'transactionList',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
