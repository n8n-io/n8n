import type { INodeProperties } from 'n8n-workflow';

export const recurringInvoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringInvoice'],
			},
		},
		options: [
			{
				name: 'Action',
				value: 'action',
				description: 'Performs an action to an recurringInvoice',
				action: 'Action to an recurringInvoice',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new recurringInvoice',
				action: 'Create an recurringInvoice',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a recurringInvoice',
				action: 'Delete an recurringInvoice',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Get PDF from recurringInvoice',
				action: 'Download recurringInvoice',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a recurringInvoice',
				action: 'Get an recurringInvoice',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many recurringInvoices',
				action: 'Get many recurringInvoices',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing recurringInvoice',
				action: 'Update an recurringInvoice',
			},
		],
		default: 'getAll',
	},
];

export const recurringInvoiceFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  recurringInvoice:get                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Recurring Invoice ID',
		name: 'recurringInvoiceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringInvoice'],
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
				resource: ['recurringInvoice'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Client',
				value: 'client',
			},
		],
		default: [],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  recurringInvoice:getAll                   */
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
				resource: ['recurringInvoice'],
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
				displayName: 'Recurring Invoice Number',
				name: 'number',
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
				resource: ['recurringInvoice'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				name: 'Client',
				value: 'client',
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
				resource: ['recurringInvoice'],
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
				resource: ['recurringInvoice'],
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
	/*                                  recurringInvoice:download                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Invitation Key OR Recurring Invoice ID',
		name: 'inputKey',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringInvoice'],
				operation: ['download'],
			},
		},
		description:
			"Value 'key' from entry of property 'invitations' of an recurringInvoice or the recurringInvoice ID",
	},
	/* -------------------------------------------------------------------------- */
	/*                                 recurringInvoice:create                    */
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
				operation: ['create'],
				resource: ['recurringInvoice'],
			},
		},
		options: [
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
				displayName: 'Recurring Invoice Status',
				name: 'statusId',
				type: 'options',
				options: [
					{
						name: 'Draft',
						value: 1,
					},
					{
						name: 'Sent',
						value: 2,
					},
				],
				default: 1,
			},
			{
				displayName: 'Design',
				name: 'designId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getDesignsV5',
				},
				default: '',
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Discount',
				name: 'discount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'PO Number',
				name: 'poNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Recurring Invoice Date',
				name: 'date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Terms',
				name: 'terms',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Footer',
				name: 'footer',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Uses Inclusive Taxes',
				name: 'usesInclusiveTaxes',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Is Amount Discount',
				name: 'isAmountDiscount',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Auto Bill',
				name: 'autoBillEnabled',
				type: 'boolean',
				default: false,
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
				displayName: 'Partial',
				name: 'partial',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Partial Due Date',
				name: 'partialDueDate',
				type: 'dateTime',
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
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Public Notes',
				name: 'publicNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Custom Value 1',
				name: 'customValue1',
				type: 'string',
				typeOptions: {},
				default: '',
			},
			{
				displayName: 'Custom Value 2',
				name: 'customValue2',
				type: 'string',
				typeOptions: {},
				default: '',
			},
			{
				displayName: 'Custom Value 3',
				name: 'customValue3',
				type: 'string',
				typeOptions: {},
				default: '',
			},
			{
				displayName: 'Custom Value 4',
				name: 'customValue4',
				type: 'string',
				typeOptions: {},
				default: '',
			},
		],
	},
	{
		displayName: 'Recurring Invoice Items',
		name: 'recurringInvoiceItemsUi',
		placeholder: 'Add Recurring Invoice Item',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringInvoice'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				name: 'recurringInvoiceItemsValues',
				displayName: 'Recurring Invoice Item',
				values: [
					{
						displayName: 'Cost',
						name: 'cost',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Anzahl',
						name: 'quantity',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 1,
					},
					{
						displayName: 'Notes',
						name: 'notes',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
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
						displayName: 'Custom Value 1',
						name: 'customValue1',
						type: 'string',
						typeOptions: {},
						default: '',
					},
					{
						displayName: 'Custom Value 2',
						name: 'customValue2',
						type: 'string',
						typeOptions: {},
						default: '',
					},
					{
						displayName: 'Custom Value 3',
						name: 'customValue3',
						type: 'string',
						typeOptions: {},
						default: '',
					},
					{
						displayName: 'Custom Value 4',
						name: 'customValue4',
						type: 'string',
						typeOptions: {},
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 recurringInvoice:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Recurring Invoice ID',
		name: 'recurringInvoiceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringInvoice'],
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
				resource: ['recurringInvoice'],
				operation: ['update'],
			},
		},
		options: [
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
				displayName: 'Recurring Invoice Status',
				name: 'statusId',
				type: 'options',
				options: [
					{
						name: 'Draft',
						value: 1,
					},
					{
						name: 'Sent',
						value: 2,
					},
				],
				default: 1,
			},
			{
				displayName: 'Design',
				name: 'designId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getDesignsV5',
				},
				default: '',
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Discount',
				name: 'discount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'PO Number',
				name: 'poNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Recurring Invoice Date',
				name: 'date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Terms',
				name: 'terms',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Footer',
				name: 'footer',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Uses Inclusive Taxes',
				name: 'usesInclusiveTaxes',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Is Amount Discount',
				name: 'isAmountDiscount',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Auto Bill',
				name: 'autoBillEnabled',
				type: 'boolean',
				default: false,
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
				displayName: 'Partial',
				name: 'partial',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Partial Due Date',
				name: 'partialDueDate',
				type: 'dateTime',
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
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Public Notes',
				name: 'publicNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Custom Value 1',
				name: 'customValue1',
				type: 'string',
				typeOptions: {},
				default: '',
			},
			{
				displayName: 'Custom Value 2',
				name: 'customValue2',
				type: 'string',
				typeOptions: {},
				default: '',
			},
			{
				displayName: 'Custom Value 3',
				name: 'customValue3',
				type: 'string',
				typeOptions: {},
				default: '',
			},
			{
				displayName: 'Custom Value 4',
				name: 'customValue4',
				type: 'string',
				typeOptions: {},
				default: '',
			},
		],
	},
	{
		displayName: 'Recurring Invoice Items',
		name: 'recurringInvoiceItemsUi',
		placeholder: 'Add Recurring Invoice Item',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringInvoice'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				name: 'recurringInvoiceItemsValues',
				displayName: 'Recurring Invoice Item',
				values: [
					{
						displayName: 'Cost',
						name: 'cost',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Anzahl',
						name: 'quantity',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 1,
					},
					{
						displayName: 'Notes',
						name: 'notes',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
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
						displayName: 'Custom Value 1',
						name: 'customValue1',
						type: 'string',
						typeOptions: {},
						default: '',
					},
					{
						displayName: 'Custom Value 2',
						name: 'customValue2',
						type: 'string',
						typeOptions: {},
						default: '',
					},
					{
						displayName: 'Custom Value 3',
						name: 'customValue3',
						type: 'string',
						typeOptions: {},
						default: '',
					},
					{
						displayName: 'Custom Value 4',
						name: 'customValue4',
						type: 'string',
						typeOptions: {},
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 recurringInvoice:delete                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Recurring Invoice ID',
		name: 'recurringInvoiceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringInvoice'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                  recurringInvoice:action                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Recurring Invoice ID',
		name: 'recurringInvoiceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['recurringInvoice'],
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
				resource: ['recurringInvoice'],
				operation: ['action'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive a recurring invoice',
			},
			{
				name: 'Restore',
				value: 'restore',
				action: 'Restore a recurring invoice',
			},
			{
				name: 'Send Email',
				value: 'email',
				action: 'Send Email a recurring invoice',
			},
			{
				name: 'Send Recurring Invoice Now',
				value: 'send_now',
				action: 'Send Recurring Invoice Now a recurring invoice',
			},
			{
				name: 'Start',
				value: 'start',
				action: 'Start a recurring invoice',
			},
			{
				name: 'Stop',
				value: 'stop',
				action: 'Stop a recurring invoice',
			},
		],
	},
];
