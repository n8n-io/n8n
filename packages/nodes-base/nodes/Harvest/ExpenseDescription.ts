import {
	INodeProperties,
} from 'n8n-workflow';

const resource = [
	'expense',
];

export const expenseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource,
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an expense',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all expenses',
			},
			{
				name: 'Create',
				value: 'create',
				description: `Create an expense`,
			},
			{
				name: 'Update',
				value: 'update',
				description: `Update an expense`,
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Delete an expense`,
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

];

export const expenseFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                expense:getAll                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Returns a list of your expenses.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'How many results to return.',
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
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Client ID',
				name: 'client_id',
				type: 'string',
				default: '',
				description: 'Only return time entries belonging to the client with the given ID.',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Only return time entries with a spent_date on or after the given date.',
			},
			{
				displayName: 'Is Billed',
				name: 'is_billed',
				type: 'boolean',
				default: false,
				description: 'Pass true to only return time entries that have been invoiced and false to return time entries that have not been invoiced.',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'The page number to use in pagination. For instance, if you make a list request and receive 100 records, your subsequent call can include page=2 to retrieve the next page of the list. (Default: 1)',
			},
			{
				displayName: 'Project ID',
				name: 'project_id',
				type: 'string',
				default: '',
				description: 'Only return time entries belonging to the client with the given ID.',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Only return time entries with a spent_date on or before the given date.',
			},
			{
				displayName: 'Updated Since',
				name: 'updated_since',
				type: 'dateTime',
				default: '',
				description: 'Only return time entries that have been updated since the given date and time.',
			},
			{
				displayName: 'User ID',
				name: 'user_id',
				type: 'string',
				default: '',
				description: 'Only return time entries belonging to the user with the given ID.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                expense:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Expense Id',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource,
			},
		},
		description: 'The ID of the expense you are retrieving.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                expense:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Expense Id',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource,
			},
		},
		description: 'The ID of the expense you want to delete.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                expense:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project Id',
		name: 'projectId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The ID of the project associated with this expense.',
	},
	{
		displayName: 'Expense Category Id',
		name: 'expenseCategoryId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The ID of the expense category this expense is being tracked against.',
	},
	{
		displayName: 'Spent Date',
		name: 'spentDate',
		type: 'dateTime',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'Date the expense occurred.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: true,
				description: 'Whether this expense is billable or not. Defaults to true.',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Notes about the expense.',
			},
			{
				displayName: 'Total Cost',
				name: 'total_cost',
				type: 'string',
				default: '',
				description: 'The total amount of the expense.',
			},
			{
				displayName: 'Units',
				name: 'units',
				type: 'string',
				default: '',
				description: 'The quantity of units to use in calculating the total_cost of the expense.',
			},
			{
				displayName: 'User Id',
				name: 'user_id',
				type: 'boolean',
				default: true,
				description: 'The ID of the user associated with this expense. Defaults to the ID of the currently authenticated user.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                invoice:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Invoice Id',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource,
			},
		},
		description: 'The ID of the invoice want to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: true,
				description: 'Whether this expense is billable or not. Defaults to true.',
			},
			{
				displayName: 'Expense Category Id',
				name: 'expense_category_id',
				type: 'string',
				default: '',
				description: 'The ID of the expense category this expense is being tracked against.',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Notes about the expense.',
			},
			{
				displayName: 'Project Id',
				name: 'project_id',
				type: 'string',
				default: '',
				description: 'The ID of the project associated with this expense.',
			},
			{
				displayName: 'Spent Date',
				name: 'spent_date',
				type: 'dateTime',
				default: '',
				description: 'Date the expense occurred.',
			},
			{
				displayName: 'Total Cost',
				name: 'total_cost',
				type: 'string',
				default: '',
				description: 'The total amount of the expense.',
			},
			{
				displayName: 'Units',
				name: 'units',
				type: 'string',
				default: '',
				description: 'The quantity of units to use in calculating the total_cost of the expense.',
			},
			{
				displayName: 'User Id',
				name: 'user_id',
				type: 'boolean',
				default: true,
				description: 'The ID of the user associated with this expense. Defaults to the ID of the currently authenticated user.',
			},
		],
	},

];
