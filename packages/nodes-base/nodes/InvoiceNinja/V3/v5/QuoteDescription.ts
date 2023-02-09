import type { INodeProperties } from 'n8n-workflow';

export const quoteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['quote'],
			},
		},
		options: [
			{
				name: 'Action',
				value: 'action',
				description: 'Performs an action to an quote',
				action: 'Action to an quote',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new quote',
				action: 'Create a quote',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a quote',
				action: 'Delete a quote',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a quote',
				action: 'Get a quote',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many quotes',
				action: 'Get many quotes',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing quote',
				action: 'Update a quote',
			},
		],
		default: 'getAll',
	},
];

export const quoteFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  quote:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['quote'],
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
				resource: ['quote'],
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
				resource: ['quote'],
				operation: ['get'],
			},
		},
		default: false,
	},
	/* -------------------------------------------------------------------------- */
	/*                                  quote:getAll                              */
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
				operation: ['getAll'],
				resource: ['quote'],
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
				resource: ['quote'],
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
				resource: ['quote'],
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
				resource: ['quote'],
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
	/*                                 quote:create                               */
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
				resource: ['quote'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getClientsV5',
		},
		default: '',
	},
	{
		displayName: 'Invoice Items',
		name: 'lineItemsUi',
		placeholder: 'Add Invoice Item',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['quote'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				name: 'lineItemsValues',
				displayName: 'Invoice Item',
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
						description: 'Name of the Article / Product to invoice',
						name: 'productKey',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
					},
					{
						displayName: 'Notes / Description',
						description: 'An extended Description for the invoice line',
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
				resource: ['quote'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getProjectsV5',
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
				displayName: 'User (Assigned) Name or ID',
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
				displayName: 'Po Number',
				name: 'poNumber',
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
				displayName: 'Is Amount Discount',
				name: 'isAmountDiscount',
				type: 'boolean',
				default: false,
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
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 quote:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['quote'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Invoice Items',
		name: 'lineItemsUi',
		placeholder: 'Add Invoice Item',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['quote'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				name: 'lineItemsValues',
				displayName: 'Invoice Item',
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
						description: 'Name of the Article / Product to invoice',
						name: 'productKey',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
					},
					{
						displayName: 'Notes / Description',
						description: 'An extended Description for the invoice line',
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
				resource: ['quote'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getProjectsV5',
				},
				default: '',
			},
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
				displayName: 'User (Assigned) Name or ID',
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
				displayName: 'Po Number',
				name: 'poNumber',
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
				displayName: 'Is Amount Discount',
				name: 'isAmountDiscount',
				type: 'boolean',
				default: false,
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
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 quote:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['quote'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                  quote:action                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Quote ID',
		name: 'quoteId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['quote'],
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
				resource: ['quote'],
				operation: ['action'],
			},
		},
		options: [
			{
				name: 'Approve',
				value: 'approve',
				action: 'Approve a quote',
			},
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive a quote',
			},
			{
				name: 'Clone To Quote',
				value: 'clone_to_quote',
				action: 'Clone To Quote',
			},
			{
				name: 'Convert to Invoice',
				value: 'convert_to_quote',
				action: 'Convert to Invoice',
			},
			{
				name: 'Mark Sent',
				value: 'mark_sent',
				action: 'Mark Send a quote',
			},
			{
				name: 'Restore',
				value: 'restore',
				action: 'Restore a quote',
			},
			{
				name: 'Send Custom Email',
				value: 'custom_email',
				action: 'Send a custom email',
			},
			{
				name: 'Send Email',
				value: 'email',
				action: 'Send an email',
			},
		],
	},
	{
		displayName: 'Subject',
		name: 'customEmailSubject',
		description:
			'Use HTML with variables within this input. see: <a href="https://invoiceninja.github.io/docs/custom-fields/#custom-fields">https://invoiceninja.github.io/docs/custom-fields/#custom-fields</a>.',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['quote'],
				operation: ['action'],
				action: ['custom_email'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'customEmailBody',
		description:
			'Use HTML with variables within this input. see: <a href="https://invoiceninja.github.io/docs/custom-fields/#custom-fields">https://invoiceninja.github.io/docs/custom-fields/#custom-fields</a>.',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['quote'],
				operation: ['action'],
				action: ['custom_email'],
			},
		},
	},
	{
		displayName: 'Template',
		name: 'customEmailTemplate',
		description:
			'Use HTML with variables within this input. see: <a href="https://invoiceninja.github.io/docs/custom-fields/#custom-fields">https://invoiceninja.github.io/docs/custom-fields/#custom-fields</a>.',
		type: 'options',
		default: 'email_template_quote',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['quote'],
				operation: ['action'],
				action: ['custom_email'],
			},
		},
		options: [
			{
				name: 'Initial',
				value: 'email_template_quote',
			},
			{
				name: 'Custom 1',
				value: 'email_template_custom1',
			},
		],
	},
];
