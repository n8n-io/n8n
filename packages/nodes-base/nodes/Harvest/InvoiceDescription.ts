import { INodeProperties } from 'n8n-workflow';

const resource = ['invoice'];

export const invoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource,
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an invoice',
				action: 'Create an invoice',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an invoice',
				action: 'Delete an invoice',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an invoice',
				action: 'Get data of an invoice',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all invoices',
				action: 'Get data of all invoices',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an invoice',
				action: 'Update an invoice',
			},
		],
		default: 'getAll',
	},
];

export const invoiceFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                invoice:getAll                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource,
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
				resource,
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource,
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Client ID',
				name: 'client_id',
				type: 'string',
				default: '',
				description: 'Only return time entries belonging to the client with the given ID',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Only return time entries with a spent_date on or after the given date',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description:
					'The page number to use in pagination. For instance, if you make a list request and receive 100 records, your subsequent call can include page=2 to retrieve the next page of the list. (Default: 1)',
			},
			{
				displayName: 'Project ID',
				name: 'project_id',
				type: 'string',
				default: '',
				description: 'Only return time entries belonging to the client with the given ID',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'multiOptions',
				options: [
					{
						name: 'Draft',
						value: 'draft',
					},
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Paid',
						value: 'paid',
					},
					{
						name: 'Closed',
						value: 'closed',
					},
				],
				default: [],
				description:
					'Only return invoices with a state matching the value provided. Options: draft, open, paid, or closed.',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Only return time entries with a spent_date on or before the given date',
			},

			{
				displayName: 'Updated Since',
				name: 'updated_since',
				type: 'dateTime',
				default: '',
				description:
					'Only return time entries that have been updated since the given date and time',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                invoice:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Invoice ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource,
			},
		},
		description: 'The ID of the invoice you are retrieving',
	},

	/* -------------------------------------------------------------------------- */
	/*                                invoice:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Invoice ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource,
			},
		},
		description: 'The ID of the invoice want to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                                invoice:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client ID',
		name: 'clientId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The ID of the retainer associated with this invoice',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				description:
					'The currency used by the invoice. If not provided, the client’s currency will be used. See a list of supported currencies',
			},
			{
				displayName: 'Discount',
				name: 'over_budget_notification_percentage',
				type: 'string',
				default: '',
				description:
					'This percentage is subtracted from the subtotal. Example: use 10.0 for 10.0%.',
			},
			{
				displayName: 'Due Date',
				name: 'ends_on',
				type: 'dateTime',
				default: '',
				description:
					'Date the invoice is due. Defaults to the issue_date if no payment_term is specified.',
			},
			{
				displayName: 'Estimate ID',
				name: 'estimate_id',
				type: 'string',
				default: '',
				description: 'The ID of the estimate associated with this invoice',
			},
			{
				displayName: 'Issue Date',
				name: 'issue_date',
				type: 'dateTime',
				default: '',
				description: 'Date the invoice was issued. Defaults to today’s date.',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Notes about the project',
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
				description: 'If no value is set, the number will be automatically generated',
			},
			{
				displayName: 'Payment Term',
				name: 'payment_term',
				type: 'string',
				default: '',
				description:
					'The timeframe in which the invoice should be paid. Defaults to custom. Options: upon receipt, net 15, net 30, net 45, or net 60.',
			},
			{
				displayName: 'Purchase Order',
				name: 'purchase_order',
				type: 'string',
				default: '',
				description: 'The purchase order number',
			},
			{
				displayName: 'Retainer ID',
				name: 'retainer_id',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'The ID of the retainer associated with this invoice',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The invoice subject',
			},
			{
				displayName: 'Tax',
				name: 'tax',
				type: 'string',
				default: '',
				description:
					'This percentage is applied to the subtotal, including line items and discounts. Example: use 10.0 for 10.0%.',
			},
			{
				displayName: 'Tax2',
				name: 'tax2',
				type: 'string',
				default: '',
				description:
					'This percentage is applied to the subtotal, including line items and discounts. Example: use 10.0 for 10.0%.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                invoice:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Invoice ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource,
			},
		},
		description: 'The ID of the invoice want to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Client ID',
				name: 'client_id',
				type: 'string',
				default: '',
				description: 'The ID of the retainer associated with this invoice',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				description:
					'The currency used by the invoice. If not provided, the client’s currency will be used. See a list of supported currencies',
			},
			{
				displayName: 'Discount',
				name: 'over_budget_notification_percentage',
				type: 'string',
				default: '',
				description:
					'This percentage is subtracted from the subtotal. Example: use 10.0 for 10.0%.',
			},
			{
				displayName: 'Due Date',
				name: 'ends_on',
				type: 'dateTime',
				default: '',
				description:
					'Date the invoice is due. Defaults to the issue_date if no payment_term is specified.',
			},
			{
				displayName: 'Estimate ID',
				name: 'estimate_id',
				type: 'string',
				default: '',
				description: 'The ID of the estimate associated with this invoice',
			},
			{
				displayName: 'Issue Date',
				name: 'issue_date',
				type: 'dateTime',
				default: '',
				description: 'Date the invoice was issued. Defaults to today’s date.',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Notes about the project',
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
				description: 'If no value is set, the number will be automatically generated',
			},
			{
				displayName: 'Payment Term',
				name: 'payment_term',
				type: 'string',
				default: '',
				description:
					'The timeframe in which the invoice should be paid. Defaults to custom. Options: upon receipt, net 15, net 30, net 45, or net 60.',
			},
			{
				displayName: 'Purchase Order',
				name: 'purchase_order',
				type: 'string',
				default: '',
				description: 'The purchase order number',
			},
			{
				displayName: 'Retainer ID',
				name: 'retainer_id',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'The ID of the retainer associated with this invoice',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The invoice subject',
			},
			{
				displayName: 'Tax',
				name: 'tax',
				type: 'string',
				default: '',
				description:
					'This percentage is applied to the subtotal, including line items and discounts. Example: use 10.0 for 10.0%.',
			},
			{
				displayName: 'Tax2',
				name: 'tax2',
				type: 'string',
				default: '',
				description:
					'This percentage is applied to the subtotal, including line items and discounts. Example: use 10.0 for 10.0%.',
			},
		],
	},
];
