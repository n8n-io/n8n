import { INodeProperties } from 'n8n-workflow';

const resource = ['estimate'];

export const estimateOperations: INodeProperties[] = [
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
				description: 'Create an estimate',
				action: 'Create an estimate',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an estimate',
				action: 'Delete an estimate',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an estimate',
				action: 'Get data of an estimate',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of all estimates',
				action: 'Get data of all estimates',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an estimate',
				action: 'Update an estimate',
			},
		],
		default: 'getAll',
	},
];

export const estimateFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                estimate:getAll                             */
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
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description:
					'Only return estimates with a state matching the value provided. Options: draft, sent, accepted, or declined.',
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
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                estimate:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Estimate ID',
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
		description: 'The ID of the estimate you are retrieving',
	},

	/* -------------------------------------------------------------------------- */
	/*                                estimate:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Estimate ID',
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
		description: 'The ID of the estimate want to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                                estimate:create                             */
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
		description: 'The ID of the client this estimate belongs to',
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
					'The currency used by the estimate. If not provided, the client’s currency will be used. See a list of supported currencies',
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
				description: 'Any additional notes to include on the estimate',
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
				description: 'If no value is set, the number will be automatically generated',
			},
			{
				displayName: 'Purchase Order',
				name: 'purchase_order',
				type: 'string',
				default: '',
				description: 'The purchase order number',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The estimate subject',
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
	/*                                estimate:update                             */
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
					'The currency used by the estimate. If not provided, the client’s currency will be used. See a list of supported currencies',
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
				displayName: 'Issue Date',
				name: 'issue_date',
				type: 'dateTime',
				default: '',
				description: 'Date the invoice was issued. Defaults to today’s date.',
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
				description: 'If no value is set, the number will be automatically generated',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Any additional notes to include on the estimate',
			},
			{
				displayName: 'Purchase Order',
				name: 'purchase_order',
				type: 'string',
				default: '',
				description: 'The purchase order number',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The estimate subject',
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
