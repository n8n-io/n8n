import { INodeProperties } from "n8n-workflow";

const resource = ['projects'];

export const projectOperations = [
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
				description: 'Get data of a project',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all projects',
			},
			{
				name: 'Create',
				value: 'create',
				description: `Create a project`,
			},
			{
				name: 'Update',
				value: 'update',
				description: `Update a project`,
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Delete a project`,
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

] as INodeProperties[];

export const projectFields = [

	/* -------------------------------------------------------------------------- */
	/*                                projects:getAll                            */
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
		description: 'Returns a list of your projects.',
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
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Pass true to only return active projects and false to return inactive projects.',
			},
			{
				displayName: 'Client Id',
				name: 'client_id',
				type: 'string',
				default: '',
				description: 'Only return projects belonging to the client with the given ID.',
			},
			{
				displayName: 'Updated Since',
				name: 'updated_since',
				type: 'dateTime',
				default: '',
				description: 'Only return projects by updated_since.',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'The page number to use in pagination.',
			},

		]
	},

	/* -------------------------------------------------------------------------- */
	/*                                project:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project Id',
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
		description: 'The ID of the project you are retrieving.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                project:delete                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project Id',
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
		description: 'The ID of the project want to delete.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                project:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
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
		description: 'The name of the project.',
	},
	{
		displayName: 'Client Id',
		name: 'client_id',
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
		description: 'The ID of the client to associate this project with.',
	},
	{
		displayName: 'Is Billable',
		name: 'is_billable',
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
		description: 'Whether the project is billable or not.',
	},
	{
		displayName: 'Bill By',
		name: 'bill_by',
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
		description: 'The method by which the project is invoiced. Options: Project, Tasks, People, or none.',
	},
	{
		displayName: 'Budget By',
		name: 'budget_by',
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
		description: 'The email of the user.',
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
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether the project is active or archived. Defaults to true'
			},
			{
				displayName: 'Is Fixed Fee',
				name: 'is_fixed_fee',
				type: 'string',
				default: '',
				description: 'Whether the project is a fixed-fee project or not.'
			},
			{
				displayName: 'Hourly Rate',
				name: 'hourly_rate',
				type: 'string',
				default: '',
				description: 'Rate for projects billed by Project Hourly Rate.'
			},
			{
				displayName: 'Budget',
				name: 'budget',
				type: 'string',
				default: '',
				description: 'The budget in hours for the project when budgeting by time.'
			},
			{
				displayName: 'Budget Is Monthly',
				name: 'budget_is_monthly',
				type: 'string',
				default: '',
				description: 'Option to have the budget reset every month. Defaults to false.'
			},
			{
				displayName: 'Notify When Over Budget',
				name: 'notify_when_over_budget',
				type: 'string',
				default: '',
				description: 'Whether project managers should be notified when the project goes over budget. Defaults to false.'
			},
			{
				displayName: 'Over Budget Notification Percentage',
				name: 'over_budget_notification_percentage',
				type: 'string',
				default: '',
				description: 'Percentage value used to trigger over budget email alerts. Example: use 10.0 for 10.0%.'
			},
			{
				displayName: 'Show Budget To All',
				name: 'show_budget_to_all',
				type: 'string',
				default: '',
				description: 'Option to show project budget to all employees. Does not apply to Total Project Fee projects. Defaults to false.'
			},
			{
				displayName: 'Cost Budget',
				name: 'cost_budget',
				type: 'string',
				default: '',
				description: 'The monetary budget for the project when budgeting by money.'
			},
			{
				displayName: 'Cost Budget Include Expenses',
				name: 'cost_budget_include_expenses',
				type: 'string',
				default: '',
				description: 'Option for budget of Total Project Fees projects to include tracked expenses. Defaults to false.'
			},
			{
				displayName: 'Fee',
				name: 'fee',
				type: 'string',
				default: '',
				description: 'The amount you plan to invoice for the project. Only used by fixed-fee projects.'
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Notes about the project.'
			},
			{
				displayName: 'Starts On',
				name: 'starts_on',
				type: 'dateTime',
				default: '',
				description: 'Date the project was started.'
			},
			{
				displayName: 'Ends On',
				name: 'ends_on',
				type: 'dateTime',
				default: '',
				description: 'Date the project will end.'
			},

		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                project:update                           */
	/* -------------------------------------------------------------------------- */

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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the project.',
			},
			{
				displayName: 'Client Id',
				name: 'client_id',
				type: 'string',
				default: '',
				description: 'The ID of the client to associate this project with.',
			},
			{
				displayName: 'Is Billable',
				name: 'is_billable',
				type: 'string',
				default: '',
				description: 'Whether the project is billable or not.',
			},
			{
				displayName: 'Bill By',
				name: 'bill_by',
				type: 'string',
				default: '',
				description: 'The method by which the project is invoiced. Options: Project, Tasks, People, or none.',
			},
			{
				displayName: 'Budget By',
				name: 'budget_by',
				type: 'string',
				default: '',
				description: 'The email of the user.',
			},
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether the project is active or archived. Defaults to true'
			},
			{
				displayName: 'Is Fixed Fee',
				name: 'is_fixed_fee',
				type: 'string',
				default: '',
				description: 'Whether the project is a fixed-fee project or not.'
			},
			{
				displayName: 'Hourly Rate',
				name: 'hourly_rate',
				type: 'string',
				default: '',
				description: 'Rate for projects billed by Project Hourly Rate.'
			},
			{
				displayName: 'Budget',
				name: 'budget',
				type: 'string',
				default: '',
				description: 'The budget in hours for the project when budgeting by time.'
			},
			{
				displayName: 'Budget Is Monthly',
				name: 'budget_is_monthly',
				type: 'string',
				default: '',
				description: 'Option to have the budget reset every month. Defaults to false.'
			},
			{
				displayName: 'Notify When Over Budget',
				name: 'notify_when_over_budget',
				type: 'string',
				default: '',
				description: 'Whether project managers should be notified when the project goes over budget. Defaults to false.'
			},
			{
				displayName: 'Over Budget Notification Percentage',
				name: 'over_budget_notification_percentage',
				type: 'string',
				default: '',
				description: 'Percentage value used to trigger over budget email alerts. Example: use 10.0 for 10.0%.'
			},
			{
				displayName: 'Show Budget To All',
				name: 'show_budget_to_all',
				type: 'string',
				default: '',
				description: 'Option to show project budget to all employees. Does not apply to Total Project Fee projects. Defaults to false.'
			},
			{
				displayName: 'Cost Budget',
				name: 'cost_budget',
				type: 'string',
				default: '',
				description: 'The monetary budget for the project when budgeting by money.'
			},
			{
				displayName: 'Cost Budget Include Expenses',
				name: 'cost_budget_include_expenses',
				type: 'string',
				default: '',
				description: 'Option for budget of Total Project Fees projects to include tracked expenses. Defaults to false.'
			},
			{
				displayName: 'Fee',
				name: 'fee',
				type: 'string',
				default: '',
				description: 'The amount you plan to invoice for the project. Only used by fixed-fee projects.'
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Notes about the project.'
			},
			{
				displayName: 'Starts On',
				name: 'starts_on',
				type: 'dateTime',
				default: '',
				description: 'Date the project was started.'
			},
			{
				displayName: 'Ends On',
				name: 'ends_on',
				type: 'dateTime',
				default: '',
				description: 'Date the project will end.'
			},

		],
	},

] as INodeProperties[];
