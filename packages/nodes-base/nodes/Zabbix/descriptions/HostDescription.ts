import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getCommonGetParameters,
	limitSelects,
	preserveKeys,
	searchInventory,
	selectApplicationsQuery,
	selectDiscoveriesQuery,
	selectDiscoveryRuleQuery,
	selectGraphsQuery,
	selectGroupsQuery,
	selectHostDiscoveryQuery,
	selectHttpTestsQuery,
	selectInterfacesQuery,
	selectInventoryQuery,
	selectItemsQuery,
	selectMacrosQuery,
	selectParentTemplatesQuery,
	selectScreensQuery, selectTagsQuery,
	selectTriggersQuery,
} from './shared';

export const hostOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'host',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve host data according to the given parameters',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const hostFields = [

	/*-------------------------------------------------------------------------- */
	/*                                host:get                             	 	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'host',
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
		displayName: 'See <a href="https://www.zabbix.com/documentation/5.0/en/manual/api/reference/host/get" target="_blank">Zabbix documentation</a> on history.get properties',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'host',
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
					'host',
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
		placeholder: 'Add Parameter',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'host',
				],
				operation: [
					'get',
				],
				jsonParameters: [
					false,
				],
			},
		},
		description: 'The query parameter to send.',
		default: {},
		options: [
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
				description: 'Return only hosts that belong to the given groups.',
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
				displayName: 'Application IDs',
				name: 'applicationids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Application',
				},
				placeholder: 'Add Application ID',
				default: {},
				description: 'Return only hosts that have the given applications.',
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
				displayName: 'Discovered Service IDs',
				name: 'dserviceids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Discovered Service',
				},
				placeholder: 'Add Discovered Service ID',
				default: {},
				description: 'Return only hosts that are related to the given discovered services.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the discovered service.',
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
				description: 'Return only hosts that have the given graphs.',
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
				displayName: 'Host IDs',
				name: 'hostids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Host',
				},
				placeholder: 'Add Host ID',
				default: {},
				description: 'Return only hosts with the given host IDs.',
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
				displayName: 'HTTP Test IDs',
				name: 'httptestids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add HTTP Test',
				},
				placeholder: 'Add HTTP Test ID',
				default: {},
				description: 'Return only hosts that have the given web checks.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the HTTP test.',
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
				description: 'Return only hosts that use the given interfaces.',
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
				displayName: 'Item IDs',
				name: 'itemids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Item',
				},
				placeholder: 'Add Item ID',
				default: {},
				description: 'Return only hosts that have the given items.',
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
				displayName: 'Maintenance IDs',
				name: 'maintenanceids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Maintenance',
				},
				placeholder: 'Add Maintenance ID',
				default: {},
				description: 'Return only hosts that are affected by the given maintenances.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the maintenance.',
					},
				],
			},
			{
				displayName: 'Monitored Hosts',
				name: 'monitored_hosts',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only monitored hosts.',
			},
			{
				displayName: 'Proxy Hosts',
				name: 'proxy_hosts',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only proxies.',
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
				description: 'Return only hosts that are monitored by the given proxies.',
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
				displayName: 'Templated Hosts',
				name: 'proxyids',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return both hosts and templates.',
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
				description: 'Return only hosts that are linked to the given templates.',
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
				displayName: 'Trigger IDs',
				name: 'triggerids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Trigger',
				},
				placeholder: 'Add Trigger ID',
				default: {},
				description: 'Return only hosts that have the given triggers.',
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
				displayName: 'With Items',
				name: 'with_items',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return both hosts and templates.',
			},
			{
				displayName: 'With Item Prototypes',
				name: 'with_item_prototypes',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only hosts that have item prototypes. Overrides the with_simple_graph_item_prototypes parameter.',
			},
			{
				displayName: 'With Simple Graph Item Prototypes',
				name: 'with_simple_graph_item_prototypes',
				type: 'boolean', //type - flag
				default: false,
				description: 'Return only hosts that have item prototypes, which are enabled for creation and have numeric type of information.',
			},
			{
				displayName: 'With Applications',
				name: 'with_applications',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only hosts that have applications.',
			},
			{
				displayName: 'With Graphs',
				name: 'with_graphs',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only hosts that have graphs.',
			},
			{
				displayName: 'With Graph Prototypes',
				name: 'with_graph_prototypes',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only hosts that have graph prototypes.',
			},
			{
				displayName: 'With Http Tests',
				name: 'with_httptests',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only hosts that have web checks. Overrides the with_monitored_httptests parameter.',
			},
			{
				displayName: 'With Monitored Http Tests',
				name: 'with_monitored_httptests',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only hosts that have enabled web checks.',
			},
			{
				displayName: 'With Monitored Items',
				name: 'with_monitored_items',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only hosts that have enabled items. Overrides the with_simple_graph_items parameter.',
			},
			{
				displayName: 'With Monitored Triggers',
				name: 'with_monitored_triggers', // type - flag
				type: 'boolean',
				default: false,
				description: 'Return only hosts that have enabled triggers. All of the items used in the trigger must also be enabled.',
			},
			{
				displayName: 'With Simple Graph Items',
				name: 'with_simple_graph_items',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only hosts that have items with numeric type of information.',
			},
			{
				displayName: 'With Triggers',
				name: 'with_triggers',
				type: 'boolean', // type - flag
				default: false,
				description: 'Return only hosts that have triggers. Overrides the with_monitored_triggers parameter.',
			},
			{
				displayName: 'With Problems Suppressed',
				name: 'withProblemsSuppressed',
				type: 'options',
				typeOptions: {},
				default: '',
				description: 'Return hosts that have suppressed problems.',
				options: [
					{
						name: 'null - (default) all hosts',
						value: '',
					},
					{
						name: 'true - only hosts with suppressed problems',
						value: true,
					},
					{
						name: 'false - only hosts with unsuppressed problems',
						value: false,
					},
				],
			},
			{
				displayName: 'Eval Type',
				name: 'evaltype',
				type: 'options',
				default: 0,
				description: 'Rules for tag searching.',
				options: [
					{
						name: '0 - (default) And/Or',
						value: 0,
					},
					{
						name: '2 - Or',
						value: 2,
					},
				],
			},
			{
				displayName: 'Severities',
				name: 'severities',
				type: 'collection', // type - integer/array
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Severity',
				},
				placeholder: 'Add Severity Number',
				default: {},
				description: 'Return only problems with given event severities. Applies only if object is trigger.',
				options: [
					{
						displayName: 'Severity Number',
						name: 'severityNumber',
						type: 'number',
						default: 0,
						description: 'Number of the severity.',
					},
				],
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Tag',
				default: {tags: []},
				description: 'Return only hosts with given tags. Exact match by tag and case-sensitive or case-insensitive search by tag value depending on operator value. An empty array returns all hosts.',
				options: [
					{
						displayName: 'Tags',
						name: 'tags',
						values: [
							{
								displayName: 'Tag',
								name: 'tag',
								type: 'string',
								default: '',
								description: 'Tag name.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Search value.',
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								default: 0,
								description: 'Search operator.',
								options: [
									{
										name: '0 - (default) Contains',
										value: 0,
									},
									{
										name: '1 - Equal',
										value: 1,
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Inherited Tags',
				name: 'inheritedTags',
				type: 'boolean',
				default: false,
				description: 'Return hosts that have given tags also in all of their linked templates. Possible values: true - linked templates must also have given tags; false - (default) linked template tags are ignored.',
			},

			...selectApplicationsQuery,
			...selectDiscoveriesQuery,
			...selectDiscoveryRuleQuery,
			...selectGraphsQuery,
			...selectGroupsQuery,
			...selectHostDiscoveryQuery,
			...selectHttpTestsQuery,
			...selectInterfacesQuery,
			...selectInventoryQuery,
			...selectItemsQuery,
			...selectMacrosQuery,
			...selectParentTemplatesQuery,
			...selectScreensQuery,
			...selectTagsQuery,

			{
				displayName: 'Select Inherited Tags',
				name: 'selectInheritedTags',
				type: 'options', // type - query
				default: 'extend',
				description: 'Return an inheritedTags property.',
				options: [
					{
						name: 'Extend',
						value: 'extend',
						description: 'Returns all object properties',
					},
				],
			},

			...selectTriggersQuery,
			...limitSelects,
			...searchInventory,

			...getCommonGetParameters('host'),
			...preserveKeys,
		],
	},

] as INodeProperties[];
