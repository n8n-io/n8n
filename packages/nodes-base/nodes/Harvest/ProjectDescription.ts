import type { INodeProperties } from 'n8n-workflow';

const resource = ['project'];

export const projectOperations: INodeProperties[] = [
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
				description: 'Create a project',
				action: 'Create a project',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a project',
				action: 'Delete a project',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a project',
				action: 'Get data of a project',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many projects',
				action: 'Get data of all projects',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a project',
				action: 'Update a project',
			},
		],
		default: 'getAll',
	},
];

export const projectFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                projects:getAll                             */
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
				description: 'Only return projects belonging to the client with the given ID',
			},
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether to only return active projects and false to return inactive projects',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'The page number to use in pagination',
			},
			{
				displayName: 'Updated Since',
				name: 'updated_since',
				type: 'dateTime',
				default: '',
				description: 'Only return projects by updated_since',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                project:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
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
		description: 'The ID of the project you are retrieving',
	},

	/* -------------------------------------------------------------------------- */
	/*                                project:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
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
		description: 'The ID of the project want to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                                project:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The name of the project',
	},
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
		description: 'The ID of the client to associate this project with',
	},
	{
		displayName: 'Is Billable',
		name: 'isBillable',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['create'],
				resource,
			},
		},
		default: true,
		required: true,
		description: 'Whether the project is billable or not',
	},
	{
		displayName: 'Bill By',
		name: 'billBy',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['create'],
				resource,
			},
		},
		options: [
			{
				name: 'None',
				value: 'none',
			},
			{
				name: 'People',
				value: 'People',
			},
			{
				name: 'Project',
				value: 'Project',
			},
			{
				name: 'Tasks',
				value: 'Tasks',
			},
		],
		default: 'none',
		required: true,
		description: 'The method by which the project is invoiced',
	},
	{
		displayName: 'Budget By',
		name: 'budgetBy',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource,
			},
		},
		default: 'none',
		placeholder: '',
		required: true,
		description: 'The email of the user or "none"',
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
				displayName: 'Budget',
				name: 'budget',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The budget in hours for the project when budgeting by time',
			},
			{
				displayName: 'Budget Is Monthly',
				name: 'budget_is_monthly',
				type: 'boolean',
				default: false,
				description: 'Whether the budget resets every month. Defaults to false.',
			},
			{
				displayName: 'Cost Budget',
				name: 'cost_budget',
				type: 'string',
				default: '',
				description: 'The monetary budget for the project when budgeting by money',
			},
			{
				displayName: 'Cost Budget Include Expenses',
				name: 'cost_budget_include_expenses',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'Option for budget of Total Project Fees projects to include tracked expenses. Defaults to false.',
			},
			{
				displayName: 'Ends On',
				name: 'ends_on',
				type: 'dateTime',
				default: '',
				description: 'Date the project will end',
			},
			{
				displayName: 'Fee',
				name: 'fee',
				type: 'string',
				default: '',
				description:
					'The amount you plan to invoice for the project. Only used by fixed-fee projects.',
			},
			{
				displayName: 'Hourly Rate',
				name: 'hourly_rate',
				type: 'string',
				default: '',
				description: 'Rate for projects billed by Project Hourly Rate',
			},
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether the project is active or archived. Defaults to true.',
			},
			{
				displayName: 'Is Fixed Fee',
				name: 'is_fixed_fee',
				type: 'boolean',
				default: false,
				description: 'Whether the project is a fixed-fee project or not',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Notes about the project',
			},
			{
				displayName: 'Notify When Over Budget',
				name: 'notify_when_over_budget',
				type: 'boolean',
				default: false,
				description:
					'Whether project managers should be notified when the project goes over budget. Defaults to false.',
			},
			{
				displayName: 'Over Budget Notification Percentage',
				name: 'over_budget_notification_percentage',
				type: 'string',
				default: '',
				description:
					'Percentage value used to trigger over budget email alerts. Example: use 10.0 for 10.0%.',
			},
			{
				displayName: 'Show Budget To All',
				name: 'show_budget_to_all',
				type: 'boolean',
				default: false,
				description:
					'Whether to show project budget to all employees. Does not apply to Total Project Fee projects. Defaults to false.',
			},
			{
				displayName: 'Starts On',
				name: 'starts_on',
				type: 'dateTime',
				default: '',
				description: 'Date the project was started',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                project:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
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
		description: 'The ID of the project want to update',
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
				displayName: 'Bill By',
				name: 'bill_by',
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'People',
						value: 'People',
					},
					{
						name: 'Project',
						value: 'Project',
					},
					{
						name: 'Tasks',
						value: 'Tasks',
					},
				],
				default: 'none',
				description: 'The method by which the project is invoiced',
			},
			{
				displayName: 'Budget',
				name: 'budget',
				type: 'string',
				default: '',
				description: 'The budget in hours for the project when budgeting by time',
			},
			{
				displayName: 'Budget By',
				name: 'budget_by',
				type: 'string',
				default: '',
				description: 'The email of the user or "none"',
			},
			{
				displayName: 'Budget Is Monthly',
				name: 'budget_is_monthly',
				type: 'boolean',
				default: false,
				description: 'Whether to have the budget reset every month. Defaults to false.',
			},
			{
				displayName: 'Client ID',
				name: 'client_id',
				type: 'string',
				default: '',
				description: 'The ID of the client to associate this project with',
			},
			{
				displayName: 'Cost Budget',
				name: 'cost_budget',
				type: 'string',
				default: '',
				description: 'The monetary budget for the project when budgeting by money',
			},
			{
				displayName: 'Cost Budget Include Expenses',
				name: 'cost_budget_include_expenses',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'Option for budget of Total Project Fees projects to include tracked expenses. Defaults to false.',
			},
			{
				displayName: 'Ends On',
				name: 'ends_on',
				type: 'dateTime',
				default: '',
				description: 'Date the project will end',
			},
			{
				displayName: 'Fee',
				name: 'fee',
				type: 'string',
				default: '',
				description:
					'The amount you plan to invoice for the project. Only used by fixed-fee projects.',
			},
			{
				displayName: 'Hourly Rate',
				name: 'hourly_rate',
				type: 'string',
				default: '',
				description: 'Rate for projects billed by Project Hourly Rate',
			},
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether the project is active or archived. Defaults to true.',
			},
			{
				displayName: 'Is Billable',
				name: 'is_billable',
				type: 'boolean',
				default: true,
				description: 'Whether the project is billable or not',
			},
			{
				displayName: 'Is Fixed Fee',
				name: 'is_fixed_fee',
				type: 'boolean',
				default: false,
				description: 'Whether the project is a fixed-fee project or not',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the project',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Notes about the project',
			},
			{
				displayName: 'Notify When Over Budget',
				name: 'notify_when_over_budget',
				type: 'boolean',
				default: false,
				description:
					'Whether project managers should be notified when the project goes over budget. Defaults to false.',
			},
			{
				displayName: 'Over Budget Notification Percentage',
				name: 'over_budget_notification_percentage',
				type: 'string',
				default: '',
				description:
					'Percentage value used to trigger over budget email alerts. Example: use 10.0 for 10.0%.',
			},
			{
				displayName: 'Show Budget To All',
				name: 'show_budget_to_all',
				type: 'boolean',
				default: false,
				description:
					'Whether to show project budget to all employees. Does not apply to Total Project Fee projects. Defaults to false.',
			},
			{
				displayName: 'Starts On',
				name: 'starts_on',
				type: 'dateTime',
				default: '',
				description: 'Date the project was started',
			},
		],
	},
];
