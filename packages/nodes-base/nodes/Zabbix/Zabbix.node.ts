import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	eventFields,
	eventOperations,
	historyFields,
	historyOperations,
	hostFields,
	hostOperations,
	itemFields,
	itemOperations,
	problemFields,
	problemOperations
} from './descriptions';

import {
	convertBooleanToFlag,
	convertBooleanToNumber,
	parseArrayToObject,
	simplify,
	validateJSON,
	zabbixApiRequest,
} from './GenericFunctions';

export class Zabbix implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zabbix',
		name: 'zabbix',
		icon: 'file:zabbix.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Zabbix API',
		defaults: {
				name: 'Zabbix',
				color: '#d40000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zabbixApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'credentials',
						],
					},
				},
			},
			{
				name: 'zabbixTokenApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'apiToken',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Credentials',
						value: 'credentials',
					},
					{
						name: 'API Token',
						value: 'apiToken',
					},
				],
				default: 'credentials',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'History',
						value: 'history',
					},
					{
						name: 'Host',
						value: 'host',
					},
					{
						name: 'Item',
						value: 'item',
					},
					{
						name: 'Problem',
						value: 'problem',
					},
				],
				default: 'host',
				required: true,
				description: 'Resource to consume',
			},
			...eventOperations,
			...eventFields,
			...historyOperations,
			...historyFields,
			...hostOperations,
			...hostFields,
			...itemOperations,
			...itemFields,
			...problemOperations,
			...problemFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'event') {
					if (operation === 'get') {

						// ----------------------------------------
						//             event: get
						// ----------------------------------------

						// https://www.zabbix.com/documentation/5.0/en/manual/api/reference/event/get

						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

						let params: IDataObject;
						if(jsonParameters) {
							const parametersJson = this.getNodeParameter('parametersJson', i);
							
							if (parametersJson instanceof Object) {
								// if it is an object
								params = parametersJson as IDataObject;
							} else {
								// if it is a string
								if (validateJSON(parametersJson as string) !== undefined) {
									params = JSON.parse(parametersJson as string) as IDataObject;
								} else {
									throw new NodeOperationError(this.getNode(), 'Parameters JSON must be a valid json');
								}
							}
							
						} else {
							params = this.getNodeParameter('parametersUi', i) as IDataObject;

							if(params.eventids) {
								// type - string/array
								params.eventids = (params.eventids as IDataObject[]).map(a => a.id);
							}
							if(params.graphids) {
								// type - string/array
								params.graphids = (params.graphids as IDataObject[]).map(a => a.id);
							}
							if(params.hostids) {
								// type - string/array
								params.hostids = (params.hostids as IDataObject[]).map(a => a.id);
							}
							if(params.objectids) {
								// type - string/array
								params.objectids = (params.objectids as IDataObject[]).map(a => a.id);
							}
							if(params.severities) {
								// type - integer/array
								params.severities = (params.severities as IDataObject[]).map(a => a.severityNumber);
							}
							if(params.tags) {
								// type - string/array
								params.tags = (params.tags as IDataObject).tags;
							}
							if(params.value) {
								// type - integer/array
								params.value = (params.value as IDataObject).value;
							}

							if(params.selectHostsOptions) {
								// type - query
								if(params.selectHostsOptions === 'propertyNames') {
									params.selectHosts = params.hostPropertyNames;
									delete params.hostPropertyNames;
								} else {
									params.selectHosts = params.selectHostsOptions;
								}
								delete params.selectHostsOptions;
							}

							// Adjusting common properties
							if(params.filter) {
								params.filter = parseArrayToObject((params.filter as IDataObject).filter as Array<{key:string,values:IDataObject[]}>);
							}
							if(params.outputOptions) {
								if(params.outputOptions === 'propertyNames') {
									params.output = (params.outputPropertyNames as IDataObject[]).map(a => a.value);
									delete params.outputPropertyNames;
								} else {
									params.output = params.outputOptions;
								}
								delete params.outputOptions;
							}
							if(params.search) {
								params.search = parseArrayToObject((params.search as IDataObject).search as Array<{key:string,values:IDataObject[]}>);
							}
							if(params.sortorder) {
								params.sortorder = (params.sortorder as IDataObject[]).map(a => a.sortorder);
							}
						}

						responseData = await zabbixApiRequest.call(
							this,
							'event.get',
							params,
						);
						if(responseData.error) {
							throw new NodeOperationError(this.getNode(), responseData.error);
						}
						responseData = simplify(responseData);
					}

				} else if (resource === 'history') {
					if (operation === 'get') {

						// ----------------------------------------
						//             history: get
						// ----------------------------------------

						// https://www.zabbix.com/documentation/5.0/en/manual/api/reference/history/get

						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

						let params: IDataObject;
						if(jsonParameters) {
							const parametersJson = this.getNodeParameter('parametersJson', i);

							if (parametersJson instanceof Object) {
								// if it is an object
								params = parametersJson as IDataObject;
							} else {
								// if it is a string
								if (validateJSON(parametersJson as string) !== undefined) {
									params = JSON.parse(parametersJson as string) as IDataObject;
								} else {
									throw new NodeOperationError(this.getNode(), 'Parameters JSON must be a valid json');
								}
							}

						} else {
							params = this.getNodeParameter('parametersUi', i) as IDataObject;

							if(params.hostids) {
								params.hostids = (params.hostids as IDataObject[]).map(a => a.id);
							}
							if(params.itemids) {
								params.itemids = (params.itemids as IDataObject[]).map(a => a.id);
							}

							// Adjusting common properties
							if(params.filter) {
								params.filter = parseArrayToObject((params.filter as IDataObject).filter as Array<{key:string,values:IDataObject[]}>);
							}
							if(params.outputOptions) {
								if(params.outputOptions === 'propertyNames') {
									params.output = (params.outputPropertyNames as IDataObject[]).map(a => a.value);
									delete params.outputPropertyNames;
								} else {
									params.output = params.outputOptions;
								}
								delete params.outputOptions;
							}
							if(params.search) {
								params.search = parseArrayToObject((params.search as IDataObject).search as Array<{key:string,values:IDataObject[]}>);

							}
							if(params.sortorder) {
								params.sortorder = (params.sortorder as IDataObject[]).map(a => a.sortorder);
							}
						}

						responseData = await zabbixApiRequest.call(
							this,
							'history.get',
							params,
						);
						if(responseData.error) {
							throw new NodeOperationError(this.getNode(), responseData.error);
						}
						responseData = simplify(responseData);
					}

				} else if (resource === 'host') {
					if (operation === 'get') {

						// ----------------------------------------
						//             host: get
						// ----------------------------------------

						// https://www.zabbix.com/documentation/5.0/en/manual/api/reference/host/get

						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

						let params: IDataObject;
						if(jsonParameters) {
							const parametersJson = this.getNodeParameter('parametersJson', i);

							if (parametersJson instanceof Object) {
								// if it is an object
								params = parametersJson as IDataObject;
							} else {
								// if it is a string
								if (validateJSON(parametersJson as string) !== undefined) {
									params = JSON.parse(parametersJson as string) as IDataObject;
								} else {
									throw new NodeOperationError(this.getNode(), 'Parameters JSON must be a valid json');
								}
							}

						} else {
							params = this.getNodeParameter('parametersUi', i) as IDataObject;

							// Adjust properties
							if(params.groupids) {
								params.groupids = (params.groupids as IDataObject[]).map(a => a.id);
							}
							if(params.applicationids) {
								params.applicationids = (params.applicationids as IDataObject[]).map(a => a.id);
							}
							if(params.dserviceids) {
								params.dserviceids = (params.dserviceids as IDataObject[]).map(a => a.id);
							}
							if(params.graphids) {
								params.graphids = (params.graphids as IDataObject[]).map(a => a.id);
							}
							if(params.hostids) {
								params.hostids = (params.hostids as IDataObject[]).map(a => a.id);
							}
							if(params.httptestids) {
								params.httptestids = (params.httptestids as IDataObject[]).map(a => a.id);
							}
							if(params.interfaceids) {
								params.interfaceids = (params.interfaceids as IDataObject[]).map(a => a.id);
							}
							if(params.itemids) {
								params.itemids = (params.itemids as IDataObject[]).map(a => a.id);
							}
							if(params.maintenanceids) {
								params.maintenanceids = (params.maintenanceids as IDataObject[]).map(a => a.id);
							}
							if(params.monitored_hosts !== undefined) {
								params.monitored_hosts = convertBooleanToFlag(params.monitored_hosts as boolean);
							}
							if(params.proxy_hosts !== undefined) {
								params.proxy_hosts = convertBooleanToFlag(params.proxy_hosts as boolean);
							}
							if(params.proxyids) {
								params.proxyids = (params.proxyids as IDataObject[]).map(a => a.id);
							}
							if(params.proxyids !== undefined) {
								params.proxyids = convertBooleanToFlag(params.proxyids as boolean);
							}
							if(params.templateids) {
								params.templateids = (params.templateids as IDataObject[]).map(a => a.id);
							}
							if(params.triggerids) {
								params.triggerids = (params.triggerids as IDataObject[]).map(a => a.id);
							}
							if(params.with_items !== undefined) {
								params.with_items = convertBooleanToFlag(params.with_items as boolean);
							}
							if(params.with_item_prototypes !== undefined) {
								params.with_item_prototypes = convertBooleanToFlag(params.with_item_prototypes as boolean);
							}
							if(params.with_simple_graph_item_prototypes !== undefined) {
								params.with_simple_graph_item_prototypes = convertBooleanToFlag(params.with_simple_graph_item_prototypes as boolean);
							}
							if(params.with_applications !== undefined) {
								params.with_applications = convertBooleanToFlag(params.with_applications as boolean);
							}
							if(params.with_graphs !== undefined) {
								params.with_graphs = convertBooleanToFlag(params.with_graphs as boolean);
							}
							if(params.with_graph_prototypes !== undefined) {
								params.with_graph_prototypes = convertBooleanToFlag(params.with_graph_prototypes as boolean);
							}
							if(params.with_httptests !== undefined) {
								params.with_httptests = convertBooleanToFlag(params.with_httptests as boolean);
							}
							if(params.with_monitored_httptests !== undefined) {
								params.with_monitored_httptests = convertBooleanToFlag(params.with_monitored_httptests as boolean);
							}
							if(params.with_monitored_items !== undefined) {
								params.with_monitored_items = convertBooleanToFlag(params.with_monitored_items as boolean);
							}
							if(params.with_monitored_triggers !== undefined) {
								params.with_monitored_triggers = convertBooleanToFlag(params.with_monitored_triggers as boolean);
							}
							if(params.with_simple_graph_items !== undefined) {
								params.with_simple_graph_items = convertBooleanToFlag(params.with_simple_graph_items as boolean);
							}
							if(params.with_triggers !== undefined) {
								params.with_triggers = convertBooleanToFlag(params.with_triggers as boolean);
							}
							if(params.withProblemsSuppressed === '') {
								params.withProblemsSuppressed = null;
							}
							if(params.severities) {
								params.severities = (params.severities as IDataObject[]).map(a => a.severityNumber);
							}
							if(params.tags) {
								params.tags = (params.tags as IDataObject).tags;
							}
							if(params.selectApplicationsOptions) {
								if(params.selectApplicationsOptions === 'propertyNames') {
									params.selectApplications = params.applicationPropertyNames;
									delete params.applicationPropertyNames;
								} else {
									params.selectApplications = params.selectApplicationsOptions;
								}
								delete params.selectApplicationsOptions;
							}
							if(params.selectDiscoveriesOptions) {
								if(params.selectDiscoveriesOptions === 'propertyNames') {
									params.selectDiscoveries = params.discoveryPropertyNames;
									delete params.discoveryPropertyNames;
								} else {
									params.selectDiscoveries = params.selectDiscoveriesOptions;
								}
								delete params.selectDiscoveriesOptions;
							}
							if(params.selectDiscoveryRuleOptions) {
								if(params.selectDiscoveryRuleOptions === 'propertyNames') {
									params.selectDiscoveryRule = params.discoveryRulePropertyNames;
									delete params.discoveryRulePropertyNames;
								} else {
									params.selectDiscoveryRule = params.selectDiscoveryRuleOptions;
								}
								delete params.selectDiscoveryRuleOptions;
							}
							if(params.selectGraphsOptions) {
								if(params.selectGraphsOptions === 'propertyNames') {
									params.selectGraphs = params.graphPropertyNames;
									delete params.graphPropertyNames;
								} else {
									params.selectGraphs = params.selectGraphsOptions;
								}
								delete params.selectGraphsOptions;
							}
							if(params.selectGroupsOptions) {
								if(params.selectGroupsOptions === 'propertyNames') {
									params.selectGroups = params.groupPropertyNames;
									delete params.groupPropertyNames;
								} else {
									params.selectGroups = params.selectGroupsOptions;
								}
								delete params.selectGroupsOptions;
							}
							if(params.selectHostDiscoveryOptions) {
								if(params.DiscoveryOptions === 'propertyNames') {
									params.selectHostDiscovery = params.hostDiscoveryPropertyNames;
									delete params.hostDiscoveryPropertyNames;
								} else {
									params.selectHostDiscovery = params.selectHostDiscoveryOptions;
								}
								delete params.selectHostDiscoveryOptions;
							}
							if(params.selectHttpTestsOptions) {
								if(params.selectHttpTestsOptions === 'propertyNames') {
									params.selectHttpTests = params.httpTestsPropertyNames;
									delete params.httpTestsPropertyNames;
								} else {
									params.selectHttpTests = params.selectHttpTestsOptions;
								}
								delete params.selectHttpTestsOptions;
							}
							if(params.selectInterfacesOptions) {
								if(params.selectInterfacesOptions === 'propertyNames') {
									params.selectInterfaces = params.interfacePropertyNames;
									delete params.httpTestsPropertyNames;
								} else {
									params.selectInterfaces = params.interfacePropertyNames;
								}
								delete params.selectInterfacesOptions;
							}
							if(params.selectInventoryOptions) {
								if(params.selectInventoryOptions === 'propertyNames') {
									params.selectInventory = params.inventoryPropertyNames;
									delete params.inventoryPropertyNames;
								} else {
									params.selectInventory = params.selectInventoryOptions;
								}
								delete params.selectInventoryOptions;
							}
							if(params.selectItemsOptions) {
								if(params.selectItemsOptions === 'propertyNames') {
									params.selectItems = params.itemsPropertyNames;
									delete params.itemsPropertyNames;
								} else {
									params.selectItems = params.selectItemsOptions;
								}
								delete params.selectItemsOptions;
							}
							if(params.selectMacrosOptions) {
								if(params.selectMacrosOptions === 'propertyNames') {
									params.selectMacros = params.macroPropertyNames;
									delete params.macroPropertyNames;
								} else {
									params.selectMacros = params.selectMacrosOptions;
								}
								delete params.selectMacrosOptions;
							}
							if(params.selectParentTemplatesOptions) {
								if(params.selectParentTemplatesOptions === 'propertyNames') {
									params.selectParentTemplates = params.parentTemplatePropertyNames;
									delete params.parentTemplatePropertyNames;
								} else {
									params.selectParentTemplates = params.selectParentTemplatesOptions;
								}
								delete params.selectParentTemplatesOptions;
							}
							if(params.selectScreensOptions) {
								if(params.selectScreensOptions === 'propertyNames') {
									params.selectScreens = params.screenPropertyNames;
									delete params.screenPropertyNames;
								} else {
									params.selectScreens = params.selectScreensOptions;
								}
								delete params.selectScreensOptions;
							}
							if(params.selectTriggersOptions) {
								if(params.selectTriggersOptions === 'propertyNames') {
									params.selectTriggers = params.triggerPropertyNames;
									delete params.triggerPropertyNames;
								} else {
									params.selectTriggers = params.selectTriggersOptions;
								}
								delete params.selectTriggersOptions;
							}
							if(params.searchInventory) {
								params.searchInventory = parseArrayToObject((params.searchInventory as IDataObject).searchInventory as Array<{key:string,values:IDataObject[]}>);
							}

							// Adjusting common properties
							if(params.filter) {
								params.filter = parseArrayToObject((params.filter as IDataObject).filter as Array<{key:string,values:IDataObject[]}>);
							}
							if(params.outputOptions) {
								if(params.outputOptions === 'propertyNames') {
									params.output = (params.outputPropertyNames as IDataObject[]).map(a => a.value);
									delete params.outputPropertyNames;
								} else {
									params.output = params.outputOptions;
								}
								delete params.outputOptions;
							}
							if(params.search) {
								params.search = parseArrayToObject((params.search as IDataObject).search as Array<{key:string,values:IDataObject[]}>);

							}
							if(params.sortorder) {
								params.sortorder = (params.sortorder as IDataObject[]).map(a => a.sortorder);
							}
						}

						responseData = await zabbixApiRequest.call(
							this,
							'host.get',
							params,
						);
						if(responseData.error) {
							throw new NodeOperationError(this.getNode(), responseData.error);
						}
						responseData = simplify(responseData);
					}

				} else if (resource === 'item') {
					// if (operation === 'create') {
					//
					// 	// ----------------------------------------
					// 	//             item: create
					// 	// ----------------------------------------
					//
					// 	const delay = this.getNodeParameter('delay', i) as string;
					// 	const hostid = this.getNodeParameter('hostid', i) as string;
					// 	const interfaceid = this.getNodeParameter('interfaceid', i) as string;
					// 	const key_ = this.getNodeParameter('key_', i) as string;
					// 	const name = this.getNodeParameter('name', i) as string;
					// 	const type = this.getNodeParameter('type', i) as string;
					// 	const url = this.getNodeParameter('url', i) as string;
					// 	const value_type = this.getNodeParameter('value_type', i) as string;
					//
					// } else if (operation === 'delete'){
					//
					// 	// ----------------------------------------
					// 	//             item: delete
					// 	// ----------------------------------------
					//
					// } else
					if (operation === 'get'){

						// ----------------------------------------
						//             item: get
						// ----------------------------------------

						// https://www.zabbix.com/documentation/5.0/en/manual/api/reference/item/get

						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

						let params: IDataObject;
						if(jsonParameters) {
							const parametersJson = this.getNodeParameter('parametersJson', i);

							if (parametersJson instanceof Object) {
								// if it is an object
								params = parametersJson as IDataObject;
							} else {
								// if it is a string
								if (validateJSON(parametersJson as string) !== undefined) {
									params = JSON.parse(parametersJson as string) as IDataObject;
								} else {
									throw new NodeOperationError(this.getNode(), 'Parameters JSON must be a valid json');
								}
							}

						} else {
							params = this.getNodeParameter('parametersUi', i) as IDataObject;

							if(params.follow_redirects) {
								// type - integer
								params.follow_redirects = convertBooleanToNumber(params.follow_redirects as boolean);
							}
							if(params.headers) {
								// type - object
								params.headers = (params.headers as IDataObject).header;
							}
							if(params.output_format) {
								// type - integer
								params.output_format = convertBooleanToNumber(params.output_format as boolean);
							}
							if(params.itemids) {
								// type - array/string
								params.itemids = (params.itemids as IDataObject[]).map(a => a.id);
							}
							if(params.groupids) {
								// type - array/string
								params.groupids = (params.groupids as IDataObject[]).map(a => a.id);
							}
							if(params.templateids) {
								// type - array/string
								params.templateids = (params.templateids as IDataObject[]).map(a => a.id);
							}
							if(params.hostids) {
								// type - array/string
								params.hostids = (params.hostids as IDataObject[]).map(a => a.id);
							}
							if(params.proxyids) {
								// type - array/string
								params.proxyids = (params.proxyids as IDataObject[]).map(a => a.id);
							}
							if(params.interfaceids) {
								// type - array/string
								params.interfaceids = (params.interfaceids as IDataObject[]).map(a => a.id);
							}
							if(params.graphids) {
								// type - array/string
								params.graphids = (params.graphids as IDataObject[]).map(a => a.id);
							}
							if(params.triggerids) {
								// type - array/string
								params.triggerids = (params.triggerids as IDataObject[]).map(a => a.id);
							}
							if(params.applicationids) {
								// type - array/string
								params.applicationids = (params.applicationids as IDataObject[]).map(a => a.id);
							}
							if(params.webitems !== undefined) {
								// type - flag
								params.webitems = convertBooleanToFlag(params.webitems as boolean);
							}
							if(params.selectHostsOptions) {
								// type - query
								if(params.selectHostsOptions === 'propertyNames') {
									params.selectHosts = params.hostPropertyNames;
									delete params.hostPropertyNames;
								} else {
									params.selectHosts = params.selectHostsOptions;
								}
								delete params.selectHostsOptions;
							}
							if(params.selectInterfacesOptions) {
								// type - query
								if(params.selectInterfacesOptions === 'propertyNames') {
									params.selectInterfaces = params.interfacePropertyNames;
									delete params.httpTestsPropertyNames;
								} else {
									params.selectInterfaces = params.interfacePropertyNames;
								}
								delete params.selectInterfacesOptions;
							}
							if(params.selectTriggersOptions) {
								// type - query
								if(params.selectTriggersOptions === 'propertyNames') {
									params.selectTriggers = params.triggerPropertyNames;
									delete params.triggerPropertyNames;
								} else {
									params.selectTriggers = params.selectTriggersOptions;
								}
								delete params.selectTriggersOptions;
							}
							if(params.selectGraphsOptions) {
								// type - query
								if(params.selectGraphsOptions === 'propertyNames') {
									params.selectGraphs = params.graphPropertyNames;
									delete params.graphPropertyNames;
								} else {
									params.selectGraphs = params.selectGraphsOptions;
								}
								delete params.selectGraphsOptions;
							}
							if(params.selectApplicationsOptions) {
								// type - query
								if(params.selectApplicationsOptions === 'propertyNames') {
									params.selectApplications = params.applicationPropertyNames;
									delete params.applicationPropertyNames;
								} else {
									params.selectApplications = params.selectApplicationsOptions;
								}
								delete params.selectApplicationsOptions;
							}
							if(params.selectDiscoveryRuleOptions) {
								// type - query
								if(params.selectDiscoveryRuleOptions === 'propertyNames') {
									params.selectDiscoveryRule = params.discoveryRulePropertyNames;
									delete params.discoveryRulePropertyNames;
								} else {
									params.selectDiscoveryRule = params.selectDiscoveryRuleOptions;
								}
								delete params.selectDiscoveryRuleOptions;
							}
							if(params.selectItemDiscoveryOptions) {
								// type - query
								if(params.selectItemDiscoveryOptions === 'propertyNames') {
									params.selectItemDiscovery = params.itemDiscoveryPropertyNames;
									delete params.itemDiscoveryPropertyNames;
								} else {
									params.selectItemDiscovery = params.selectItemDiscoveryOptions;
								}
								delete params.selectItemDiscoveryOptions;
							}

							// Adjusting common properties
							if(params.filter) {
								// type - object
								params.filter = parseArrayToObject((params.filter as IDataObject).filter as Array<{key:string,values:IDataObject[]}>);
							}
							if(params.outputOptions) {
								// type - query
								if(params.outputOptions === 'propertyNames') {
									params.output = (params.outputPropertyNames as IDataObject[]).map(a => a.value);
									delete params.outputPropertyNames;
								} else {
									params.output = params.outputOptions;
								}
								delete params.outputOptions;
							}
							if(params.search) {
								// type - object
								params.search = parseArrayToObject((params.search as IDataObject).search as Array<{key:string,values:IDataObject[]}>);

							}
							if(params.sortorder) {
								// type - string/array
								params.sortorder = (params.sortorder as IDataObject[]).map(a => a.sortorder);
							}
						}

						responseData = await zabbixApiRequest.call(
							this,
							'item.get',
							params,
						);
						if(responseData.error) {
							throw new NodeOperationError(this.getNode(), responseData.error);
						}
						responseData = simplify(responseData);
					}
					// else if (operation === 'update'){
					//
					// 	// ----------------------------------------
					// 	//             item: update
					// 	// ----------------------------------------
					//
					// }

				} else if (resource === 'problem') {
					if (operation === 'get') {

						// ----------------------------------------
						//             problem: get
						// ----------------------------------------

						// https://www.zabbix.com/documentation/5.0/en/manual/api/reference/problem/get

						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

						let params: IDataObject;
						if(jsonParameters) {
							const parametersJson = this.getNodeParameter('parametersJson', i);

							if (parametersJson instanceof Object) {
								// if it is an object
								params = parametersJson as IDataObject;
							} else {
								// if it is a string
								if (validateJSON(parametersJson as string) !== undefined) {
									params = JSON.parse(parametersJson as string) as IDataObject;
								} else {
									throw new NodeOperationError(this.getNode(), 'Parameters JSON must be a valid json');
								}
							}

						} else {
							params = this.getNodeParameter('parametersUi', i) as IDataObject;

							if(params.eventids) {
								// type - string/array
								params.eventids = (params.eventids as IDataObject[]).map(a => a.id);
							}
							if(params.groupids) {
								// type - string/array
								params.groupids = (params.groupids as IDataObject[]).map(a => a.id);
							}
							if(params.hostids) {
								// type - string/array
								params.hostids = (params.hostids as IDataObject[]).map(a => a.id);
							}
							if(params.objectids) {
								// type - string/array
								params.objectids = (params.objectids as IDataObject[]).map(a => a.id);
							}
							if(params.applicationids) {
								// type - string/array
								params.applicationids = (params.applicationids as IDataObject[]).map(a => a.id);
							}
							if(params.severities) {
								// type - integer/array
								params.severities = (params.severities as IDataObject[]).map(a => a.severityNumber);
							}
							if(params.tags) {
								// type - string/array
								params.tags = (params.tags as IDataObject).tags;
							}

							// Adjusting common properties
							if(params.filter) {
								params.filter = parseArrayToObject((params.filter as IDataObject).filter as Array<{key:string,values:IDataObject[]}>);
							}
							if(params.outputOptions) {
								if(params.outputOptions === 'propertyNames') {
									params.output = (params.outputPropertyNames as IDataObject[]).map(a => a.value);
									delete params.outputPropertyNames;
								} else {
									params.output = params.outputOptions;
								}
								delete params.outputOptions;
							}
							if(params.search) {
								params.search = parseArrayToObject((params.search as IDataObject).search as Array<{key:string,values:IDataObject[]}>);

							}
							if(params.sortorder) {
								params.sortorder = (params.sortorder as IDataObject[]).map(a => a.sortorder);
							}
						}

						responseData = await zabbixApiRequest.call(
							this,
							'problem.get',
							params,
						);
						if(responseData.error) {
							throw new NodeOperationError(this.getNode(), responseData.error);
						}
						responseData = simplify(responseData);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}