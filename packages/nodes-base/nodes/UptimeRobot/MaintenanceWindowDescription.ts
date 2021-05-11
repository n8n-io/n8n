import { INodeProperties } from 'n8n-workflow';

export const maintenanceWindowOperations = [
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
					'mwindows',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The correspondent value for the maintenance window type.',
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
		description: 'The ID of the maintenance window.',
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
