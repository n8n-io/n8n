import {
	INodeProperties,
} from 'n8n-workflow';

export const deviceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['device'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Adding a batch of devices',
			},
			{
				name: 'Batch Delete',
				value: 'batchDelete',
				description: 'Deleting a batch of devices',
			},
			{
				name: 'Edit',
				value: 'edit',
				description: 'Editing the device',
			},
			{
				name: 'Get Complex List',
				value: 'getComplexList',
				description: 'Viewing devices by paging',
			},
			{
				name: 'Get Search List',
				value: 'getSearchList',
				description: 'Searching for Devices by Paging according to the MAC/Extension/Site',
			},
		],
		default: 'getComplexList',
	},
];

export const deviceFields: INodeProperties[] = [
	/*-------------------------------------------------------------------------- */
	/*                                device:add                            	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Mac',
		name: 'mac',
		required: true,
		type: 'string',
		// type: 'options',
		// typeOptions: {
		// 	loadOptionsMethod: 'getDeviceMacs',
		// },
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['add'],
			},
		},
		default: '',
		description: 'The list of the MAC addresses',
	},
	{
		displayName: 'Model ID',
		name: 'modelId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['add'],
			},
		},
		default: '',
		description: 'The model ID',
	},
	{
		displayName: 'Region ID',
		name: 'regionId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getRegionIds',
		},
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['add'],
			},
		},
		default: '',
		description: 'The site ID',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'Auth Name',
				name: 'authName',
				type: 'string',
				default: '',
				description: 'The account for authentication',
			},
			{
				displayName: 'Machine ID',
				name: 'machineId',
				type: 'string',
				default: '',
				description: 'The SN code',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'The authentication password',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The device name',
			},
			{
				displayName: 'Remark',
				name: 'remark',
				type: 'string',
				default: '',
				description: 'The notes',
			},
			{
				displayName: 'Server ID',
				name: 'serverId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getServerIds',
				},
				default: '',
				description: 'The server ID',
			},
			// {
			// 	displayName: 'Staff IDs',
			// 	name: 'staffIds',
			// 	type: 'multiOptions',
			// 	typeOptions: {
			// 		loadOptionsMethod: 'getStaffIds',
			// 	},
			// 	default: {},
			// 	description: 'The list of the account IDs that you cannot specify',
			// },
			{
				displayName: 'Staff IDs',
				name: 'staffIds',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Staff ID',
				default: {},
				description: 'The list of the account IDs that you cannot specify',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'The account ID',
					},
				],
			},
			{
				displayName: 'Staffs',
				name: 'staffs',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Staff',
				default: {},
				description: 'The account information that you can specify',
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Line ID',
								name: 'lineId',
								type: 'number',
								default: 0,
								description: 'The line ID, which indicates the display order of the registered account on the phone screen',
							},
							{
								displayName: 'Staff ID',
								name: 'staffId',
								type: 'string',
								default: '',
								description: 'The account ID',
							},
						],
					},
				],
			},
			{
				displayName: 'Sync RPS',
				name: 'syncRps',
				type: 'boolean',
				default: false,
				description: 'Synchronize the device to the RPS device',
			},
			{
				displayName: 'Unique Server URL',
				name: 'uniqueServerUrl',
				type: 'string',
				default: '',
				description: 'The unique server URL',
			},
		],
	},

	/*-------------------------------------------------------------------------- */
	/*                             device:batchDelete                            */
	/* ------------------------------------------------------------------------- */

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['batchDelete'],
			},
		},
		options: [
			// {
			// 	displayName: 'Device IDs',
			// 	name: 'deviceIds',
			// 	type: 'multiOptions',
			// 	typeOptions: {
			// 		loadOptionsMethod: 'getDeviceIds',
			// 	},
			// 	default: {},
			// 	description: 'The list of the device IDs',
			// },
			{
				displayName: 'DeviceIds IDs',
				name: 'deviceIds',
				required: true,
				type: 'collection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add ID',
				default: {},
				description: 'The list of the device IDs',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'The device ID',
					},
				],
			},
			{
				displayName: 'Sync RPS',
				name: 'syncRps',
				type: 'boolean',
				default: true,
				description: 'Whether to synchronize the device to the RPS device. The default value is true.',
			},
			// {
			// 	displayName: 'Macs',
			// 	name: 'macs',
			// 	type: 'multiOptions',
			// 	typeOptions: {
			// 		loadOptionsMethod: 'getDeviceMacs',
			// 	},
			// 	default: {},
			// 	description: 'The list of the MAC addresses',
			// },
			{
				displayName: 'Macs',
				name: 'macs',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add ID',
				default: {},
				description: 'The list of the MAC addresses',
				options: [
					{
						displayName: 'Mac',
						name: 'mac',
						type: 'string',
						default: '',
						description: 'The MAC address',
					},
				],
			},
			{
				displayName: 'Delete RPS',
				name: 'deleteRps',
				type: 'boolean',
				default: true,
				description: 'Whether to delete RPS devices simultaneously or not. The default value is true.',
			},
		],
	},

	/*-------------------------------------------------------------------------- */
	/*                                device:edit                            	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		required: true,
		type: 'string',
		// type: 'options',
		// typeOptions: {
		// 	loadOptionsMethod: 'getDeviceIds',
		// },
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['edit'],
			},
		},
		default: '',
		description: 'The device ID',
	},
	{
		displayName: 'Region ID',
		name: 'regionId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getRegionIds',
		},
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['edit'],
			},
		},
		default: '',
		description: 'The site ID',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['edit'],
			},
		},
		options: [
			{
				displayName: 'Auth Name',
				name: 'authName',
				type: 'string',
				default: '',
				description: 'The account for authentication',
			},
			{
				displayName: 'Machine ID',
				name: 'machineId',
				type: 'string',
				default: '',
				description: 'The SN code',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'The password for authentication',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The device name',
			},
			{
				displayName: 'Remark',
				name: 'remark',
				type: 'string',
				default: '',
				description: 'The notes',
			},
			{
				displayName: 'Server ID',
				name: 'serverId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getServerIds',
				},
				default: '',
				description: 'The server ID',
			},
			// {
			// 	displayName: 'Staff IDs',
			// 	name: 'staffIds',
			// 	type: 'multiOptions',
			// 	typeOptions: {
			// 		loadOptionsMethod: 'getStaffIds',
			// 	},
			// 	default: {},
			// 	description: 'The list of the account IDs that you cannot specify',
			// },
			{
				displayName: 'Staff IDs',
				name: 'staffIds',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Staff ID',
				default: {},
				description: 'The list of the account IDs that you cannot specify',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'The account ID',
					},
				],
			},
			{
				displayName: 'Staffs',
				name: 'staffs',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Staff',
				default: {},
				description: 'The account information that you can specify',
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Line ID',
								name: 'lineId',
								type: 'number',
								default: 0,
								description: 'The line ID, which indicates the display order of the registered account on the phone screen',
							},
							{
								displayName: 'Staff ID',
								name: 'staffId',
								type: 'string',
								default: '',
								description: 'The account ID',
							},
						],
					},
				],
			},
			{
				displayName: 'Sync RPS',
				name: 'syncRps',
				type: 'boolean',
				default: false,
				description: 'Synchronize the device to the RPS device',
			},
			{
				displayName: 'Unique Server URL',
				name: 'uniqueServerUrl',
				type: 'string',
				default: '',
				description: 'The unique server URL',
			},
		],
	},

	/*-------------------------------------------------------------------------- */
	/*                           device:getComplexList                        	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['getComplexList'],
			},
		},
		options: [
			{
				displayName: 'Auto Count',
				name: 'autoCount',
				type: 'boolean',
				default: false,
				description: 'Whether the total number is accounted automatically. It defaults to false.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 0,
				description: 'The maximum number of the obtained records per paging. When you use regionIds to search for devices, this parameter(limit) is required to ensure the interface performance.',
			},
			{
				displayName: 'Search Key',
				name: 'searchKey',
				type: 'string',
				default: '',
				description: 'The keywords used for searching for MAC, IP, the device name, or the account information',
			},
			{
				displayName: 'Model IDs',
				name: 'modelIds',
				type: 'string',
				default: '',
				description: 'The model ID used for confining the model',
			},
			{
				displayName: 'Orderbys',
				name: 'orderbys',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Staff',
				default: {},
				description: '',
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Order',
								name: 'order',
								type: 'number',
								default: '',
								description: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Region IDs',
				name: 'regionIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getRegionIds',
				},
				default: [],
				description: 'The list of the site IDs (confining the searching scope)',
			},
			{
				displayName: 'Skip',
				name: 'skip',
				type: 'number',
				default: '',
				description: 'The number of skipped search results. This allows you to directly view the desired item by skipping some items. When you use regionIds to search for devices, this parameter(skip) is required to ensure the interface performance.',
			},
		],
	},

	/*-------------------------------------------------------------------------- */
	/*                           device:getSearchList                        	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Mac',
		name: 'mac',
		required: true,
		type: 'string',
		// type: 'options',
		// typeOptions: {
		// 	loadOptionsMethod: 'getDeviceMacs',
		// },
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['getSearchList'],
			},
		},
		default: '',
		description: 'The MAC address',
	},
	{
		displayName: 'Username',
		name: 'username',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['getSearchList'],
			},
		},
		default: '',
		description: 'The account information',
	},
	{
		displayName: 'Region IDs',
		name: 'regionIds',
		required: true,
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getRegionIds',
		},
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['getSearchList'],
			},
		},
		default: [],
		description: 'The list of the site IDs',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['getSearchList'],
			},
		},
		options: [
			{
				displayName: 'Auto Count',
				name: 'autoCount',
				type: 'boolean',
				default: false,
				description: 'Whether the total number is accounted automatically. It defaults to false.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 0,
				description: 'The maximum number of the obtained records per paging. When you use regionIds to search for devices, this parameter(limit) is required to ensure the interface performance.',
			},
			{
				displayName: 'Orderbys',
				name: 'orderbys',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Staff',
				default: {},
				description: '',
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Order',
								name: 'order',
								type: 'number',
								default: '',
								description: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Skip',
				name: 'skip',
				type: 'number',
				default: '',
				description: 'The number of skipped search results. This allows you to directly view the desired item by skipping some items. When you use regionIds to search for devices, this parameter(skip) is required to ensure the interface performance.',
			},
		],
	},

];