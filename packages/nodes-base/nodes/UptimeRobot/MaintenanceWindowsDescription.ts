import { INodeProperties } from 'n8n-workflow';

export const maintenanceWindowsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'mwindows',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new maintenance windows.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a maintenance windows.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all maintenance windowss.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a maintenance windows.',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const maintenanceWindowsFields = [
	/* -------------------------------------------------------------------------- */
	/*                                maintenanceWindows:create                    */
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
					'mwindows',
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
					'mwindows',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The friendly name of the alert contact.',
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
					'mwindows',
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
					'mwindows',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The type of the alert contact.',
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
					'mwindows',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The correspondent value for the alert contact type.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                maintenanceWindows:delete                 */
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
					'mwindows',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'The ID of the alert contact.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                maintenanceWindows:getAll                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'mwindows',
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
					'mwindows',
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
					'mwindows',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Maintenance Window',
				name: 'mwindows',
				type: 'string',
				default: '',
				description: 'Specify maintenance windows IDs separated with dash, eg 236-1782-4790.',
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
	/*                                maintenanceWindows:update                    */
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
					'mwindows',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The ID of the alert contact.',
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
					'mwindows',
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
					'mwindows',
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
				description: 'The friendly name of the alert contact.',
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
				description: 'The type of the alert contact.',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				description: 'The correspondent value for the alert contact type.',
			},
		],
	},
] as INodeProperties[];
