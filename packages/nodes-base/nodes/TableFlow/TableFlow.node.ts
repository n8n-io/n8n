import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class TableFlow implements INodeType {
	// 🔹 Node type description
	description: INodeTypeDescription = {
		displayName: 'TableFlow',
		name: 'tableflow',
		icon: { light: 'file:icon.svg', dark: 'file:icon-dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with TableFlow APIs using Access token',
		defaults: {
			name: 'TableFlow',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'tableflowApi',
				required: true,
			},
		],

		properties: [
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Record', value: 'record' }],
				default: 'record',
			},

			// ✅ Record operations (CRUD → shows under Actions)
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['record'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a record' },
					{
						name: 'Create or Update',
						value: 'create or update',
						action: 'Create or update a record',
					},
					{ name: 'Delete', value: 'delete', action: 'Delete a record' },
					{ name: 'Get', value: 'get', action: 'Get a record' },
				],
				default: 'create',
			},

			// Table selection
			{
				displayName: 'Table',
				name: 'tableId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getTables' },
				default: '',
				required: true,
				displayOptions: {
					show: { operation: ['create', 'create or update', 'delete', 'get'] },
				},
			},

			// Record ID (for update mode)
			{
				displayName: 'Record ID',
				name: 'recordId',
				type: 'string',
				default: '',
				description: 'If provided, the record with this ID will be updated instead of created',
				displayOptions: {
					show: { operation: ['create or update'], resource: ['record'] },
				},
			},

			// Mapping mode
			{
				displayName: 'Mapping Column Mode',
				name: 'mappingMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Map Each Column Manually', value: 'manual' },
					{ name: 'Map Automatically', value: 'auto' },
				],
				default: 'manual',
				required: true,
				displayOptions: {
					show: { operation: ['create', 'create or update'], resource: ['record'] },
				},
			},

			{
				displayName:
					'In this mode, make sure the incoming data fields are named the same as the columns in TableFlow. (Use an "Edit Fields" node before this node to change them if required.)',
				name: 'autoMappingNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						mappingMode: ['auto'],
						operation: ['create', 'create or update'],
						resource: ['record'],
					},
				},
			},

			// Manual mapping
			{
				displayName: 'Values to Send',
				name: 'valuesToSend',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Column',
				default: {},
				displayOptions: {
					show: { mappingMode: ['manual'], operation: ['create', 'create or update'] },
				},
				options: [
					{
						name: 'columns',
						displayName: 'Columns',
						values: [
							{
								displayName: 'Column Name',
								name: 'columnName',
								type: 'options',
								typeOptions: { loadOptionsMethod: 'getTableColumns' },
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},

			// ✅ Extra fields for GET records
			{
				displayName: 'Search Query',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search string to filter records',
				displayOptions: {
					show: { operation: ['get'], resource: ['record'] },
				},
			},

			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'Number of records to skip',
				displayOptions: {
					show: { operation: ['get'], resource: ['record'] },
				},
			},

			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				default: 50,
				description: 'Number of records to fetch',
				displayOptions: {
					show: { operation: ['get'], resource: ['record'] },
				},
			},

			{
				displayName: 'Include Count',
				name: 'includeCount',
				type: 'boolean',
				default: true,
				description: 'Whether to include total count in the response',
				displayOptions: {
					show: { operation: ['get'], resource: ['record'] },
				},
			},
		],
	};

	// 🔹 Load options for dynamic dropdowns
	methods = {
		loadOptions: {
			async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const credentials = await this.getCredentials('tableflowApi');
					const accessToken = credentials?.token;

					const response = await this.helpers.request({
						method: 'GET',
						url: 'https://api.tableflow.tech/app',
						headers: {
							Authorization: `Bearer ${accessToken}`,
							Accept: 'application/json',
						},
						json: true,
					});

					const options: INodePropertyOptions[] = [];
					if (response.Tablees) {
						for (const [id, table] of Object.entries(response.Tablees)) {
							options.push({ name: (table as any).DbName, value: id });
						}
					}
					return options;
				} catch (error: any) {
					throw new NodeOperationError(this.getNode(), `Failed to fetch tables: ${error.message}`);
				}
			},

			async getTableColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tableId = this.getCurrentNodeParameter('tableId') as string;
				if (!tableId) return [];

				const credentials = await this.getCredentials('tableflowApi');
				const accessToken = credentials?.token;

				const response = await this.helpers.request({
					method: 'GET',
					url: `https://api.tableflow.tech/app`,
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: 'application/json',
					},
					json: true,
				});

				const table = response.Tablees?.[tableId];
				if (!table || !table.Fields) {
					return [];
				}

				return table.Fields.map((field: any) => ({
					name: field.Label || field.Name,
					value: field.Name,
				}));
			},

			async getDynamicColumns(this: ILoadOptionsFunctions) {
				const tableId = this.getCurrentNodeParameter('tableId') as string;
				if (!tableId) return [];

				const credentials = await this.getCredentials('tableflowApi');
				const accessToken = credentials?.token;

				const response = await this.helpers.request({
					method: 'GET',
					url: 'https://api.tableflow.tech/app',
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: 'application/json',
					},
					json: true,
				});

				const table = response.Tablees?.[tableId];
				if (!table?.Fields) return [];

				return table.Fields.map((field: any) => ({
					displayName: field.Label || field.Name,
					name: field.Name,
					type: 'string',
					default: '',
				}));
			},
		},
	};

	// 🔹 Execute handler for record CRUD
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('tableflowApi');
		const accessToken = credentials?.token;

		// Cache schema so we don’t call /app multiple times
		let schemaCache: any = null;

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				// ✅ Create / Create or Update
				if (resource === 'record' && (operation === 'create' || operation === 'create or update')) {
					const tableId = this.getNodeParameter('tableId', i) as string;
					const mappingMode = this.getNodeParameter('mappingMode', i) as string;
					const recordId = this.getNodeParameter('recordId', i, '') as string;

					let fields: any[] = [];

					// 🔹 Collect fields from input
					if (mappingMode === 'manual') {
						const valuesToSend = this.getNodeParameter('valuesToSend', i, {}) as {
							columns?: Array<{ columnName: string; value: string }>;
						};

						if (valuesToSend.columns) {
							fields = valuesToSend.columns.map((col) => ({
								Name: col.columnName,
								Type: 1,
								Value: col.value,
							}));
						}
					} else if (mappingMode === 'auto') {
						const itemData = items[i].json;
						fields = Object.entries(itemData).map(([key, value]) => ({
							Name: key,
							Type: 1,
							Value: value,
						}));
					}

					let response;

					// ✅ Case 1: Update (only selected fields)
					if (recordId && operation === 'create or update') {
						const body = [
							{
								TableId: tableId,
								Locked: false,
								Fields: fields,
								Id: recordId,
							},
						];

						response = await this.helpers.request({
							method: 'PUT',
							url: 'https://api.tableflow.tech/record',
							headers: {
								Authorization: `Bearer ${accessToken}`,
								Accept: 'application/json',
								'Content-Type': 'application/json',
							},
							body,
							json: true,
						});
					}
					// ✅ Case 2: Create (or CreateOrUpdate without recordId)
					else {
						// Load schema once & cache
						if (!schemaCache) {
							schemaCache = await this.helpers.request({
								method: 'GET',
								url: `https://api.tableflow.tech/app`,
								headers: {
									Authorization: `Bearer ${accessToken}`,
									Accept: 'application/json',
								},
								json: true,
							});
						}

						const table = schemaCache.Tablees?.[tableId];
						if (!table) {
							throw new Error(`Table with id ${tableId} not found in schema`);
						}

						const allColumns = table.Fields || [];
						const providedMap = new Map(fields.map((f) => [f.Name, f]));

						const fullFields = allColumns.map((col: any) => {
							if (providedMap.has(col.Name)) {
								return providedMap.get(col.Name);
							}
							return {
								Name: col.Name,
								Type: col.Type ?? 1,
								Value: null,
							};
						});

						const body = {
							TableId: tableId,
							Locked: false,
							Fields: fullFields,
						};

						response = await this.helpers.request({
							method: 'POST',
							url: 'https://api.tableflow.tech/record',
							headers: {
								Authorization: `Bearer ${accessToken}`,
								Accept: 'application/json',
								'Content-Type': 'application/json',
							},
							body,
							json: true,
						});
					}

					returnData.push({ json: response });
				}

				// ✅ Get Records
				if (resource === 'record' && operation === 'get') {
					const tableId = this.getNodeParameter('tableId', i) as string;
					const searchQuery = this.getNodeParameter('search', i, '') as string;
					const offset = this.getNodeParameter('offset', i, 0) as number;
					const count = this.getNodeParameter('count', i, 50) as number;
					const includeCount = this.getNodeParameter('includeCount', i, true) as boolean;

					const response = await this.helpers.request({
						method: 'GET',
						url: `https://api.tableflow.tech/record/search/${tableId}`,
						qs: {
							search: searchQuery,
							offset,
							count,
							includecount: includeCount,
						},
						headers: {
							Authorization: `Bearer ${accessToken}`,
							Accept: 'application/json',
						},
						json: true,
					});

					// returnData.push({ json: response });
					const headers = response.Headers.map((h: any) => h.Name);
					const rows = response.Rows.map((row: any) => {
						const obj: any = {};
						headers.forEach((col: string, idx: number) => {
							obj[col] = row.Values[idx];
						});
						return obj;
					});

					// 🔹 Push each row as a separate item
					for (const row of rows) {
						returnData.push({ json: row });
					}
				}
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
