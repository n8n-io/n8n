import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	microsoftApiRequest,
	microsoftApiRequestAllItems,
	microsoftApiRequestAllItemsSkip,
} from './GenericFunctions';

import { workbookFields, workbookOperations } from './WorkbookDescription';

import { worksheetFields, worksheetOperations } from './WorksheetDescription';

import { tableFields, tableOperations } from './TableDescription';

export class MicrosoftExcel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Excel',
		name: 'microsoftExcel',
		icon: 'file:excel.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Microsoft Excel API',
		defaults: {
			name: 'Microsoft Excel',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftExcelOAuth2Api',
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
						name: 'Table',
						value: 'table',
						description: 'Represents an Excel table',
					},
					{
						name: 'Workbook',
						value: 'workbook',
						description:
							'Workbook is the top level object which contains related workbook objects such as worksheets, tables, ranges, etc',
					},
					{
						name: 'Worksheet',
						value: 'worksheet',
						description:
							'An Excel worksheet is a grid of cells. It can contain data, tables, charts, etc.',
					},
				],
				default: 'workbook',
			},
			...workbookOperations,
			...workbookFields,
			...worksheetOperations,
			...worksheetFields,
			...tableOperations,
			...tableFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the workbooks to display them to user so that he can
			// select them easily
			async getWorkbooks(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const qs: IDataObject = {
					select: 'id,name',
				};
				const returnData: INodePropertyOptions[] = [];
				const workbooks = await microsoftApiRequestAllItems.call(
					this,
					'value',
					'GET',
					`/drive/root/search(q='.xlsx')`,
					{},
					qs,
				);
				for (const workbook of workbooks) {
					const workbookName = workbook.name;
					const workbookId = workbook.id;
					returnData.push({
						name: workbookName,
						value: workbookId,
					});
				}
				return returnData;
			},
			// Get all the worksheets to display them to user so that he can
			// select them easily
			async getworksheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workbookId = this.getCurrentNodeParameter('workbook');
				const qs: IDataObject = {
					select: 'id,name',
				};
				const returnData: INodePropertyOptions[] = [];
				const worksheets = await microsoftApiRequestAllItems.call(
					this,
					'value',
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets`,
					{},
					qs,
				);
				for (const worksheet of worksheets) {
					const worksheetName = worksheet.name;
					const worksheetId = worksheet.id;
					returnData.push({
						name: worksheetName,
						value: worksheetId,
					});
				}
				return returnData;
			},
			// Get all the tables to display them to user so that he can
			// select them easily
			async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workbookId = this.getCurrentNodeParameter('workbook');
				const worksheetId = this.getCurrentNodeParameter('worksheet');
				const qs: IDataObject = {
					select: 'id,name',
				};
				const returnData: INodePropertyOptions[] = [];
				const tables = await microsoftApiRequestAllItems.call(
					this,
					'value',
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables`,
					{},
					qs,
				);
				for (const table of tables) {
					const tableName = table.name;
					const tableId = table.id;
					returnData.push({
						name: tableName,
						value: tableId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let qs: IDataObject = {};
		const result: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (resource === 'table') {
			//https://docs.microsoft.com/en-us/graph/api/table-post-rows?view=graph-rest-1.0&tabs=http
			if (operation === 'addRow') {
				try {
					// TODO: At some point it should be possible to use item dependent parameters.
					//       Is however important to then not make one separate request each.
					const workbookId = this.getNodeParameter('workbook', 0) as string;
					const worksheetId = this.getNodeParameter('worksheet', 0) as string;
					const tableId = this.getNodeParameter('table', 0) as string;
					const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
					const body: IDataObject = {};

					if (additionalFields.index) {
						body.index = additionalFields.index as number;
					}

					// Get table columns to eliminate any columns not needed on the input
					responseData = await microsoftApiRequest.call(
						this,
						'GET',
						`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
						{},
						qs,
					);
					const columns = responseData.value.map((column: IDataObject) => column.name);

					const rows: any[][] = []; // tslint:disable-line:no-any

					// Bring the items into the correct format
					for (const item of items) {
						const row = [];
						for (const column of columns) {
							row.push(item.json[column]);
						}
						rows.push(row);
					}

					body.values = rows;
					const { id } = await microsoftApiRequest.call(
						this,
						'POST',
						`/drive/items/${workbookId}/workbook/createSession`,
						{ persistChanges: true },
					);
					responseData = await microsoftApiRequest.call(
						this,
						'POST',
						`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows/add`,
						body,
						{},
						'',
						{ 'workbook-session-id': id },
					);
					await microsoftApiRequest.call(
						this,
						'POST',
						`/drive/items/${workbookId}/workbook/closeSession`,
						{},
						{},
						'',
						{ 'workbook-session-id': id },
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: 0 } },
					);

					returnData.push(...executionData);
				} catch (error) {
					if (this.continueOnFail()) {
						const executionErrorData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ error: error.message }),
							{ itemData: { item: 0 } },
						);
						returnData.push(...executionErrorData);
					} else {
						throw error;
					}
				}
			}
			//https://docs.microsoft.com/en-us/graph/api/table-list-columns?view=graph-rest-1.0&tabs=http
			if (operation === 'getColumns') {
				for (let i = 0; i < length; i++) {
					try {
						qs = {};
						const workbookId = this.getNodeParameter('workbook', i) as string;
						const worksheetId = this.getNodeParameter('worksheet', i) as string;
						const tableId = this.getNodeParameter('table', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const rawData = this.getNodeParameter('rawData', i) as boolean;
						if (rawData) {
							const filters = this.getNodeParameter('filters', i) as IDataObject;
							if (filters.fields) {
								qs['$select'] = filters.fields;
							}
						}
						if (returnAll === true) {
							responseData = await microsoftApiRequestAllItemsSkip.call(
								this,
								'value',
								'GET',
								`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
								{},
								qs,
							);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i) as number;
							responseData = await microsoftApiRequest.call(
								this,
								'GET',
								`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
								{},
								qs,
							);
							responseData = responseData.value;
						}
						if (!rawData) {
							responseData = responseData.map((column: IDataObject) => ({ name: column.name }));
						} else {
							const dataProperty = this.getNodeParameter('dataProperty', i) as string;
							responseData = { [dataProperty]: responseData };
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.message }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
			}
			//https://docs.microsoft.com/en-us/graph/api/table-list-rows?view=graph-rest-1.0&tabs=http
			if (operation === 'getRows') {
				for (let i = 0; i < length; i++) {
					qs = {};
					try {
						const workbookId = this.getNodeParameter('workbook', i) as string;
						const worksheetId = this.getNodeParameter('worksheet', i) as string;
						const tableId = this.getNodeParameter('table', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const rawData = this.getNodeParameter('rawData', i) as boolean;
						if (rawData) {
							const filters = this.getNodeParameter('filters', i) as IDataObject;
							if (filters.fields) {
								qs['$select'] = filters.fields;
							}
						}
						if (returnAll === true) {
							responseData = await microsoftApiRequestAllItemsSkip.call(
								this,
								'value',
								'GET',
								`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows`,
								{},
								qs,
							);
						} else {
							const rowsQs = { ...qs };
							rowsQs['$top'] = this.getNodeParameter('limit', i) as number;
							responseData = await microsoftApiRequest.call(
								this,
								'GET',
								`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows`,
								{},
								rowsQs,
							);
							responseData = responseData.value;
						}
						if (!rawData) {
							const columnsQs = { ...qs };
							columnsQs['$select'] = 'name';
							// TODO: That should probably be cached in the future
							let columns = await microsoftApiRequestAllItemsSkip.call(
								this,
								'value',
								'GET',
								`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
								{},
								columnsQs,
							);
							//@ts-ignore
							columns = columns.map((column) => column.name);
							for (let i = 0; i < responseData.length; i++) {
								const object: IDataObject = {};
								for (let y = 0; y < columns.length; y++) {
									object[columns[y]] = responseData[i].values[0][y];
								}
								const executionData = this.helpers.constructExecutionMetaData(
									this.helpers.returnJsonArray({ ...object }),
									{ itemData: { item: i } },
								);

								returnData.push(...executionData);
							}
						} else {
							const dataProperty = this.getNodeParameter('dataProperty', i) as string;
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ [dataProperty]: responseData }),
								{ itemData: { item: i } },
							);

							returnData.push(...executionData);
						}
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.message }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
			}
			if (operation === 'lookup') {
				for (let i = 0; i < length; i++) {
					qs = {};
					try {
						const workbookId = this.getNodeParameter('workbook', i) as string;
						const worksheetId = this.getNodeParameter('worksheet', i) as string;
						const tableId = this.getNodeParameter('table', i) as string;
						const lookupColumn = this.getNodeParameter('lookupColumn', i) as string;
						const lookupValue = this.getNodeParameter('lookupValue', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						responseData = await microsoftApiRequestAllItemsSkip.call(
							this,
							'value',
							'GET',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows`,
							{},
							{},
						);

						qs['$select'] = 'name';
						// TODO: That should probably be cached in the future
						let columns = await microsoftApiRequestAllItemsSkip.call(
							this,
							'value',
							'GET',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
							{},
							qs,
						);
						columns = columns.map((column: IDataObject) => column.name);

						if (!columns.includes(lookupColumn)) {
							throw new NodeApiError(this.getNode(), responseData, {
								message: `Column ${lookupColumn} does not exist on the table selected`,
							});
						}

						result.length = 0;
						for (let i = 0; i < responseData.length; i++) {
							const object: IDataObject = {};
							for (let y = 0; y < columns.length; y++) {
								object[columns[y]] = responseData[i].values[0][y];
							}
							result.push({ ...object });
						}

						if (options.returnAllMatches) {
							responseData = result.filter((data: IDataObject) => {
								return data[lookupColumn]?.toString() === lookupValue;
							});
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData),
								{ itemData: { item: i } },
							);

							returnData.push(...executionData);
						} else {
							responseData = result.find((data: IDataObject) => {
								return data[lookupColumn]?.toString() === lookupValue;
							});
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData as IDataObject),
								{ itemData: { item: i } },
							);

							returnData.push(...executionData);
						}
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.message }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
			}
		}
		if (resource === 'workbook') {
			for (let i = 0; i < length; i++) {
				qs = {};
				try {
					//https://docs.microsoft.com/en-us/graph/api/worksheetcollection-add?view=graph-rest-1.0&tabs=http
					if (operation === 'addWorksheet') {
						const workbookId = this.getNodeParameter('workbook', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {};
						if (additionalFields.name) {
							body.name = additionalFields.name;
						}
						const { id } = await microsoftApiRequest.call(
							this,
							'POST',
							`/drive/items/${workbookId}/workbook/createSession`,
							{ persistChanges: true },
						);
						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/drive/items/${workbookId}/workbook/worksheets/add`,
							body,
							{},
							'',
							{ 'workbook-session-id': id },
						);
						await microsoftApiRequest.call(
							this,
							'POST',
							`/drive/items/${workbookId}/workbook/closeSession`,
							{},
							{},
							'',
							{ 'workbook-session-id': id },
						);
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						if (filters.fields) {
							qs['$select'] = filters.fields;
						}
						if (returnAll === true) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								`/drive/root/search(q='.xlsx')`,
								{},
								qs,
							);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i) as number;
							responseData = await microsoftApiRequest.call(
								this,
								'GET',
								`/drive/root/search(q='.xlsx')`,
								{},
								qs,
							);
							responseData = responseData.value;
						}
					}

					if (Array.isArray(responseData)) {
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					} else if (responseData !== undefined) {
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
				} catch (error) {
					if (this.continueOnFail()) {
						const executionErrorData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ error: error.message }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionErrorData);
						continue;
					}
					throw error;
				}
			}
		}
		if (resource === 'worksheet') {
			for (let i = 0; i < length; i++) {
				qs = {};
				try {
					//https://docs.microsoft.com/en-us/graph/api/workbook-list-worksheets?view=graph-rest-1.0&tabs=http
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const workbookId = this.getNodeParameter('workbook', i) as string;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						if (filters.fields) {
							qs['$select'] = filters.fields;
						}
						if (returnAll === true) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								`/drive/items/${workbookId}/workbook/worksheets`,
								{},
								qs,
							);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i) as number;
							responseData = await microsoftApiRequest.call(
								this,
								'GET',
								`/drive/items/${workbookId}/workbook/worksheets`,
								{},
								qs,
							);
							responseData = responseData.value;
						}
					}
					//https://docs.microsoft.com/en-us/graph/api/worksheet-range?view=graph-rest-1.0&tabs=http
					if (operation === 'getContent') {
						const workbookId = this.getNodeParameter('workbook', i) as string;
						const worksheetId = this.getNodeParameter('worksheet', i) as string;
						const range = this.getNodeParameter('range', i) as string;
						const rawData = this.getNodeParameter('rawData', i) as boolean;
						if (rawData) {
							const filters = this.getNodeParameter('filters', i) as IDataObject;
							if (filters.fields) {
								qs['$select'] = filters.fields;
							}
						}

						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
							{},
							qs,
						);

						if (!rawData) {
							const keyRow = this.getNodeParameter('keyRow', i) as number;
							const dataStartRow = this.getNodeParameter('dataStartRow', i) as number;
							if (responseData.values === null) {
								throw new NodeApiError(this.getNode(), responseData, {
									message: 'Range did not return data',
								});
							}
							const keyValues = responseData.values[keyRow];
							for (let i = dataStartRow; i < responseData.values.length; i++) {
								const object: IDataObject = {};
								for (let y = 0; y < keyValues.length; y++) {
									object[keyValues[y]] = responseData.values[i][y];
								}
								const executionData = this.helpers.constructExecutionMetaData(
									this.helpers.returnJsonArray({ ...object }),
									{ itemData: { item: i } },
								);

								returnData.push(...executionData);
							}
						} else {
							const dataProperty = this.getNodeParameter('dataProperty', i) as string;
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ [dataProperty]: responseData }),
								{ itemData: { item: i } },
							);

							returnData.push(...executionData);
						}
					}
				} catch (error) {
					if (this.continueOnFail()) {
						const executionErrorData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ error: error.message }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionErrorData);
						continue;
					}
					throw error;
				}
			}
		}

		return this.prepareOutputData(returnData);
	}
}
