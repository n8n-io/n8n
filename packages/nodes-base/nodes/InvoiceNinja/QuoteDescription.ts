import type { INodeProperties } from 'n8n-workflow';

export const quoteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['quote'],
			},
		},
		options: [
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
				name: 'Email',
				value: 'email',
				description: 'Email a quote',
				action: 'Email a quote',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a quote',
				action: 'Get a quote',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get data of many quotes',
				action: 'Get many quotes',
			},
		],
		default: 'create',
	},
];

export const quoteFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 quote:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['quote'],
			},
		},
		options: [
			{
				displayName: 'Client name or ID',
				name: 'client',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClients',
				},
				default: '',
			},
			{
				displayName: 'Auto bill',
				name: 'autoBill',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Custom value 1',
				name: 'customValue1',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Custom value 2',
				name: 'customValue2',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Discount',
				name: 'discount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Due date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Email quote',
				name: 'emailQuote',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Quote date',
				name: 'quoteDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Quote number',
				name: 'quoteNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Quote status',
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
				displayName: 'Is amount discount',
				name: 'isAmountDiscount',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Paid',
				name: 'paid',
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
				displayName: 'Partial due date',
				name: 'partialDueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'PO number',
				name: 'poNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Private notes',
				name: 'privateNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Public notes',
				name: 'publicNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax name 1',
				name: 'taxName1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax name 2',
				name: 'taxName2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax rate 1',
				name: 'taxRate1',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax rate 2',
				name: 'taxRate2',
				type: 'number',
				default: 0,
			},
		],
	},
	{
		displayName: 'Invoice items',
		name: 'invoiceItemsUi',
		placeholder: 'Add invoice item',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				name: 'invoiceItemsValues',
				displayName: 'Invoice item',
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
						default: '',
					},
					{
						displayName: 'Service',
						name: 'service',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Hours',
						name: 'hours',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
					},
					{
						displayName: 'Tax name 1',
						name: 'taxName1',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Tax name 2',
						name: 'taxName2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Tax rate 1',
						name: 'taxRate1',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Tax rate 2',
						name: 'taxRate2',
						type: 'number',
						default: 0,
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
				resource: ['quote'],
				operation: ['email'],
			},
		},
	},
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
				resource: ['quote'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['quote'],
			},
		},
		options: [
			{
				displayName: 'Include',
				name: 'include',
				type: 'options',
				options: [
					{
						name: 'Client',
						value: 'client',
					},
				],
				default: 'client',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  quote:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['quote'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 60,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['quote'],
			},
		},
		options: [
			{
				displayName: 'Quote number',
				name: 'quoteNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Include',
				name: 'include',
				type: 'options',
				options: [
					{
						name: 'Client',
						value: 'client',
					},
				],
				default: 'client',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Archived',
						value: 'archived',
					},
					{
						name: 'Deleted',
						value: 'deleted',
					},
				],
				default: 'active',
			},
			{
				displayName: 'Created at',
				name: 'createdAt',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Updated at',
				name: 'updatedAt',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Is deleted',
				name: 'isDeleted',
				type: 'boolean',
				default: false,
			},
		],
	},
];
