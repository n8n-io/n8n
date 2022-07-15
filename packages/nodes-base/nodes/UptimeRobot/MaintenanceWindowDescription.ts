import {
	INodeProperties,
} from 'n8n-workflow';

export const maintenanceWindowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a maintenance window',
				action: 'Create a maintenance window',

			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a maintenance window',
				action: 'Delete a maintenance window',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a maintenance window',
				action: 'Get a maintenance window',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all a maintenance windows',
				action: 'Get all maintenance windows',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a maintenance window',
				action: 'Update a maintenance window',
			},
		],
		default: 'getAll',
	},
];

export const maintenanceWindowFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                maintenanceWindow:create                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Duration (Minutes)',
		name: 'duration',
		type: 'number',
		required: true,
		default: 1,
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The maintenance window activation period (minutes)',
	},
	{
		displayName: 'Friendly Name',
		name: 'friendlyName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The friendly name of the maintenance window',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: '',
		options: [
			{
				name: 'Once',
				value: 1,
			},
			{
				name: 'Daily',
				value: 2,
			},
			{
				name: 'Weekly',
				value: 3,
			},
			{
				name: 'Monthly',
				value: 4,
			},
		],
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The type of the maintenance window',
	},
	{
		displayName: 'Week Day',
		name: 'weekDay',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'create',
				],
				type: [
					3,
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Monday',
				value: 1,
			},
			{
				name: 'Tuesday',
				value: 2,
			},
			{
				name: 'Wednesday',
				value: 3,
			},
			{
				name: 'Thursday',
				value: 4,
			},
			{
				name: 'Friday',
				value: 5,
			},
			{
				name: 'Saturday',
				value: 6,
			},
			{
				name: 'Sunday',
				value: 7,
			},
		],
		default: '',
	},
	{
		displayName: 'Month Day',
		name: 'monthDay',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'create',
				],
				type: [
					4,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 30,
		},
		default: 1,
	},
	{
		displayName: 'Start Time',
		name: 'start_time',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The maintenance window start datetime',
	},

	/* -------------------------------------------------------------------------- */
	/*                                maintenanceWindow:delete                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'delete',
					'get',
				],
			},
		},
		description: 'The ID of the maintenance window',
	},

	/* -------------------------------------------------------------------------- */
	/*                                maintenanceWindow:getAll                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'maintenanceWindow',
				],
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
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Maintenance Window IDs',
				name: 'mwindow',
				type: 'string',
				default: '',
				description: 'Maintenance windows IDs separated with dash, e.g. 236-1782-4790',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                maintenanceWindow:update                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The ID of the maintenance window',
	},
	{
		displayName: 'Duration (Minutes)',
		name: 'duration',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The maintenance window activation period (minutes)',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'maintenanceWindow',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Friendly Name',
				name: 'friendly_name',
				type: 'string',
				default: '',
				description: 'The friendly name of the maintenance window',
			},
			{
				displayName: 'Start Time',
				name: 'start_time',
				type: 'dateTime',
				default: '',
				description: 'The maintenance window start datetime',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Once',
						value: 1,
					},
					{
						name: 'Daily',
						value: 2,
					},
					{
						name: 'Weekly',
						value: 3,
					},
					{
						name: 'Monthly',
						value: 4,
					},
				],
				description: 'The type of the maintenance window',
			},
			{
				displayName: 'Week Day',
				name: 'weekDay',
				type: 'options',
				displayOptions: {
					show: {
						type: [
							3,
						],
					},
				},
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Monday',
						value: 1,
					},
					{
						name: 'Tuesday',
						value: 2,
					},
					{
						name: 'Wednesday',
						value: 3,
					},
					{
						name: 'Thursday',
						value: 4,
					},
					{
						name: 'Friday',
						value: 5,
					},
					{
						name: 'Saturday',
						value: 6,
					},
					{
						name: 'Sunday',
						value: 7,
					},
				],
				default: '',
			},
			{
				displayName: 'Month Day',
				name: 'monthDay',
				type: 'number',
				displayOptions: {
					show: {
						type: [
							4,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 30,
				},
				default: 1,
			},
		],
	},
];
