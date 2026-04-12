import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	NodeOperationError,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

export class Hypris implements INodeType {
	methods = {
		loadOptions: {
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				try {
					const response = await this.helpers.requestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: 'https://api.hypris.com/v1/me/workspaces',
						json: true,
					});
					let workspaces = [];
					if (Array.isArray(response)) workspaces = response;
					else if (response && Array.isArray(response.data)) workspaces = response.data;
					else if (response && response.data && Array.isArray(response.data.workspaces))
						workspaces = response.data.workspaces;
					else if (response && Array.isArray(response.workspaces)) workspaces = response.workspaces;
					else
						throw new NodeOperationError(
							this.getNode(),
							'Unexpected API response structure:' + JSON.stringify(response).substring(0, 100),
						);

					for (const ws of workspaces) {
						returnData.push({
							name: ws.title || ws.name || ws.id,
							value: ws.id,
						});
					}
				} catch (error) {
					console.error('\n--- HYPRIS WORKSPACE LOAD ERROR ---', error, '\n');
					throw new NodeOperationError(
						this.getNode(),
						`Error loading workspaces: ${(error as Error).message}`,
					);
				}
				return returnData;
			},
			async getDatabases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaceIdLoader = this.getCurrentNodeParameter('workspaceIdLoader') as string;
				console.error('\n*** DB LOAD TRIGGERED with workspaceIdLoader:', workspaceIdLoader);
				if (!workspaceIdLoader) return returnData;
				try {
					const response = await this.helpers.requestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/workspace/${workspaceIdLoader}/resource-items`,
						json: true,
					});
					console.error('*** DB LOAD RESPONSE:', JSON.stringify(response).substring(0, 500));
					let resources = [];
					if (Array.isArray(response)) resources = response;
					else if (response && Array.isArray(response.data)) resources = response.data;
					else if (response && response.data && Array.isArray(response.data.resourceItems))
						resources = response.data.resourceItems;
					else if (response && Array.isArray(response.resourceItems))
						resources = response.resourceItems;
					else
						throw new NodeOperationError(
							this.getNode(),
							'Unexpected API response structure:' + JSON.stringify(response).substring(0, 100),
						);

					console.error(
						'*** DB LOAD EXTRACTED RESOURCES COUNT:',
						resources.length,
						'FIRST RESOURCE:',
						JSON.stringify(resources[0]),
					);
					for (const res of resources) {
						if (res.resourceEntity && res.resourceEntity.resourceType === 'database') {
							returnData.push({
								name:
									res.name ||
									(res.resourceEntity.payload && res.resourceEntity.payload.title) ||
									res.id,
								value: res.resourceEntity.resourceId || res.id,
							});
						} else if (res.resourceType === 'database') {
							returnData.push({
								name: res.title || res.name || res.id,
								value: res.id,
							});
						}
					}
				} catch (error) {
					console.error('\n--- HYPRIS DB LOAD ERROR ---', error, '\n');
					throw new NodeOperationError(
						this.getNode(),
						`Error loading databases: ${(error as Error).message}`,
					);
				}
				return returnData;
			},
			async getSpaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaceIdLoader = this.getCurrentNodeParameter('workspaceIdLoader') as string;
				if (!workspaceIdLoader) return returnData;
				try {
					const response = await this.helpers.requestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/workspace/${workspaceIdLoader}/resource-space`,
						json: true,
					});
					let spaces = [];
					if (Array.isArray(response)) spaces = response;
					else if (response && response.data) spaces = response.data;
					else if (response && response.data && Array.isArray(response.data.spaces))
						spaces = response.data.spaces;
					else if (response && Array.isArray(response.spaces)) spaces = response.spaces;

					for (const space of spaces) {
						let name = space.name || space.title || space.id;
						if (space.isDefault) name = `${name} (Default)`;
						returnData.push({
							name: name,
							value: space.id,
						});
					}
				} catch (error) {
					console.error('\n--- HYPRIS SPACES LOAD ERROR ---', error, '\n');
				}
				return returnData;
			},
			async getProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const databaseId = this.getCurrentNodeParameter('databaseId') as string;
				if (!databaseId) return returnData;
				try {
					const response = await this.helpers.requestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/database/${databaseId}/properties`,
						qs: { includeDrafts: 'true' },
						json: true,
					});
					let properties = [];
					if (Array.isArray(response)) properties = response;
					else if (response && Array.isArray(response.data)) properties = response.data;
					else if (response && response.data && Array.isArray(response.data.properties))
						properties = response.data.properties;
					else if (response && Array.isArray(response.properties)) properties = response.properties;
					else
						throw new Error(
							'Unexpected API response structure:' + JSON.stringify(response).substring(0, 100),
						);
					let operation = '';
					let resource = '';
					try {
						operation = this.getCurrentNodeParameter('operation') as string;
						resource = this.getCurrentNodeParameter('resource') as string;
					} catch (e) {
						// Ignoruj błędy pobierania parametrów, jeśli brakuje ich w kontekście
					}

					for (const prop of properties) {
						let type = String(prop.type || '').toLowerCase();
						if (resource === 'property' && operation === 'delete' && type === 'name') {
							continue; // Wyklucz name z opcji usuwania
						}
						if (resource === 'item') {
							if (operation === 'create' || operation === 'update') {
								if (type === 'auto-id' || type === 'files' || type === 'conversation') continue;
							} else if (operation === 'uploadFile' || operation === 'deleteFile') {
								if (type !== 'files') continue;
							} else if (operation === 'addMessage') {
								if (type !== 'conversation') continue;
							}
						}

						let name = prop.title || prop.name || prop.id;
						if (prop.type) {
							name = `${name} [${prop.type}]`;
						}
						returnData.push({
							name: name,
							value: prop.id,
						});
					}
				} catch (error) {
					console.error('\n--- HYPRIS PROPERTIES LOAD ERROR ---', error, '\n');
					throw new NodeOperationError(
						this.getNode(),
						`Error loading properties: ${(error as Error).message}`,
					);
				}
				return returnData;
			},
			async getViews(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const databaseId = this.getCurrentNodeParameter('databaseId') as string;
				if (!databaseId) return returnData;
				try {
					const response = await this.helpers.requestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/database/${databaseId}/views`,
						json: true,
					});

					let views = [];
					if (response && response.data && Array.isArray(response.data.databaseViews)) {
						views = response.data.databaseViews;
					} else if (response && Array.isArray(response.databaseViews)) {
						views = response.databaseViews;
					} else if (Array.isArray(response)) {
						views = response;
					} else {
						throw new Error(
							'Unexpected API response structure:' + JSON.stringify(response).substring(0, 100),
						);
					}

					for (const view of views) {
						let name = view.name || view.title || view.id;
						if (view.type) {
							name = `${name} [${view.type}]`;
						}
						returnData.push({
							name: name,
							value: view.id,
						});
					}
				} catch (error) {
					console.error('\n--- HYPRIS VIEW LOAD ERROR ---', error, '\n');
					throw new NodeOperationError(
						this.getNode(),
						`Error loading views: ${(error as Error).message}`,
					);
				}
				return returnData;
			},
			async getResourceItems(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaceIdLoader = this.getCurrentNodeParameter('workspaceIdLoader') as string;
				if (!workspaceIdLoader) return returnData;
				try {
					const response = await this.helpers.requestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/workspace/${workspaceIdLoader}/resource-items`,
						json: true,
					});
					let resources = [];
					if (Array.isArray(response)) resources = response;
					else if (response && Array.isArray(response.data)) resources = response.data;
					else if (response && response.data && Array.isArray(response.data.resourceItems))
						resources = response.data.resourceItems;
					else if (response && Array.isArray(response.resourceItems))
						resources = response.resourceItems;
					else
						throw new Error(
							'Unexpected API response structure:' + JSON.stringify(response).substring(0, 100),
						);

					for (const res of resources) {
						returnData.push({
							name: `[${res.resourceEntity?.resourceType || res.resourceType || 'Resource'}] ${res.name || (res.resourceEntity?.payload?.title) || res.id}`,
							value: res.id,
						});
					}
				} catch (error) {
					console.error('\n--- HYPRIS RESOURCE ITEMS LOAD ERROR ---', error, '\n');
					throw new Error(`Error loading resource items: ${(error as Error).message}`);
				}
				return returnData;
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Hypris',
		name: 'hypris',
		icon: 'file:hypris.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Hypris API',
		defaults: {
			name: 'Hypris',
			color: '#8016d9',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'hyprisApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Database',
						value: 'database',
					},
					{
						name: 'Item',
						value: 'item',
					},
					{
						name: 'Property',
						value: 'property',
					},
					{
						name: 'Time Tracker Item',
						value: 'timeTrackerItem',
					},
					{
						name: 'View',
						value: 'view',
					},
					{
						name: 'Workspace',
						value: 'workspace',
					},
					{
						name: 'Resource Item',
						value: 'resourceItem',
					},
				],
				default: 'item',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an item in a database',
						action: 'Create an item',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete items from a database',
						action: 'Delete an item',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update property/cell values for an item',
						action: 'Update an item',
					},
					{
						name: 'List Items (Filter)',
						value: 'createFilterGroup',
						description: 'List or filter items in a database',
						action: 'List items',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						description: 'Upload a file to a files property of an item',
						action: 'Upload file to item',
					},
					{
						name: 'Delete File',
						value: 'deleteFile',
						description: 'Delete a file from a files property of an item',
						action: 'Delete file from item',
					},
					{
						name: 'Add Conversation Message',
						value: 'addMessage',
						description: 'Send a message to a conversation property of an item',
						action: 'Add message to conversation',
					},
					{
						name: 'Edit Conversation Message',
						value: 'updateMessage',
						description: 'Edit an existing conversation message',
						action: 'Edit conversation message',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['property'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a property in a database',
						action: 'Create a property',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Rename a property',
						action: 'Update a property',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get properties of a database',
						action: 'Get many properties',
					},
					{
						name: 'Get Full Data Options',
						value: 'getFullDataOptions',
						description: 'Get complete configuration for a status property',
						action: 'Get full data options for a property',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a property',
						action: 'Delete a property',
					},
				],
				default: 'getMany',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['timeTrackerItem'],
					},
				},
				options: [
					{
						name: 'Update',
						value: 'update',
						description: 'Update start and end times for a time tracker item',
						action: 'Update a time tracker item',
					},
				],
				default: 'update',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['view'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a view in a database',
						action: 'Create a view',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Rename or update a view',
						action: 'Update a view',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a view',
						action: 'Delete a view',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['workspace'],
					},
				},
				options: [
					{
						name: 'Get All',
						value: 'getAllWorkspaces',
						description: 'Get all workspaces for the current user',
						action: 'Get all workspaces',
					},
					{
						name: 'Create',
						value: 'createWorkspace',
						description: 'Create a new workspace',
						action: 'Create a workspace',
					},
					{
						name: 'Get Resources',
						value: 'getResources',
						description: 'Get all resources from a workspace',
						action: 'Get resources from a workspace',
					},
				],
				default: 'getAllWorkspaces',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['resourceItem'],
					},
				},
				options: [
					{
						name: 'Rename',
						value: 'rename',
						description: 'Rename a resource item/database',
						action: 'Rename a resource item',
					},
				],
				default: 'rename',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['database'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new database',
						action: 'Create a database',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'List all databases in a workspace',
						action: 'Get all databases',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a database',
						action: 'Delete a database',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Workspace (For Auto-loading Databases)',
				name: 'workspaceIdLoader',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				default: '',
				description:
					'Select a workspace to automatically load its databases below. You can leave this empty if you enter the Database ID manually.',
				displayOptions: {
					show: {
						resource: ['item', 'property', 'view', 'resourceItem', 'workspace', 'database'],
						operation: [
							'create',
							'delete',
							'update',
							'createFilterGroup',
							'getMany',
							'getFullDataOptions',
							'rename',
							'getResources',
							'getAll',
						],
					},
				},
			},
			{
				displayName: 'Database Name or ID',
				name: 'databaseId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDatabases',
					loadOptionsDependsOn: ['workspaceIdLoader'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: [
							'create',
							'delete',
							'update',
							'createFilterGroup',
							'uploadFile',
							'addMessage',
						],
					},
				},
				description: 'The ID of the database, e.g., 69b7dc893bdd1bad9241263f',
			},
			{
				displayName: 'Database Name or ID',
				name: 'databaseId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDatabases',
					loadOptionsDependsOn: ['workspaceIdLoader'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['property', 'view', 'database'],
						operation: ['create', 'getMany', 'delete'],
					},
				},
				description: 'The ID of the database, e.g., 69b7dc893bdd1bad9241263f',
			},
			{
				displayName: 'Item ID',
				name: 'itemId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['update', 'uploadFile', 'addMessage'],
					},
				},
				description: 'The ID of the item',
			},
			{
				displayName: 'Item IDs to Delete',
				name: 'itemIds',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['delete'],
					},
				},
				description: 'Comma separated list of Item IDs to delete',
			},
			{
				displayName: 'Property Name or ID',
				name: 'propertyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['update', 'getFullDataOptions'],
					},
				},
				description: 'Select the property or enter its ID',
			},
			{
				displayName: 'Properties to Delete',
				name: 'propertyIdsToDelete',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: [],
				required: true,
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['delete'],
					},
				},
				description: 'Select the properties to delete',
			},
			{
				displayName: 'Time Tracker Item ID',
				name: 'timeTrackerItemId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['timeTrackerItem'],
						operation: ['update'],
					},
				},
				description: 'The ID of the time tracker item to update',
			},
			{
				displayName: 'View Name or ID',
				name: 'viewId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getViews',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['view'],
						operation: ['update'],
					},
				},
				description: 'Select the view or enter its ID',
			},
			{
				displayName: 'Views to Delete',
				name: 'viewIdsToDelete',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getViews',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: [],
				required: true,
				displayOptions: {
					show: {
						resource: ['view'],
						operation: ['delete'],
					},
				},
				description: 'Select the views to delete',
			},
			{
				displayName: 'Resource Item Name or ID',
				name: 'resourceItemId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getResourceItems',
					loadOptionsDependsOn: ['workspaceIdLoader'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['resourceItem'],
						operation: ['rename'],
					},
				},
				description: 'Select the resource item or enter its ID to rename',
			},
			{
				displayName: 'New Name',
				name: 'newName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['resourceItem'],
						operation: ['rename'],
					},
				},
				description: 'The new name for the resource item',
			},
			{
				displayName: 'Include Drafts',
				name: 'includeDrafts',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['getMany'],
					},
				},
				description: 'Whether to include draft properties',
			},
			{
				displayName: 'JSON Parameters',
				name: 'jsonParameters',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create', 'update'],
					},
				},
				description: 'Whether to pass the parameters as raw JSON (advanced)',
			},
			{
				displayName: 'Properties',
				name: 'properties',
				placeholder: 'Add Property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create', 'update'],
						jsonParameters: [false],
					},
				},
				options: [
					{
						name: 'propertyValues',
						displayName: 'Property',
						values: [
							{
								displayName: 'Property Name or ID',
								name: 'propertyId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getProperties',
									loadOptionsDependsOn: ['databaseId'],
								},
								default: '',
								description: 'Select the property to set the value for',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description:
									'The value to set. For advanced values like arrays, use Expressions to return an array or switch to JSON Parameters.',
							},
						],
					},
				],
			},
			{
				displayName: 'Auto-create Missing Status/Dropdown Options',
				name: 'autoCreateOptions',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create', 'update'],
						jsonParameters: [false],
					},
				},
				description:
					'Whether to automatically create status or dropdown labels if the provided string value does not already exist in the database property',
			},
			{
				displayName: 'Content (Raw JSON)',
				name: 'jsonContent',
				type: 'json',
				default: '{\n  "cellValues": {}\n}',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create', 'update'],
						jsonParameters: [true],
					},
				},
				description: 'The JSON payload with cellValues',
			},
			{
				displayName: 'Property Name or ID',
				name: 'filePropertyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId', 'operation'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['uploadFile'],
					},
				},
				description: 'Select the Files property',
			},
			{
				displayName: 'Input Data Field Name',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['uploadFile'],
					},
				},
				description: 'Name of the binary property to upload (e.g. data)',
			},
			{
				displayName: 'File ID to Delete',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['deleteFile'],
					},
				},
				description: 'The ID of the file to delete (e.g. 69dc...b10)',
			},
			{
				displayName: 'Property Name or ID',
				name: 'conversationPropertyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId', 'operation'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['addMessage'],
					},
				},
				description: 'Select the Conversation property',
			},
			{
				displayName: 'Message Content',
				name: 'messageContent',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['addMessage', 'updateMessage'],
					},
				},
				description: 'The content of your message',
			},
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['updateMessage'],
					},
				},
				description: 'The ID of the message to update',
			},
			{
				displayName: 'Started At',
				name: 'startedAt',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						resource: ['timeTrackerItem'],
						operation: ['update'],
					},
				},
				description: 'The start time of the time tracker item',
			},
			{
				displayName: 'Ended At',
				name: 'endedAt',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						resource: ['timeTrackerItem'],
						operation: ['update'],
					},
				},
				description: 'The end time of the time tracker item',
			},
			{
				displayName: 'Views to Create',
				name: 'viewsList',
				placeholder: 'Add View',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				displayOptions: {
					show: {
						resource: ['view'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'viewValues',
						displayName: 'View',
						values: [
							{
								displayName: 'View Title',
								name: 'title',
								type: 'string',
								default: '',
								required: true,
								description: 'Name of the new view',
							},
							{
								displayName: 'View Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Table', value: 'table' },
									{ name: 'Calendar', value: 'calendar' },
									{ name: 'Timeline', value: 'timeline' },
									{ name: 'Kanban', value: 'kanban' },
									{ name: 'Map', value: 'map' },
									{ name: 'Form', value: 'form' },
								],
								default: 'table',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'View Title',
				name: 'viewTitle',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['view'],
						operation: ['update'],
					},
				},
				description: 'New name for the view',
			},
			{
				displayName: 'View Type',
				name: 'viewType',
				type: 'options',
				options: [
					{ name: 'Table', value: 'table' },
					{ name: 'Calendar', value: 'calendar' },
					{ name: 'Timeline', value: 'timeline' },
					{ name: 'Kanban', value: 'kanban' },
					{ name: 'Map', value: 'map' },
					{ name: 'Form', value: 'form' },
				],
				default: 'table',
				displayOptions: {
					show: {
						resource: ['view'],
						operation: ['update'],
					},
				},
				description: 'New type for the view',
			},
			{
				displayName: 'Workspace Name',
				name: 'workspaceName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['workspace'],
						operation: ['createWorkspace'],
					},
				},
				description: 'The unique name identifier for the workspace (e.g. nowy-workspace)',
			},
			{
				displayName: 'Workspace Title',
				name: 'workspaceTitle',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['workspace'],
						operation: ['createWorkspace'],
					},
				},
				description: 'The display title for the workspace (e.g. Nowy Workspace)',
			},
			{
				displayName: 'Workspace Type',
				name: 'workspaceType',
				type: 'options',
				options: [
					{ name: '- Leave Empty -', value: '' },
					{ name: 'Team', value: 'team' },
					{ name: 'Personal', value: 'personal' },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['workspace'],
						operation: ['createWorkspace'],
					},
				},
				description: 'The type of workspace',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 100,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['createFilterGroup'],
					},
				},
				description: 'Max number of items to fetch',
			},
			{
				displayName: 'Columns To Fetch',
				name: 'databasePropertyIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: [],
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['createFilterGroup'],
					},
				},
				description:
					'Select which columns to fetch. Leave empty to automatically fetch all properties.',
			},
			{
				displayName: 'Property Title',
				name: 'propertyTitle',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['update'],
					},
				},
				description: 'The title/name of the property',
			},
			{
				displayName: 'Property Type',
				name: 'propertyType',
				type: 'options',
				options: [
					{ name: 'Text', value: 'text' },
					{ name: 'Rich Text', value: 'rich-text' },
					{ name: 'Auto ID', value: 'auto-id' },
					{ name: 'Number', value: 'number' },
					{ name: 'People', value: 'people' },
					{ name: 'Rating', value: 'rating' },
					{ name: 'Status', value: 'status' },
					{ name: 'Dropdown', value: 'dropdown' },
					{ name: 'Time Tracker', value: 'time-tracker' },
					{ name: 'Phone', value: 'phone' },
					{ name: 'Mail', value: 'mail' },
					{ name: 'Location', value: 'location' },
					{ name: 'Link', value: 'link' },
					{ name: 'Relation', value: 'relation' },
					{ name: 'Reverse-relation', value: 'reverse-relation' },
					{ name: 'Teleport', value: 'teleport' },
					{ name: 'Formula', value: 'formula' },
				],
				default: 'text',
				required: true,
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['update'], // we can hide it entirely or keep for later if needed, but it's replaced by propertiesList for create
					},
				},
				description: 'The type of the property',
			},
			{
				displayName: 'Properties to Create',
				name: 'propertiesList',
				placeholder: 'Add Property',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'propertyValues',
						displayName: 'Property',
						values: [
							{
								displayName: 'Property Title',
								name: 'title',
								type: 'string',
								default: '',
								required: true,
								description: 'Name of the new property',
							},
							{
								displayName: 'Property Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Text', value: 'text' },
									{ name: 'Rich Text', value: 'rich-text' },
									{ name: 'Auto ID', value: 'auto-id' },
									{ name: 'Number', value: 'number' },
									{ name: 'People', value: 'people' },
									{ name: 'Rating', value: 'rating' },
									{ name: 'Status', value: 'status' },
									{ name: 'Dropdown', value: 'dropdown' },
									{ name: 'Time Tracker', value: 'time-tracker' },
									{ name: 'Phone', value: 'phone' },
									{ name: 'Mail', value: 'mail' },
									{ name: 'Location', value: 'location' },
									{ name: 'Link', value: 'link' },
									{ name: 'Relation', value: 'relation' },
									{ name: 'Reverse-relation', value: 'reverse-relation' },
									{ name: 'Teleport', value: 'teleport' },
									{ name: 'Formula', value: 'formula' },
									{ name: 'Date', value: 'date' },
									{ name: 'Files', value: 'files' },
									{ name: 'Comments', value: 'comments' },
									{ name: 'Created At', value: 'created-at' },
									{ name: 'Updated At', value: 'updated-at' },
								],
								default: 'text',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Database Title',
				name: 'dbTitle',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['database'],
						operation: ['create'],
					},
				},
				description: 'Name of the database',
			},
			{
				displayName: 'Resource Space ID',
				name: 'resourceSpaceId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['database'],
						operation: ['create'],
					},
				},
				description:
					'Optional. Providing ID here assigns database to specific space. If empty, it will be auto-detected.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const dbPropertiesCache: { [key: string]: any[] } = {};

		const processFixedCollectionProperties = async (
			thisArg: IExecuteFunctions,
			properties: any,
			databaseId: string,
			autoCreateOptions: boolean,
			body: any,
		) => {
			body.cellValues = {};
			if (!properties || !properties.propertyValues) return;
			if (!dbPropertiesCache[databaseId]) {
				const propsResponse = await thisArg.helpers.requestWithAuthentication.call(
					thisArg,
					'hyprisApi',
					{
						method: 'GET',
						url: `https://api.hypris.com/v1/database/${databaseId}/properties`,
						qs: { includeDrafts: 'true' },
						json: true,
					},
				);
				dbPropertiesCache[databaseId] = Array.isArray(propsResponse)
					? propsResponse
					: propsResponse?.data?.properties ||
						propsResponse?.properties ||
						propsResponse?.data ||
						[];
			}
			const dbProps = dbPropertiesCache[databaseId];
			for (const prop of properties.propertyValues) {
				let finalValue = prop.value;
				const propMeta = dbProps.find((p: any) => p.id === prop.propertyId);
				if (propMeta && (propMeta.type === 'status' || propMeta.type === 'dropdown')) {
					const isStatus = propMeta.type === 'status';
					const optResponse = await thisArg.helpers.requestWithAuthentication.call(
						thisArg,
						'hyprisApi',
						{
							method: 'GET',
							url: `https://api.hypris.com/v1/property/${prop.propertyId}/${isStatus ? 'statuses' : 'labels'}`,
							json: true,
						},
					);
					const optionsList = Array.isArray(optResponse)
						? optResponse
						: optResponse?.data?.labels ||
							optResponse?.labels ||
							optResponse?.data?.statuses ||
							optResponse?.statuses ||
							optResponse?.data ||
							[];
					const strVal = String(finalValue).trim().toLowerCase();
					const match = optionsList.find(
						(o: any) =>
							String(o.id) === strVal ||
							String(o.title || o.name || '')
								.trim()
								.toLowerCase() === strVal,
					);

					if (match) {
						finalValue = isStatus ? match.id : [match.id];
					} else if (autoCreateOptions && String(finalValue).trim() !== '') {
						const postBody: any = { title: String(finalValue).trim() };
						if (!isStatus) {
							postBody.position = 0;
							postBody.color = { colorType: 'palette', payload: 13 };
						}
						const createResp = await thisArg.helpers.requestWithAuthentication.call(
							thisArg,
							'hyprisApi',
							{
								method: 'POST',
								url: `https://api.hypris.com/v1/property/${prop.propertyId}/${isStatus ? 'status' : 'label'}`,
								body: postBody,
								json: true,
							},
						);
						let extractedId =
							createResp?.data?.status?.id ||
							createResp?.data?.label?.id ||
							createResp?.data?.id ||
							createResp?.id ||
							finalValue;
						finalValue = isStatus ? extractedId : [extractedId];
					}
				} else if (propMeta && (propMeta.type === 'number' || propMeta.type === 'rating')) {
					if (finalValue !== undefined && finalValue !== null && finalValue !== '') {
						finalValue = Number(finalValue);
					}
				} else if (
					propMeta &&
					(propMeta.type === 'relation' ||
						propMeta.type === 'reverse-relation' ||
						propMeta.type === 'people')
				) {
					if (typeof finalValue === 'string') {
						if (finalValue.includes(',')) {
							finalValue = finalValue
								.split(',')
								.map((s) => s.trim())
								.filter((s) => s);
						} else if (
							finalValue.trim() !== '' &&
							!finalValue.trim().startsWith('{') &&
							!finalValue.trim().startsWith('[')
						) {
							finalValue = [finalValue.trim()];
						}
					}
				}

				// Safely parse JSON strings (handling accidental extra quotes)
				if (typeof finalValue === 'string') {
					finalValue = finalValue.trim().replace(/^"|"$/g, '');
					if (
						(finalValue.startsWith('{') && finalValue.endsWith('}')) ||
						(finalValue.startsWith('[') && finalValue.endsWith(']'))
					) {
						try {
							finalValue = JSON.parse(finalValue);
						} catch (e) {
							// Fallback to string if parsing fails
						}
					}
				}

				// Handle plain text URLs for link fields by auto-wrapping them
				if (propMeta && propMeta.type === 'link') {
					if (typeof finalValue === 'string') {
						finalValue = { url: finalValue };
					}
				}
				body.cellValues[prop.propertyId] = finalValue;
			}
		};

		for (let i = 0; i < items.length; i++) {
			try {
				let options: IHttpRequestOptions | undefined;

				if (resource === 'item') {
					if (operation === 'create') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						let body: any = {};
						const jsonParameters = this.getNodeParameter('jsonParameters', i, false) as boolean;
						if (jsonParameters) {
							const jsonContentStr = this.getNodeParameter('jsonContent', i) as string;
							try {
								body = JSON.parse(jsonContentStr);
							} catch (e) {
								throw new NodeOperationError(
									this.getNode(),
									`Invalid JSON: ${(e as Error).message}`,
									{ itemIndex: i },
								);
							}
						} else {
							const properties = this.getNodeParameter('properties', i, {}) as any;
							const autoCreateOptions = this.getNodeParameter(
								'autoCreateOptions',
								i,
								true,
							) as boolean;
							await processFixedCollectionProperties(
								this,
								properties,
								databaseId,
								autoCreateOptions,
								body,
							);
							body.state = 'published';
						}

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/database/${databaseId}/item`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'delete') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const itemIdsStr = this.getNodeParameter('itemIds', i) as string;
						const databaseItemIds = itemIdsStr
							.split(',')
							.map((id) => id.trim())
							.filter((id) => id);

						options = {
							method: 'DELETE',
							url: `https://api.hypris.com/v1/database/${databaseId}/items`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: { databaseItemIds },
							json: true,
						};
					} else if (operation === 'update') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						let body: any = {};
						const jsonParameters = this.getNodeParameter('jsonParameters', i, false) as boolean;
						if (jsonParameters) {
							const jsonContentStr = this.getNodeParameter('jsonContent', i) as string;
							try {
								body = JSON.parse(jsonContentStr);
							} catch (e) {
								throw new NodeOperationError(
									this.getNode(),
									`Invalid JSON: ${(e as Error).message}`,
									{ itemIndex: i },
								);
							}
						} else {
							const databaseId = this.getNodeParameter('databaseId', i) as string;
							const properties = this.getNodeParameter('properties', i, {}) as any;
							const autoCreateOptions = this.getNodeParameter(
								'autoCreateOptions',
								i,
								true,
							) as boolean;
							await processFixedCollectionProperties(
								this,
								properties,
								databaseId,
								autoCreateOptions,
								body,
							);
						}

						options = {
							method: 'PATCH',
							url: `https://api.hypris.com/v1/item/${itemId}/cell-values`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'createFilterGroup') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const limit = this.getNodeParameter('limit', i, 100) as number;
						let databasePropertyIds = this.getNodeParameter(
							'databasePropertyIds',
							i,
							[],
						) as string[];

						if (!databasePropertyIds || databasePropertyIds.length === 0) {
							if (!dbPropertiesCache[databaseId]) {
								const propsResp = await this.helpers.requestWithAuthentication.call(
									this,
									'hyprisApi',
									{
										method: 'GET',
										url: `https://api.hypris.com/v1/database/${databaseId}/properties`,
										json: true,
									},
								);
								dbPropertiesCache[databaseId] = Array.isArray(propsResp)
									? propsResp
									: propsResp?.data?.properties || propsResp?.properties || propsResp?.data || [];
							}
							databasePropertyIds = dbPropertiesCache[databaseId].map((p: any) => p.id);
						}

						const body = {
							filterGroups: [{ offset: 0, limit: limit, filter: null }],
							databasePropertyIds: databasePropertyIds,
						};

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/database/${databaseId}/items/filter-groups`,
							qs: { sortDirection: '1' },
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'uploadFile') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const filePropertyId = this.getNodeParameter('filePropertyId', i) as string;
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/item/${itemId}/property/${filePropertyId}/file`,
							headers: { Accept: 'application/json' },
							formData: {
								file: {
									value: fileBuffer,
									options: {
										filename: binaryData.fileName,
										contentType: binaryData.mimeType,
									},
								},
							},
						} as any;
					} else if (operation === 'deleteFile') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						options = {
							method: 'DELETE',
							url: `https://api.hypris.com/v1/database-item-file/${fileId}`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					} else if (operation === 'addMessage') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const conversationPropertyId = this.getNodeParameter(
							'conversationPropertyId',
							i,
						) as string;
						const messageContent = this.getNodeParameter('messageContent', i) as string;

						const payload = {
							content: [{ type: 'paragraph', content: [{ type: 'text', text: messageContent }] }],
							conversationTypePayload: {
								databasePropertyId: conversationPropertyId,
								databaseItemId: itemId,
							},
							state: 'sent',
							replyMessageId: null,
						};
						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/conversation-type/database-cell/message`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: payload,
							json: true,
						};
					} else if (operation === 'updateMessage') {
						const messageId = this.getNodeParameter('messageId', i) as string;
						const messageContent = this.getNodeParameter('messageContent', i) as string;

						const payload = {
							content: [{ type: 'paragraph', content: [{ type: 'text', text: messageContent }] }],
						};
						options = {
							method: 'PATCH',
							url: `https://api.hypris.com/v1/message/${messageId}`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: payload,
							json: true,
						};
					}
				} else if (resource === 'property') {
					if (operation === 'create') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const propertiesList = this.getNodeParameter('propertiesList', i, {
							propertyValues: [],
						}) as any;

						const createdProps = [];
						for (const prop of propertiesList.propertyValues || []) {
							const body = { title: prop.title, type: prop.type, state: 'published' };

							console.log('\n--- HYPRIS BULK REQUEST DEBUG (PROPERTY CREATE) ---');
							console.log(
								'Method: POST URL:',
								`https://api.hypris.com/v1/database/${databaseId}/property`,
							);
							console.log('Payload:', JSON.stringify(body, null, 2));

							try {
								const res = await this.helpers.requestWithAuthentication.call(this, 'hyprisApi', {
									method: 'POST',
									url: `https://api.hypris.com/v1/database/${databaseId}/property`,
									body,
									json: true,
								});
								console.log('Response:', JSON.stringify(res, null, 2));
								console.log('---------------------------------------------------\n');
								createdProps.push(res);
							} catch (e: any) {
								console.error('Error Response:', e.message);
								console.log('---------------------------------------------------\n');
								throw e;
							}
						}

						returnData.push({ json: { createdProperties: createdProps } });
						continue;
					} else if (operation === 'delete') {
						const propertyIdsToDelete = this.getNodeParameter('propertyIdsToDelete', i) as any;
						const propertyIds = Array.isArray(propertyIdsToDelete)
							? propertyIdsToDelete
							: [propertyIdsToDelete];

						const deletedProps = [];
						for (const propId of propertyIds) {
							console.log('\n--- HYPRIS BULK REQUEST DEBUG (PROPERTY DELETE) ---');
							console.log('Method: DELETE URL:', `https://api.hypris.com/v1/property/${propId}`);

							try {
								const res = await this.helpers.requestWithAuthentication.call(this, 'hyprisApi', {
									method: 'DELETE',
									url: `https://api.hypris.com/v1/property/${propId}`,
									json: true,
								});
								console.log('Response:', JSON.stringify(res, null, 2));
								console.log('---------------------------------------------------\n');
								deletedProps.push({ propertyId: propId, status: res });
							} catch (e: any) {
								console.error('Error Response:', e.message);
								console.log('---------------------------------------------------\n');
								throw e;
							}
						}

						returnData.push({ json: { deletedProperties: deletedProps } });
						continue;
					} else if (operation === 'update') {
						const propertyId = this.getNodeParameter('propertyId', i) as string;
						const title = this.getNodeParameter('propertyTitle', i) as string;

						options = {
							method: 'PATCH',
							url: `https://api.hypris.com/v1/property/${propertyId}`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: { title },
							json: true,
						};
					} else if (operation === 'getMany') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const includeDrafts = this.getNodeParameter('includeDrafts', i) as boolean;

						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/database/${databaseId}/properties`,
							qs: { includeDrafts: includeDrafts.toString() },
							headers: { Accept: 'application/json' },
							json: true,
						};
					} else if (operation === 'delete') {
						const propertyId = this.getNodeParameter('propertyId', i) as string;

						options = {
							method: 'DELETE',
							url: `https://api.hypris.com/v1/property/${propertyId}`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					} else if (operation === 'getFullDataOptions') {
						const propertyId = this.getNodeParameter('propertyId', i) as string;

						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/property/${propertyId}/full-data-options`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					}
				} else if (resource === 'view') {
					if (operation === 'create') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const viewsList = this.getNodeParameter('viewsList', i, { viewValues: [] }) as any;

						const createdViews = [];
						for (const view of viewsList.viewValues || []) {
							const body = { name: view.title, type: view.type };

							console.log('\n--- HYPRIS BULK REQUEST DEBUG (VIEW CREATE) ---');
							console.log(
								'Method: POST URL:',
								`https://api.hypris.com/v1/database/${databaseId}/view`,
							);
							console.log('Payload:', JSON.stringify(body, null, 2));

							try {
								const res = await this.helpers.requestWithAuthentication.call(this, 'hyprisApi', {
									method: 'POST',
									url: `https://api.hypris.com/v1/database/${databaseId}/view`,
									body,
									json: true,
								});
								console.log('Response:', JSON.stringify(res, null, 2));
								console.log('---------------------------------------------------\n');
								createdViews.push(res);
							} catch (e: any) {
								console.error('Error Response:', e.message);
								console.log('---------------------------------------------------\n');
								throw e;
							}
						}

						returnData.push({ json: { createdViews } });
						continue;
					} else if (operation === 'update') {
						const viewId = this.getNodeParameter('viewId', i) as string;
						const viewTitle = this.getNodeParameter('viewTitle', i, '') as string;
						const viewType = this.getNodeParameter('viewType', i, '') as string;

						const body: any = {};
						if (viewTitle) body.name = viewTitle;
						if (viewType) body.type = viewType;

						options = {
							method: 'PATCH',
							url: `https://api.hypris.com/v1/view/${viewId}`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'delete') {
						const viewIdsToDelete = this.getNodeParameter('viewIdsToDelete', i) as any;
						const viewIds = Array.isArray(viewIdsToDelete) ? viewIdsToDelete : [viewIdsToDelete];
						const deletedViews = [];

						for (const viewId of viewIds) {
							console.log('\n--- HYPRIS BULK REQUEST DEBUG (VIEW DELETE) ---');
							console.log('Method: DELETE URL:', `https://api.hypris.com/v1/view/${viewId}`);

							try {
								const res = await this.helpers.requestWithAuthentication.call(this, 'hyprisApi', {
									method: 'DELETE',
									url: `https://api.hypris.com/v1/view/${viewId}`,
									headers: { Accept: 'application/json' },
									json: true,
								});
								console.log('Response:', JSON.stringify(res, null, 2));
								console.log('---------------------------------------------------\n');
								deletedViews.push({ viewId, status: res });
							} catch (e: any) {
								console.error('Error Response:', e.message);
								console.log('---------------------------------------------------\n');
								throw e;
							}
						}

						returnData.push({ json: { deletedViews } });
						continue;
					}
				} else if (resource === 'workspace') {
					if (operation === 'getAllWorkspaces') {
						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/me/workspaces`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					} else if (operation === 'createWorkspace') {
						const workspaceName = this.getNodeParameter('workspaceName', i) as string;
						const workspaceTitle = this.getNodeParameter('workspaceTitle', i, '') as string;
						const workspaceType = this.getNodeParameter('workspaceType', i, '') as string;
						let body: any = {
							name: workspaceName,
						};
						if (workspaceTitle) body.title = workspaceTitle;
						if (workspaceType) body.type = workspaceType;

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/workspace`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'getResources') {
						const workspaceId = this.getNodeParameter('workspaceIdLoader', i) as string;
						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/workspace/${workspaceId}/resource-items`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					}
				} else if (resource === 'resourceItem') {
					if (operation === 'rename') {
						const resourceItemId = this.getNodeParameter('resourceItemId', i) as string;
						const newName = this.getNodeParameter('newName', i) as string;
						options = {
							method: 'PUT',
							url: `https://api.hypris.com/v1/resource-item/${resourceItemId}/name`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: { name: newName },
							json: true,
						};
					}
				} else if (resource === 'database') {
					if (operation === 'getAll') {
						const workspaceId = this.getNodeParameter('workspaceIdLoader', i) as string;
						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/workspace/${workspaceId}/resource-items`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					} else if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceIdLoader', i) as string;
						const dbTitle = this.getNodeParameter('dbTitle', i) as string;
						let resourceSpaceId = this.getNodeParameter('resourceSpaceId', i, '') as string;

						if (!resourceSpaceId) {
							try {
								const itemsResp = await this.helpers.requestWithAuthentication.call(
									this,
									'hyprisApi',
									{
										method: 'GET',
										url: `https://api.hypris.com/v1/workspace/${workspaceId}/resource-items`,
										json: true,
									},
								);
								let resources = [];
								if (Array.isArray(itemsResp)) resources = itemsResp;
								else if (itemsResp && itemsResp.data && Array.isArray(itemsResp.data.resourceItems))
									resources = itemsResp.data.resourceItems;
								else if (itemsResp && Array.isArray(itemsResp.resourceItems))
									resources = itemsResp.resourceItems;

								if (resources.length > 0) {
									const itemWithSpace = resources.find((r: any) => r.resourceSpaceId);
									if (itemWithSpace && itemWithSpace.resourceSpaceId) {
										resourceSpaceId = itemWithSpace.resourceSpaceId;
									}
								}
							} catch (e: any) {
								console.log('Failed to fetch resource space fallback from items:', e.message);
							}
						}

						const body: any = {
							title: dbTitle,
							resourceGroupId: null,
							isPublic: false,
						};
						if (resourceSpaceId) body.resourceSpaceId = resourceSpaceId;

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/workspace/${workspaceId}/database`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'delete') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						options = {
							method: 'DELETE',
							url: `https://api.hypris.com/v1/database/${databaseId}`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					}
				}

				if (options) {
					console.log('\n--- HYPRIS REQUEST DEBUG ---');
					console.log('Method:', options.method, 'URL:', options.url);
					if (options.body) console.log('Payload:', JSON.stringify(options.body, null, 2));
					console.log('----------------------------\n');

					const responseData = await this.helpers.requestWithAuthentication.call(
						this,
						'hyprisApi',
						options,
					);

					console.log('\n--- HYPRIS RESPONSE DEBUG ---');
					console.log(JSON.stringify(responseData, null, 2));
					console.log('-----------------------------\n');

					let data = responseData;
					if (
						typeof responseData === 'string' ||
						responseData === undefined ||
						responseData === null
					) {
						data = {
							success: true,
							message:
								responseData !== undefined ? responseData : 'Successful with no response body',
						};
					} else if (resource === 'database' && operation === 'getAll') {
						let resources = [];
						if (Array.isArray(responseData)) resources = responseData;
						else if (responseData && Array.isArray(responseData.data))
							resources = responseData.data;
						else if (
							responseData &&
							responseData.data &&
							Array.isArray(responseData.data.resourceItems)
						)
							resources = responseData.data.resourceItems;
						else if (responseData && Array.isArray(responseData.resourceItems))
							resources = responseData.resourceItems;

						const databases = resources.filter(
							(item: any) =>
								item.resourceType === 'database' ||
								(item.resourceEntity && item.resourceEntity.resourceType === 'database'),
						);
						data = { databases };
					}
					returnData.push({ json: data });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as any).message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
