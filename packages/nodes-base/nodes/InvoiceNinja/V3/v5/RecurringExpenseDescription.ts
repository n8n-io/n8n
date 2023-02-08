import type { INodeProperties } from 'n8n-workflow';

export const recurringExpenseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
			},
		},
		options: [
			{
				name: 'Action',
				value: 'action',
				description: 'Performs an action to an recurring expense',
				action: 'Action to an recurring expense',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new recurring expense',
				action: 'Create an recurring expense',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an recurring expense',
				action: 'Delete an recurring expense',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an recurring expense',
				action: 'Get an recurring expense',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many recurring expenses',
				action: 'Get many recurring expenses',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing recurring expense',
				action: 'Update an recurring expense',
			},
		],
		default: 'getAll',
	},
];

export const recurringExpenseFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  recurringExpense:get                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Recurring Expense ID',
		name: 'recurringExpenseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'multiOptions',
		description: 'Additional resources to fetch related to this resource',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Client',
				value: 'client',
			},
			{
				name: 'Vendor',
				value: 'vendor',
			},
		],
		default: [],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  recurringExpense:getAll                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'filter',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Recurring Expense Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Client ID',
				name: 'clientId',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'multiOptions',
		description: 'Additional resources to fetch related to this resource',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				name: 'Client',
				value: 'client',
			},
			{
				name: 'Vendor',
				value: 'vendor',
			},
		],
		default: [],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'perPage',
		type: 'number',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['getAll'],
			},
			hide: {
				returnAll: [true],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 recurringExpense:create                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment Date',
				name: 'paymentDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Client',
				name: 'clientId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClientsV5',
				},
				default: '',
			},
			{
				displayName: 'Vendor',
				name: 'vendorId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getVendorsV5',
				},
				default: '',
			},
			{
				displayName: 'Bank Account',
				name: 'bankId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getBanksV5',
				},
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'currencyId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCurrenciesID',
				},
				default: ''
			},
			{
				displayName: 'Category',
				name: 'categoryId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getExpenseCategoriesV5',
				},
				default: '',
			},
			{
				displayName: 'Should Be Invoiced',
				name: 'should_be_invoiced',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'User (Assigned)',
				name: 'assignedUserId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsersV5',
				},
				default: '',
			},
			{
				displayName: 'Connected Project ID or',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a><br />Only the last 100 entries will be displayed here.',
				typeOptions: {
					loadOptionsMethod: 'getProjectsV5',
				},
				default: '',
			},
			{
				displayName: 'Payment Type',
				name: 'entity_type',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPaymentTypesV5',
				},
				default: 1,
			},
			{
				displayName: 'Tax Name 1',
				name: 'taxName1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Name 2',
				name: 'taxName2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Name 3',
				name: 'taxName3',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Rate 1',
				name: 'taxRate1',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Rate 2',
				name: 'taxRate2',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Rate 3',
				name: 'taxRate3',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Transaction Reference',
				name: 'transactionReference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Transaction ID',
				name: 'transactionId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Remaining Cyles',
				description: 'Use -1 to set to infinite',
				name: 'remainingCycles',
				type: 'number',
				default: -1,
			},
			{
				displayName: 'Frequency',
				name: 'frequencyId',
				type: 'options',
				options: [
					{
						name: 'Daily',
						value: 1,
					},
					{
						name: 'Weekly',
						value: 2,
					},
					{
						name: 'Every 2 Weeks',
						value: 3,
					},
					{
						name: 'Every 4 Weeks',
						value: 4,
					},
					{
						name: 'Monthly',
						value: 5,
					},
					{
						name: 'Every 2 Months',
						value: 6,
					},
					{
						name: 'Every 3 Months',
						value: 7,
					},
					{
						name: 'Every 4 Months',
						value: 8,
					},
					{
						name: 'Every 6 Months',
						value: 9,
					},
					{
						name: 'Yearly',
						value: 10,
					},
					{
						name: 'Every 2 Years',
						value: 11,
					},
					{
						name: 'Every 3 Years',
						value: 12,
					},
				],
				default: 5,
			},
			{
				displayName: 'Next Send Date',
				name: 'nextSendDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Private Notes',
				name: 'privateNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Public Notes',
				name: 'publicNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 1',
				name: 'customValue1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 2',
				name: 'customValue2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 3',
				name: 'customValue3',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 4',
				name: 'customValue4',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Uses Inclusive Taxes',
				name: 'usesInclusiveTaxes',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Calculate Tax by Amount',
				name: 'calculateTaxByAmount',
				type: 'boolean',
				default: false,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 recurringExpense:update                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Recurring Expense ID',
		name: 'recurringExpenseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['update'],
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
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment Date',
				name: 'paymentDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Client',
				name: 'clientId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClientsV5',
				},
				default: '',
			},
			{
				displayName: 'Vendor',
				name: 'vendorId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getVendorsV5',
				},
				default: '',
			},
			{
				displayName: 'Bank Account',
				name: 'bankId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getBanksV5',
				},
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'currencyId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCurrenciesID',
				},
				default: ''
			},
			{
				displayName: 'Category',
				name: 'categoryId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getExpenseCategoriesV5',
				},
				default: '',
			},
			{
				displayName: 'Should Be Invoiced',
				name: 'should_be_invoiced',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'User (Assigned)',
				name: 'assignedUserId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsersV5',
				},
				default: '',
			},
			{
				displayName: 'Connected Project ID or',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a><br />Only the last 100 entries will be displayed here.',
				typeOptions: {
					loadOptionsMethod: 'getProjectsV5',
				},
				default: '',
			},
			{
				displayName: 'Payment Type',
				name: 'entity_type',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPaymentTypesV5',
				},
				default: 1,
			},
			{
				displayName: 'Tax Name 1',
				name: 'taxName1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Name 2',
				name: 'taxName2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Name 3',
				name: 'taxName3',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Rate 1',
				name: 'taxRate1',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Rate 2',
				name: 'taxRate2',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Rate 3',
				name: 'taxRate3',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Transaction Reference',
				name: 'transactionReference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Transaction ID',
				name: 'transactionId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Remaining Cyles',
				description: 'Use -1 to set to infinite',
				name: 'remainingCycles',
				type: 'number',
				default: -1,
			},
			{
				displayName: 'Frequency',
				name: 'frequencyId',
				type: 'options',
				options: [
					{
						name: 'Daily',
						value: 1,
					},
					{
						name: 'Weekly',
						value: 2,
					},
					{
						name: 'Every 2 Weeks',
						value: 3,
					},
					{
						name: 'Every 4 Weeks',
						value: 4,
					},
					{
						name: 'Monthly',
						value: 5,
					},
					{
						name: 'Every 2 Months',
						value: 6,
					},
					{
						name: 'Every 3 Months',
						value: 7,
					},
					{
						name: 'Every 4 Months',
						value: 8,
					},
					{
						name: 'Every 6 Months',
						value: 9,
					},
					{
						name: 'Yearly',
						value: 10,
					},
					{
						name: 'Every 2 Years',
						value: 11,
					},
					{
						name: 'Every 3 Years',
						value: 12,
					},
				],
				default: 5,
			},
			{
				displayName: 'Next Send Date',
				name: 'nextSendDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Private Notes',
				name: 'privateNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Public Notes',
				name: 'publicNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 1',
				name: 'customValue1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 2',
				name: 'customValue2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 3',
				name: 'customValue3',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 4',
				name: 'customValue4',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Uses Inclusive Taxes',
				name: 'usesInclusiveTaxes',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Calculate Tax by Amount',
				name: 'calculateTaxByAmount',
				type: 'boolean',
				default: false,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 recurringExpense:delete                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Recurring Expense ID',
		name: 'recurringExpenseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                  quote:action                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Recurring Expense ID',
		name: 'recurringExpenseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['action'],
			},
		},
	},
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringExpense'],
				operation: ['action'],
			},
		},
		options: [
			{
				name: 'Start',
				value: 'start',
				action: 'Start the recurring expense',
			},
			{
				name: 'Stop',
				value: 'stop',
				action: 'Stop the recurring expense',
			},
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive a quote',
			},
			{
				name: 'Restore',
				value: 'restore',
				action: 'Restore a quote',
			},
		],
	},
];
