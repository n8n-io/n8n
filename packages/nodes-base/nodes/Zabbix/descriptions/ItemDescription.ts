import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getCommonGetParameters,
	limitSelects,
	preserveKeys,
	selectApplicationsQuery,
	selectDiscoveryRuleQuery,
	selectGraphsQuery,
	selectHostsQuery,
	selectInterfacesQuery,
	selectTriggersQuery,
} from './shared';

export const itemOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
			},
		},
		options: [
			// {
			// 	name: 'Create',
			// 	value: 'create',
			// 	description: 'Create an item',
			// },
			// {
			// 	name: 'Delete',
			// 	value: 'delete',
			// 	description: 'Delete items. Dependent items and item prototypes are removed automatically if master item is deleted',
			// },
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve items according to the given parameters',
			},
			// {
			// 	name: 'Update',
			// 	value: 'update',
			// 	description: 'Update existing items',
			// },
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const itemFields = [

	/*-------------------------------------------------------------------------- */
	/*                                item:create                             	 */
	/* ------------------------------------------------------------------------- */
	// {
	// 	displayName: 'See <a href="https://www.zabbix.com/documentation/5.0/en/manual/config/items/item/custom_intervals" target="_blank">Zabbix documentation</a> on custom intervals',
	// 	name: 'jsonNotice',
	// 	type: 'notice',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'item',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// },
	// {
	// 	displayName: 'Delay',
	// 	name: 'delay',
	// 	type: 'string',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'item',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	description: 'Update interval of the item. Accepts seconds or a time unit with suffix (30s,1m,2h,1d). Optionally one or more custom intervals can be specified either as flexible intervals or scheduling. Multiple intervals are separated by a semicolon.',
	// },
	// {
	// 	displayName: 'Host ID',
	// 	name: 'hostid',
	// 	type: 'string',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'item',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	description: 'ID of the host or template that the item belongs to. For update operations this field is readonly.',
	// },
	// {
	// 	displayName: 'Interface ID',
	// 	name: 'interfaceid',
	// 	type: 'string',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'item',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	description: 'ID of the item\'s host interface. Not required for template items. Optional for internal, active agent, trapper, aggregate, calculated, dependent and database monitor items.',
	// },
	// {
	// 	displayName: 'Key',
	// 	name: 'key_',
	// 	type: 'string',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'item',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	description: 'Item key.',
	// },
	// {
	// 	displayName: 'Name',
	// 	name: 'name',
	// 	type: 'string',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'item',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	description: 'Name of the item.',
	// },
	// {
	// 	displayName: 'Type',
	// 	name: 'type',
	// 	type: 'options',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'item',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	default: 0,
	// 	description: 'Type of the item.',
	// 	options: [
	// 		{
	// 			name: '0 - Zabbix agent',
	// 			value: 0,
	// 		},
	// 		{
	// 			name: '2 - Zabbix trapper',
	// 			value: 2,
	// 		},
	// 		{
	// 			name: '3 - Simple check',
	// 			value: 3,
	// 		},
	// 		{
	// 			name: '5 - Zabbix internal',
	// 			value: 5,
	// 		},
	// 		{
	// 			name: '7 - Zabbix agent (active)',
	// 			value: 7,
	// 		},
	// 		{
	// 			name: '8 - Zabbix aggregate',
	// 			value: 8,
	// 		},
	// 		{
	// 			name: '9 - Web item',
	// 			value: 9,
	// 		},
	// 		{
	// 			name: '10 - External check',
	// 			value: 10,
	// 		},
	// 		{
	// 			name: '11 - Database monitor',
	// 			value: 11,
	// 		},
	// 		{
	// 			name: '12 - IPMI agent',
	// 			value: 12,
	// 		},
	// 		{
	// 			name: '13 - SSH agent',
	// 			value: 13,
	// 		},
	// 		{
	// 			name: '14 - Telnet agent',
	// 			value: 14,
	// 		},
	// 		{
	// 			name: '15 - Calculated',
	// 			value: 15,
	// 		},
	// 		{
	// 			name: '16 - JMX agent',
	// 			value: 16,
	// 		},
	// 		{
	// 			name: '17 - SNMP trap',
	// 			value: 17,
	// 		},
	// 		{
	// 			name: '18 - Dependent item',
	// 			value: 18,
	// 		},
	// 		{
	// 			name: '19 - HTTP agent',
	// 			value: 19,
	// 		},
	// 		{
	// 			name: '20 - SNMP agent',
	// 			value: 20,
	// 		},
	// 	],
	// },
	// {
	// 	displayName: 'Value Type',
	// 	name: 'value_type',
	// 	type: 'string',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'item',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	description: 'Type of information of the item.',
	// },
	//
	// // Parameters
	// {
	// 	displayName: 'Parameters',
	// 	name: 'parameters',
	// 	type: 'collection',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'item',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	placeholder: 'Add Parameter',
	// 	default: {},
	// 	description: 'Additional parameters which are not required.',
	// 	options: [
	// 		{
	// 			displayName: 'URL',
	// 			name: 'url',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'URL string, required only for HTTP agent item type. Supports user macros, {HOST.IP}, {HOST.CONN}, {HOST.DNS}, {HOST.HOST}, {HOST.NAME}, {ITEM.ID}, {ITEM.KEY}.',
	// 		},
	// 		{
	// 			displayName: 'Auth Type',
	// 			name: 'authtype',
	// 			type: 'options',
	// 			default: 0,
	// 			description: 'Used only by SSH agent items or HTTP agent items.',
	// 			options: [
	// 				{
	// 					name: '0 - (default) password for SHH / (default) none for HTTP',
	// 					value: 0,
	// 				},
	// 				{
	// 					name: '1 - public key for SHH / basic for HTTP',
	// 					value: 1,
	// 				},
	// 				{
	// 					name: '2 - NTLM for HTTP',
	// 					value: 2,
	// 				},
	// 				{
	// 					name: '3 - Kerberos for HTTP',
	// 					value: 3,
	// 				},
	// 			],
	// 		},
	// 		{
	// 			displayName: 'Description',
	// 			name: 'description',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'Description of the item.',
	// 		},
	//
	// 		{
	// 			displayName: 'Follow Redirects',
	// 			name: 'follow_redirects',
	// 			type: 'boolean',
	// 			default: false,
	// 			description: 'HTTP agent item field. Follow response redirects while pooling data.',
	// 		},
	// 		{
	// 			displayName: 'Headers',
	// 			name: 'headers',
	// 			type: 'fixedCollection',
	// 			typeOptions: {
	// 				multipleValues: true,
	// 			},
	// 			placeholder: 'Add Header',
	// 			default: { header: [] },
	// 			description: 'HTTP agent item field. Object with HTTP(S) request headers, where header name is used as key and header value as value.',
	// 			options: [
	// 				{
	// 					displayName: 'Header',
	// 					name: 'header',
	// 					values: [
	// 						{
	// 							displayName: 'Key',
	// 							name: 'key',
	// 							type: 'string',
	// 							default: '',
	// 							description: 'A header key.',
	// 						},
	// 						{
	// 							displayName: 'Value',
	// 							name: 'value',
	// 							type: 'string',
	// 							default: '',
	// 							description: 'A header value.',
	// 						},
	// 					],
	// 				},
	// 			],
	// 		},
	// 		{
	// 			displayName: 'History',
	// 			name: 'history',
	// 			type: 'string',
	// 			default: '90d',
	// 			description: 'A time unit of how long the history data should be stored. Also accepts user macro. Default: 90d.',
	// 		},
	// 		{
	// 			displayName: 'Http Proxy',
	// 			name: 'http_proxy',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'HTTP agent item field. HTTP(S) proxy connection string.',
	// 		},
	// 		{
	// 			displayName: 'Inventory Link',
	// 			name: 'inventory_link',
	// 			type: 'number',
	// 			default: 0,
	// 			description: 'ID of the host inventory field that is populated by the item. Refer to the host inventory page for a list of supported host inventory fields and their IDs. Default: 0.',
	// 		},
	// 		{
	// 			displayName: 'Ipmi Sensor',
	// 			name: 'ipmi_sensor',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'IPMI sensor. Used only by IPMI items.',
	// 		},
	// 		{
	// 			displayName: 'JMX Endpoint',
	// 			name: 'jmx_endpoint',
	// 			type: 'string',
	// 			default: 'service:jmx:rmi:///jndi/rmi://{HOST.CONN}:{HOST.PORT}/jmxrmi',
	// 			description: 'JMX agent custom connection string. Default value: service:jmx:rmi:///jndi/rmi://{HOST.CONN}:{HOST.PORT}/jmxrmi',
	// 		},
	// 		{
	// 			displayName: 'Log Time Format',
	// 			name: 'logtimefmt',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'Format of the time in log entries. Used only by log items.',
	// 		},
	// 		{
	// 			displayName: 'Master Item ID',
	// 			name: 'master_itemid',
	// 			type: 'number',
	// 			default: '',
	// 			description: 'Master item ID. Recursion up to 3 dependent items and maximum count of dependent items equal to 29999 are allowed. Required by dependent items.',
	// 		},
	// 		{
	// 			displayName: 'Output Format',
	// 			name: 'output_format',
	// 			type: 'boolean',
	// 			default: false,
	// 			description: 'HTTP agent item field. Should the response be converted to JSON.',
	// 		},
	// 		{
	// 			displayName: 'Params',
	// 			name: 'params',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'Additional parameters depending on the type of the item:\n' +
	// 				'- executed script for SSH and Telnet items;\n' +
	// 				'- SQL query for database monitor items;\n' +
	// 				'- formula for calculated items.',
	// 		},
	// 		{
	// 			displayName: 'Password',
	// 			name: 'password',
	// 			type: 'string',
	// 			typeOptions: {
	// 				password: true,
	// 			},
	// 			default: '',
	// 			description: 'Password for authentication. Used by simple check, SSH, Telnet, database monitor, JMX and HTTP agent items.\n' +
	// 				'When used by JMX, username should also be specified together with password or both properties should be left blank.',
	// 		},
	// 		{
	// 			displayName: 'Post Type',
	// 			name: 'post_type',
	// 			type: 'options',
	// 			default: 0,
	// 			description: 'HTTP agent item field. Type of post data body stored in posts property.',
	// 			options: [
	// 				{
	// 					name: '0 - (default) Raw data',
	// 					value: 0,
	// 				},
	// 				{
	// 					name: '2 - JSON data',
	// 					value: 2,
	// 				},
	// 				{
	// 					name: '3 - XML data',
	// 					value: 3,
	// 				},
	// 			],
	// 		},
	// 		{
	// 			displayName: 'Posts',
	// 			name: 'posts',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'HTTP agent item field. HTTP(S) request body data. Used with post_type.',
	// 		},
	// 		{
	// 			displayName: 'Private Key',
	// 			name: 'privatekey',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'Name of the private key file.',
	// 		},
	// 		{
	// 			displayName: 'Public Key',
	// 			name: 'publickey',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'Name of the public key file.',
	// 		},
	//
	// 		//...........
	//
	// 	],
	// },

	/*-------------------------------------------------------------------------- */
	/*                                item:delete                             	 */
	/* ------------------------------------------------------------------------- */

	// {
	// 	displayName: 'Parameters',
	// 	name: 'parameters',
	// 	type: 'fixedCollection',
	// 	typeOptions: {
	// 		multipleValues: true,
	// 	},
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'item',
	// 			],
	// 			operation: [
	// 				'delete',
	// 			],
	// 		},
	// 	},
	// 	placeholder: 'Add Item',
	// 	default: {},
	// 	description: 'IDs of the items to delete.',
	// 	options: [
	// 		{
	// 			displayName: 'Items',
	// 			name: 'items',
	// 			values: [
	// 				{
	// 					displayName: 'Item ID',
	// 					name: 'id',
	// 					type: 'string',
	// 					default: '',
	// 					description: 'ID of the item to delete.',
	// 				},
	// 			],
	// 		},
	//
	// 	],
	// },

	/*-------------------------------------------------------------------------- */
	/*                                item:get	                             	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'get',
				],
			},
		},
		default: false,
		description: 'Add parameters as JSON.',
	},
	{
		displayName: 'See <a href="https://www.zabbix.com/documentation/5.0/en/manual/api/reference/item/get" target="_blank">Zabbix documentation</a> on item.get properties',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'get',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Parameters JSON',
		name: 'parametersJson',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'get',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Parameters as JSON (flat object) or JSON string.',
	},
	{
		displayName: 'Parameters',
		name: 'parametersUi',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'get',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: {},
		placeholder: 'Add Parameters',
		description: 'The parameters to add',
		options: [
			{
				displayName: 'Item IDs',
				name: 'itemids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Item',
				},
				placeholder: 'Add Item ID',
				default: {},
				description: 'Return only those results that exactly match the given filter.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the item.',
					},
				],
			},
			{
				displayName: 'Group IDs',
				name: 'groupids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Group',
				},
				placeholder: 'Add Group ID',
				default: {},
				description: 'Return only items that belong to the hosts from the given groups.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the group.',
					},
				],
			},
			{
				displayName: 'Template IDs',
				name: 'templateids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Template',
				},
				placeholder: 'Add Template ID',
				default: {},
				description: 'Return only items that belong to the given templates.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the template.',
					},
				],
			},
			{
				displayName: 'Host IDs',
				name: 'hostids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Host',
				},
				placeholder: 'Add Host ID',
				default: {},
				description: 'Return only items that belong to the given hosts.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the host.',
					},
				],
			},
			{
				displayName: 'Proxy IDs',
				name: 'proxyids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Proxy',
				},
				placeholder: 'Add Proxy ID',
				default: {},
				description: 'Return only items that are monitored by the given proxies.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the proxy.',
					},
				],
			},
			{
				displayName: 'Interface IDs',
				name: 'interfaceids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Interface',
				},
				placeholder: 'Add Interface ID',
				default: {},
				description: 'Return only items that use the given host interfaces.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the interface.',
					},
				],
			},
			{
				displayName: 'Graph IDs',
				name: 'graphids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Graph',
				},
				placeholder: 'Add Graph ID',
				default: {},
				description: 'Return only items that are used in the given graphs.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the graph.',
					},
				],
			},
			{
				displayName: 'Trigger IDs',
				name: 'triggerids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Trigger',
				},
				placeholder: 'Add Trigger ID',
				default: {},
				description: 'Return only items that are used in the given triggers.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the trigger.',
					},
				],
			},
			{
				displayName: 'Application IDs',
				name: 'applicationids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Application',
				},
				default: {},
				placeholder: 'Add Application ID',
				description: 'Return only items that belong to the given applications.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the application.',
					},
				],
			},
			{
				displayName: 'Web Items',
				name: 'webitems',
				type: 'boolean',
				default: false,
				description: 'Include web items in the result.',
			},
			{
				displayName: 'Inherited',
				name: 'inherited',
				type: 'boolean',
				default: false,
				description: 'If set to true return only items inherited from a template.',
			},
			{
				displayName: 'Templated',
				name: 'templated',
				type: 'boolean',
				default: false,
				description: 'If set to true return only items that belong to templates.',
			},
			{
				displayName: 'Monitored',
				name: 'monitored',
				type: 'boolean',
				default: false,
				description: 'If set to true return only enabled items that belong to monitored hosts.',
			},
			{
				displayName: 'Group',
				name: 'group',
				type: 'string',
				default: '',
				description: 'Return only items that belong to a group with the given name.',
			},
			{
				displayName: 'Host',
				name: 'host',
				type: 'string',
				default: '',
				description: 'Return only items that belong to a host with the given name.',
			},
			{
				displayName: 'Application',
				name: 'application',
				type: 'string',
				default: '',
				description: 'Return only items that belong to an application with the given name.',
			},
			{
				displayName: 'With Triggers',
				name: 'with_triggers',
				type: 'boolean',
				default: false,
				description: 'If set to true return only items that are used in triggers.',
			},

			...selectHostsQuery,
			...selectInterfacesQuery,
			...selectTriggersQuery,
			...selectGraphsQuery,
			...selectApplicationsQuery,
			...selectDiscoveryRuleQuery,

			 {
				displayName: 'Select Item Discovery',
				name: 'selectItemDiscoveryOptions',
				type: 'options', // type - query
				default: 'extend',
				description: 'Return an itemDiscovery property with the item discovery object.',
				options: [
					{
						name: 'Extend',
						value: 'extend',
						description: 'Returns all object properties',
					},
					{
						name: 'Property Names',
						value: 'propertyNames',
						description: 'Return only specific properties (add parameter Discovery Rule Property Names)',
					},
				],
			},
			{
				displayName: 'Item Discovery Property Names',
				name: 'itemDiscoveryPropertyNames',
				type: 'multiOptions',
				displayOptions: {
					show: {
						selectItemDiscoveryOptions: [
							'propertyNames',
						],
					},
				},
				default: [],
				description: 'Choose which properties to return.',
				options: [
					{
						name: 'Item Discovery ID',
						value: 'itemdiscoveryid',
						description: 'ID of the item discovery',
					},
					{
						name: 'Item ID',
						value: 'itemid',
						description: 'ID of the discovered item',
					},
					{
						name: 'Parent Item ID',
						value: 'parent_itemid',
						description: 'ID of the item prototype from which the item has been created.',
					},
					{
						name: 'Key',
						value: 'key_',
						description: 'Key of the item prototype',
					},
					{
						name: 'Last Check',
						value: 'lastcheck',
						description: 'Time when the item was last discovered. The format is Unix timestamp.',
					},
					{
						name: 'Last Check',
						value: 'ts_delete',
						description: 'Time when an item that is no longer discovered will be deleted. The format is Unix timestamp.',
					},
				],
			},
			{
				displayName: 'Select Preprocessing',
				name: 'selectPreprocessing',
				placeholder: 'Add Application IDs',
				type: 'collection',
				default: {},
				description: 'Return a preprocessing property with item preprocessing options.',
				options: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: 1,
						description: 'The preprocessing option type:.',
						options: [
							{
								name: '1 - Custom multiplier',
								value: 1,
							},
							{
								name: '2 - Right trim',
								value: 2,
							},
							{
								name: '3 - Left trim',
								value: 3,
							},
							{
								name: '4 - Trim',
								value: 4,
							},
							{
								name: '5 - Regular expression matching',
								value: 5,
							},
							{
								name: '6 - Boolean to decimal',
								value: 6,
							},
							{
								name: '7 - Octal to decimal',
								value: 7,
							},
							{
								name: '8 - Hexadecimal to decimal',
								value: 8,
							},
							{
								name: '9 - Simple change',
								value: 9,
							},
							{
								name: '10 - Change per second',
								value: 10,
							},
							{
								name: '11 - XML XPath',
								value: 11,
							},
							{
								name: '12 - JSONPath',
								value: 12,
							},
							{
								name: '13 - In range',
								value: 13,
							},
							{
								name: '14 - Matches regular expression',
								value: 14,
							},
							{
								name: '15 - Does not match regular expression',
								value: 15,
							},
							{
								name: '16 - Check for error in JSON',
								value: 16,
							},
							{
								name: '17 - Check for error in XML',
								value: 17,
							},
							{
								name: '18 - Check for error using regular expression',
								value: 18,
							},
							{
								name: '19 - Discard unchanged',
								value: 19,
							},
							{
								name: '20 - Discard unchanged with heartbeat',
								value: 20,
							},
							{
								name: '21 - JavaScript',
								value: 21,
							},
							{
								name: '22 - Prometheus pattern',
								value: 22,
							},
							{
								name: '23 - Prometheus to JSON',
								value: 23,
							},
							{
								name: '24 - CSV to JSON',
								value: 24,
							},
							{
								name: '25 - Replace',
								value: 25,
							},
						],
					},
					{
						displayName: 'Params',
						name: 'params',
						type: 'string',
						default: '',
						description: 'Additional parameters used by preprocessing option. Multiple parameters are separated by LF (\\n)character.',
					},
					{
						displayName: 'Error Handler',
						name: 'error_handler',
						type: 'options',
						default: 0,
						description: 'Action type used in case of preprocessing step failure.',
						options: [
							{
								name: '0 - Error message is set by Zabbix server',
								value: 0,
							},
							{
								name: '1 - Discard value',
								value: 1,
							},
							{
								name: '2 - Set custom value',
								value: 2,
							},
							{
								name: '3 - Set custom error message',
								value: 3,
							},
						],
					},
					{
						displayName: 'Error Handler Params',
						name: 'error_handler_params',
						type: 'string',
						default: '',
						description: 'Error handler parameters.',
					},
				],
			},

			...limitSelects,

			...getCommonGetParameters('item'),
			...preserveKeys,
		],
	},

	/*-------------------------------------------------------------------------- */
	/*                                item:update	                             */
	/* ------------------------------------------------------------------------- */
	// {
	// 	displayName: 'Parameters JSON',
	// 	name: 'ParametersJson',
	// 	type: 'json',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'custom',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 			jsonParameters: [
	// 				true,
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	description: 'Parameters as JSON (flat object).',
	// },
	// {
	// 	displayName: 'Parameters',
	// 	name: 'parametersUi',
	// 	placeholder: 'Add Parameter',
	// 	type: 'fixedCollection',
	// 	typeOptions: {
	// 		multipleValues: true,
	// 	},
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'custom',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 			jsonParameters: [
	// 				false,
	// 			],
	// 		},
	// 	},
	// 	description: 'The query parameter to send.',
	// 	default: {},
	// 	options: [
	// 		{
	// 			name: 'parameter',
	// 			displayName: 'Parameter',
	// 			values: [
	// 				{
	// 					displayName: 'Name',
	// 					name: 'name',
	// 					type: 'string',
	// 					default: '',
	// 					description: 'Name of the parameter.',
	// 				},
	// 				{
	// 					displayName: 'Value',
	// 					name: 'value',
	// 					type: 'string',
	// 					default: '',
	// 					description: 'Value of the parameter.',
	// 				},
	// 			],
	// 		},
	// 	],
	// },
	//
	//
	//
	//
	// {
	// 	displayName: 'Additional Fields',
	// 	name: 'additionalFields',
	// 	type: 'collection',
	// 	placeholder: 'Add Field',
	// 	default: {},
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'contact',
	// 			],
	// 			operation: [
	// 				'create',
	// 			],
	// 		},
	// 	},
	// 	options: [
	// 		{
	// 			displayName: 'First Name',
	// 			name: 'firstName',
	// 			type: 'string',
	// 			default: '',
	// 			description: '',
	// 		},
	// 		{
	// 			displayName: 'Last Name',
	// 			name: 'lastName',
	// 			type: 'string',
	// 			default: '',
	// 		},
	// 	],
	// },

] as INodeProperties[];