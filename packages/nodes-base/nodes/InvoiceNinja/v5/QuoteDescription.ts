import { INodeProperties } from 'n8n-workflow';

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
				name: 'Create',
				value: 'create',
				description: 'Create a new quote',
				action: 'Create a quote',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing quote',
				action: 'Update a quote',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a quote',
				action: 'Delete a quote',
			},
			{
				name: 'Email',
				value: 'email',
				description: 'Email an quote',
				action: 'Email a quote',
			},
		],
		default: 'create',
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
		description: 'Additional resources to fetch related to this resource.',
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
				displayName: 'Quote Number',
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
		description: 'Additional resources to fetch related to this resource.',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				operation: ['getAll'],
				resource: ['quote'],
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
				operation: ['getAll'],
				resource: ['quote'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given perPage',
	},
	{
		displayName: 'Limit',
		name: 'perPage',
		type: 'number',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				operation: ['getAll'],
				resource: ['quote'],
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				operation: ['create'],
				resource: ['quote'],
			},
		},
		options: [
			{
				displayName: 'Client Name or ID',
				name: 'client',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClientsV5',
				},
				default: '',
			},
			{
				displayName: 'Auto Bill',
				name: 'auto_bill_enabled',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Discount',
				name: 'discount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Quote Date',
				name: 'quoteDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Quote Number',
				name: 'quoteNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Quote Status',
				name: 'quoteStatus',
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
				displayName: 'Is Amount Discount',
				name: 'isAmountDiscount',
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
				displayName: 'Po Number',
				name: 'poNumber',
				type: 'string',
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
	{
		displayName: 'Invoice Items',
		name: 'invoiceItemsUi',
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
				name: 'invoiceItemsValues',
				displayName: 'Invoice Item',
				values: [
					{
						displayName: 'Cost',
						name: 'cost',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
					},
					{
						displayName: 'Service',
						name: 'service',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						type: 'string',
						default: '',
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
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
				],
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				operation: ['update'],
				resource: ['quote'],
			},
		},
		options: [
			{
				displayName: 'Client Name or ID',
				name: 'client',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClientsV5',
				},
				default: '',
			},
			{
				displayName: 'Auto Bill',
				name: 'auto_bill_enabled',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Discount',
				name: 'discount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Quote Date',
				name: 'quoteDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Quote Number',
				name: 'quoteNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Quote Status',
				name: 'quoteStatus',
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
				displayName: 'Is Amount Discount',
				name: 'isAmountDiscount',
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
				displayName: 'Po Number',
				name: 'poNumber',
				type: 'string',
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
	{
		displayName: 'Invoice Items',
		name: 'invoiceItemsUi',
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
				name: 'invoiceItemsValues',
				displayName: 'Invoice Item',
				values: [
					{
						displayName: 'Cost',
						name: 'cost',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
					},
					{
						displayName: 'Service',
						name: 'service',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						type: 'string',
						default: '',
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
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
	/*                                  quote:email                               */
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
				operation: ['email'],
			},
		},
	},
];
