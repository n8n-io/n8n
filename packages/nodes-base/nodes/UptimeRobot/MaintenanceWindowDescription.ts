import { INodeProperties } from 'n8n-workflow';

export const maintenanceWindowOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'mwindow',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const maintenanceWindowFields = [
	/* -------------------------------------------------------------------------- */
	/*                                maintenanceWindow:create                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Duration',
		name: 'duration',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'mwindow',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The maintenance window activation period (minutes).',
	},
	{
		displayName: 'Friendly Name',
		name: 'friendly_name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'mwindow',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The friendly name of the maintenance window.',
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
					'mwindow',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The maintenance window start datetime.',
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
					'mwindow',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The type of the maintenance window.',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'mwindow',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The correspondent value for the maintenance window type.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                maintenanceWindow:delete                 */
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
					'mwindow',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'The ID of the maintenance window.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                maintenanceWindow:getAll                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'mwindow',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'mwindow',
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
		description: 'How many results to return.',
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
					'mwindow',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Maintenance Window',
				name: 'mwindow',
				type: 'string',
				default: '',
				description: 'Specify maintenance windows IDs separated with dash, e.g. 236-1782-4790.',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'Defines the record to start paginating.',
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
					'mwindow',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The ID of the maintenance window.',
	},
	{
		displayName: 'Duration',
		name: 'duration',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'mwindow',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The maintenance window activation period (minutes).',
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
					'mwindow',
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
				description: 'The friendly name of the maintenance window.',
			},
			{
				displayName: 'Start Time',
				name: 'start_time',
				type: 'dateTime',
				default: '',
				description: 'The maintenance window start datetime.',
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
				description: 'The type of the maintenance window.',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				description: 'The correspondent value for the maintenance window type.',
			},
		],
	},
] as INodeProperties[];
