import type { INodeProperties } from 'n8n-workflow';

export const deviceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['device'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a ChromeOS device',
				action: 'Get ChromeOS device',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many ChromeOS devices',
				action: 'Get many ChromeOS devices',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a ChromeOS device',
				action: 'Update ChromeOS device',
			},
			{
				name: 'Change Status',
				value: 'changeStatus',
				description: 'Change the status of a ChromeOS device',
				action: 'Change status of ChromeOS device',
			},
		],
		default: 'get',
	},
];

export const deviceFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                               device                                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Device',
		name: 'deviceId',
		type: 'resourceLocator',
		required: true,
		displayOptions: {
			show: {
				operation: ['get', 'update', 'changeStatus'],
				resource: ['device'],
			},
		},
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the device you want to retrieve',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchDevices',
				},
			},
			{
				displayName: 'By ID',
				name: 'deviceId',
				type: 'string',
				hint: 'Enter the device id',
				placeholder: 'e.g. 123e4567-e89b-12d3-a456-426614174000',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                               device:get                                   */
	/* -------------------------------------------------------------------------- */

	/* -------------------------------------------------------------------------- */
	/*                               device:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['device'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['device'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Output',
		name: 'projection',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Basic',
				value: 'basic',
				description: 'Do not include any custom fields for the user',
			},
			{
				name: 'Full',
				value: 'full',
				description: 'Include all fields associated with this user',
			},
		],
		displayOptions: {
			show: {
				operation: ['get', 'getAll'],
				resource: ['device'],
			},
		},
		default: 'basic',
		description: 'What subset of fields to fetch for this device',
	},
	{
		displayName: 'Include Children',
		name: 'includeChildOrgunits',
		type: 'boolean',
		default: false,
		description:
			'Whether to include devices from organizational units below your specified organizational unit',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['device'],
			},
		},
	},
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['device'],
			},
		},
		options: [
			{
				displayName: 'Organizational Unit Name or ID',
				name: 'orgUnitPath',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrgUnits',
				},
				default: [],
				description:
					'Specify the organizational unit name or ID. Choose from the list or use an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				placeholder: 'e.g. name:contact* email:contact*',
				default: '',
				description: "Use Google's querying syntax to filter results",
			},
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'fixedCollection',
		placeholder: 'Add Sort Rule',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['device'],
			},
		},
		options: [
			{
				name: 'sortRules',
				displayName: 'Sort Rules',
				values: [
					{
						displayName: 'Order By',
						name: 'orderBy',
						type: 'options',
						options: [
							{
								name: 'Annotated Location',
								value: 'annotatedLocation',
							},
							{
								name: 'Annotated User',
								value: 'annotatedUser',
							},
							{
								name: 'Last Sync',
								value: 'lastSync',
							},
							{
								name: 'Notes',
								value: 'notes',
							},
							{
								name: 'Serial Number',
								value: 'serialNumber',
							},
							{
								name: 'Status',
								value: 'status',
							},
						],
						default: '',
						description: 'Field to sort the results by',
					},
					{
						displayName: 'Sort Order',
						name: 'sortBy',
						type: 'options',
						options: [
							{
								name: 'Ascending',
								value: 'ascending',
							},
							{
								name: 'Descending',
								value: 'descending',
							},
						],
						default: '',
						description: 'Sort order direction',
					},
				],
			},
		],
		description: 'Define sorting rules for the results',
	},

	/* -------------------------------------------------------------------------- */
	/*                               device:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update Fields',
		name: 'updateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['device'],
			},
		},
		options: [
			{
				displayName: 'Move to Organizational Unit Name or ID',
				name: 'orgUnitPath',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrgUnits',
				},
				default: [],
				description:
					'The full path to the organizational unit. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Annotated User',
				name: 'annotatedUser',
				type: 'string',
				default: '',
				description: 'The annotated user of the device',
				placeholder: 'e.g. help desk',
			},
			{
				displayName: 'Annotated Location',
				name: 'annotatedLocation',
				type: 'string',
				default: '',
				description: 'The annotated location of the device',
				placeholder: 'e.g. Mountain View help desk Chromebook',
			},
			{
				displayName: 'Annotated Asset ID',
				name: 'annotatedAssetId',
				type: 'string',
				default: '',
				description: 'The annotated asset ID of a device',
				placeholder: 'e.g. 1234567890',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Add notes to a device',
				placeholder: 'e.g. Loaned from support',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                               device:changeStatus                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Status',
		name: 'action',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Enabled',
				value: 'reenable',
				description: 'Re-enable a disabled chromebook',
				action: 'Enable a device',
			},
			{
				name: 'Disabled',
				value: 'disable',
				description: 'Disable a chromebook',
				action: 'Disable a device',
			},
		],
		displayOptions: {
			show: {
				operation: ['changeStatus'],
				resource: ['device'],
			},
		},
		default: 'reenable',
		description: 'Set the status of a device',
	},
];
