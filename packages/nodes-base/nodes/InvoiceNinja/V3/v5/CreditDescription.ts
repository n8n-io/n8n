import type { INodeProperties } from 'n8n-workflow';

export const creditOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
			},
		},
		options: [
			{
				name: 'Action',
				value: 'action',
				description: 'Performs an action to a credit',
				action: 'Action to a credit',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new credit',
				action: 'Create an credit',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a credit',
				action: 'Delete an credit',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a credit',
				action: 'Get an credit',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many credits',
				action: 'Get many credits',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing credit',
				action: 'Update a credit',
			},
		],
		default: 'getAll',
	},
];

export const creditFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  credit:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Credit ID',
		name: 'creditId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
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
				resource: ['credit'],
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
	{
		displayName: 'Download PDF',
		name: 'download',
		type: 'boolean',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['get'],
			},
		},
		default: false,
	},
	/* -------------------------------------------------------------------------- */
	/*                                  credit:getAll                            */
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
				resource: ['credit'],
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
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Without Deleted Clients',
				name: 'withoutDeletedClients',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Upcomming',
				name: 'upcomming',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Overdue',
				name: 'overdue',
				type: 'boolean',
				default: false,
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
				resource: ['credit'],
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
				resource: ['credit'],
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
				resource: ['credit'],
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
	/*                                 credit:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client Name or ID',
		name: 'clientId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getClientsV5',
		},
		required: true,
		default: '',
	},
	{
		displayName: 'Credit Items',
		name: 'lineItemsUi',
		placeholder: 'Add Credit Item',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				name: 'lineItemsValues',
				displayName: 'Credit Item',
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
						displayName: 'Product Key / Article Name',
						description: 'Name of the Article / Product to credit',
						name: 'productKey',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
					},
					{
						displayName: 'Notes / Description',
						description: 'An extended Description for the credit line',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Vendor Name or ID',
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
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>Only the last 100 entries will be displayed here. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getProjectsV5',
				},
				default: '',
			},
			{
				displayName: 'Design Name or ID',
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
				displayName: 'Date',
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
				displayName: 'Exchange Rate',
				name: 'exchangeRate',
				type: 'number',
				default: 1,
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
	/* -------------------------------------------------------------------------- */
	/*                                 credit:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Credit ID',
		name: 'creditId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Credit Items',
		name: 'lineItemsUi',
		placeholder: 'Add Credit Item',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				name: 'lineItemsValues',
				displayName: 'Credit Item',
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
						displayName: 'Product Key / Article Name',
						description: 'Name of the Article / Product to credit',
						name: 'productKey',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
					},
					{
						displayName: 'Notes / Description',
						description: 'An extended Description for the credit line',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				operation: ['update'],
				resource: ['credit'],
			},
		},
		options: [
			{
				displayName: 'Client Name or ID',
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
				displayName: 'Vendor Name or ID',
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
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>Only the last 100 entries will be displayed here. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getProjectsV5',
				},
				default: '',
			},
			{
				displayName: 'Design Name or ID',
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
				displayName: 'Date',
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
				displayName: 'Exchange Rate',
				name: 'exchangeRate',
				type: 'number',
				default: 1,
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
	/* -------------------------------------------------------------------------- */
	/*                                 credit:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Credit ID',
		name: 'creditId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                  credit:action                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Credit ID',
		name: 'creditId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
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
				resource: ['credit'],
				operation: ['action'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive an credit',
			},
			{
				name: 'Clone to Credit',
				value: 'clone_to_credit',
				action: 'Clone to credit',
			},
			{
				name: 'Mark Sent',
				value: 'mark_sent',
				action: 'Mark as Sent',
			},
			{
				name: 'Restore',
				value: 'restore',
				action: 'Restore an credit',
			},
			{
				name: 'Send Email',
				value: 'email',
				action: 'Send an email',
			},
			{
				name: 'Send Email (Custom)',
				value: 'custom_email',
				action: 'Send a custom email',
			},
		],
	},
	{
		displayName: 'Email Type',
		name: 'emailEmailType',
		description:
			"An email type, which is not default, like: 'reminder1', 'reminder2', 'reminder3', 'reminder_endless', 'custom1', 'custom2', 'custom3'",
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['action'],
				action: ['email'],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'customEmailSubject',
		description:
			'Use HTML with variables within this input. see: <a href="https://creditninja.github.io/docs/custom-fields/#custom-fields">https://creditninja.github.io/docs/custom-fields/#custom-fields</a>.',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['action'],
				action: ['custom_email'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'customEmailBody',
		description:
			'Use HTML with variables within this input. see: <a href="https://creditninja.github.io/docs/custom-fields/#custom-fields">https://creditninja.github.io/docs/custom-fields/#custom-fields</a>.',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['action'],
				action: ['custom_email'],
			},
		},
	},
	{
		displayName: 'Template',
		name: 'customEmailTemplate',
		description:
			'Use HTML with variables within this input. see: <a href="https://creditninja.github.io/docs/custom-fields/#custom-fields">https://creditninja.github.io/docs/custom-fields/#custom-fields</a>.',
		type: 'options',
		default: 'email_template_credit',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['credit'],
				operation: ['action'],
				action: ['custom_email'],
			},
		},
		options: [
			{
				name: 'Custom 1',
				value: 'email_template_custom1',
			},
			{
				name: 'Custom 2',
				value: 'email_template_custom2',
			},
			{
				name: 'Custom 3',
				value: 'email_template_custom3',
			},
			{
				name: 'Initial',
				value: 'email_template_credit',
			},
			{
				name: 'Reminder 1',
				value: 'email_template_reminder1',
			},
			{
				name: 'Reminder 2',
				value: 'email_template_reminder2',
			},
			{
				name: 'Reminder 3',
				value: 'email_template_reminder3',
			},
			{
				name: 'Reminder Endless',
				value: 'email_template_reminder_endless',
			},
		],
	},
];
