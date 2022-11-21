import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	getTableColumns,
	getTableViews,
	rowExport,
	rowFormatColumns,
	rowMapKeyToName,
	seaTableApiRequest,
	setableApiRequestAllItems,
	split,
	updateAble,
} from './GenericFunctions';

import { rowFields, rowOperations } from './RowDescription';

import { TColumnsUiValues, TColumnValue } from './types';

import { ICtx, IRow, IRowObject } from './Interfaces';

export class SeaTable implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SeaTable',
		name: 'seaTable',
		icon: 'file:seaTable.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Consume the SeaTable API',
		defaults: {
			name: 'SeaTable',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'seaTableApi',
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
						name: 'Row',
						value: 'row',
					},
				],
				default: 'row',
			},
			...rowOperations,
			...rowFields,
		],
	};

	methods = {
		loadOptions: {
			async getTableNames(this: ILoadOptionsFunctions) {
				const returnData: INodePropertyOptions[] = [];
				const {
					metadata: { tables },
				} = await seaTableApiRequest.call(
					this,
					{},
					'GET',
					`/dtable-server/api/v1/dtables/{{dtable_uuid}}/metadata`,
				);
				for (const table of tables) {
					returnData.push({
						name: table.name,
						value: table.name,
					});
				}
				return returnData;
			},
			async getTableIds(this: ILoadOptionsFunctions) {
				const returnData: INodePropertyOptions[] = [];
				const {
					metadata: { tables },
				} = await seaTableApiRequest.call(
					this,
					{},
					'GET',
					`/dtable-server/api/v1/dtables/{{dtable_uuid}}/metadata`,
				);
				for (const table of tables) {
					returnData.push({
						name: table.name,
						value: table._id,
					});
				}
				return returnData;
			},

			async getTableUpdateAbleColumns(this: ILoadOptionsFunctions) {
				const tableName = this.getNodeParameter('tableName') as string;
				const columns = await getTableColumns.call(this, tableName);
				return columns
					.filter((column) => column.editable)
					.map((column) => ({ name: column.name, value: column.name }));
			},
			async getAllSortableColumns(this: ILoadOptionsFunctions) {
				const tableName = this.getNodeParameter('tableName') as string;
				const columns = await getTableColumns.call(this, tableName);
				return columns
					.filter(
						(column) =>
							!['file', 'image', 'url', 'collaborator', 'long-text'].includes(column.type),
					)
					.map((column) => ({ name: column.name, value: column.name }));
			},
			async getViews(this: ILoadOptionsFunctions) {
				const tableName = this.getNodeParameter('tableName') as string;
				const views = await getTableViews.call(this, tableName);
				return views.map((view) => ({ name: view.name, value: view.name }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const body: IDataObject = {};
		const qs: IDataObject = {};
		const ctx: ICtx = {};

		if (resource === 'row') {
			if (operation === 'create') {
				// ----------------------------------
				//         row:create
				// ----------------------------------

				const tableName = this.getNodeParameter('tableName', 0) as string;
				const tableColumns = await getTableColumns.call(this, tableName);

				body.table_name = tableName;

				const fieldsToSend = this.getNodeParameter('fieldsToSend', 0) as
					| 'defineBelow'
					| 'autoMapInputData';
				let rowInput: IRowObject = {};

				for (let i = 0; i < items.length; i++) {
					rowInput = {} as IRowObject;
					try {
						if (fieldsToSend === 'autoMapInputData') {
							const incomingKeys = Object.keys(items[i].json);
							const inputDataToIgnore = split(
								this.getNodeParameter('inputsToIgnore', i, '') as string,
							);
							for (const key of incomingKeys) {
								if (inputDataToIgnore.includes(key)) continue;
								rowInput[key] = items[i].json[key] as TColumnValue;
							}
						} else {
							const columns = this.getNodeParameter(
								'columnsUi.columnValues',
								i,
								[],
							) as TColumnsUiValues;
							for (const column of columns) {
								rowInput[column.columnName] = column.columnValue;
							}
						}
						body.row = rowExport(rowInput, updateAble(tableColumns));

						responseData = await seaTableApiRequest.call(
							this,
							ctx,
							'POST',
							`/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/`,
							body,
						);

						const { _id: insertId } = responseData;
						if (insertId === undefined) {
							throw new NodeOperationError(
								this.getNode(),
								'SeaTable: No identity after appending row.',
								{ itemIndex: i },
							);
						}

						const newRowInsertData = rowMapKeyToName(responseData, tableColumns);

						qs.table_name = tableName;
						qs.convert = true;
						const newRow = await seaTableApiRequest.call(
							this,
							ctx,
							'GET',
							`/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/${encodeURIComponent(insertId)}/`,
							body,
							qs,
						);

						if (newRow._id === undefined) {
							throw new NodeOperationError(
								this.getNode(),
								'SeaTable: No identity for appended row.',
								{ itemIndex: i },
							);
						}

						const row = rowFormatColumns(
							{ ...newRowInsertData, ...newRow },
							tableColumns.map(({ name }) => name).concat(['_id', '_ctime', '_mtime']),
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(row),
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
			} else if (operation === 'get') {
				for (let i = 0; i < items.length; i++) {
					try {
						const tableId = this.getNodeParameter('tableId', 0) as string;
						const rowId = this.getNodeParameter('rowId', i) as string;
						const response = (await seaTableApiRequest.call(
							this,
							ctx,
							'GET',
							`/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/${rowId}`,
							{},
							{ table_id: tableId, convert: true },
						)) as IDataObject;

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
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
			} else if (operation === 'getAll') {
				// ----------------------------------
				//         row:getAll
				// ----------------------------------

				const tableName = this.getNodeParameter('tableName', 0) as string;
				const tableColumns = await getTableColumns.call(this, tableName);

				for (let i = 0; i < items.length; i++) {
					try {
						const endpoint = `/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/`;
						qs.table_name = tableName;
						const filters = this.getNodeParameter('filters', i);
						const options = this.getNodeParameter('options', i);
						const returnAll = this.getNodeParameter('returnAll', 0);

						Object.assign(qs, filters, options);

						if (qs.convert_link_id === false) {
							delete qs.convert_link_id;
						}

						if (returnAll) {
							responseData = await setableApiRequestAllItems.call(
								this,
								ctx,
								'rows',
								'GET',
								endpoint,
								body,
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await seaTableApiRequest.call(this, ctx, 'GET', endpoint, body, qs);
							responseData = responseData.rows;
						}

						const rows = responseData.map((row: IRow) =>
							rowFormatColumns(
								{ ...row },
								tableColumns.map(({ name }) => name).concat(['_id', '_ctime', '_mtime']),
							),
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(rows),
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
						}
						throw error;
					}
				}
			} else if (operation === 'delete') {
				for (let i = 0; i < items.length; i++) {
					try {
						const tableName = this.getNodeParameter('tableName', 0) as string;
						const rowId = this.getNodeParameter('rowId', i) as string;
						const body: IDataObject = {
							table_name: tableName,
							row_id: rowId,
						};
						const response = (await seaTableApiRequest.call(
							this,
							ctx,
							'DELETE',
							`/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/`,
							body,
							qs,
						)) as IDataObject;

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
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
			} else if (operation === 'update') {
				// ----------------------------------
				//         row:update
				// ----------------------------------

				const tableName = this.getNodeParameter('tableName', 0) as string;
				const tableColumns = await getTableColumns.call(this, tableName);

				body.table_name = tableName;

				const fieldsToSend = this.getNodeParameter('fieldsToSend', 0) as
					| 'defineBelow'
					| 'autoMapInputData';
				let rowInput: IRowObject = {};

				for (let i = 0; i < items.length; i++) {
					const rowId = this.getNodeParameter('rowId', i) as string;
					rowInput = {} as IRowObject;
					try {
						if (fieldsToSend === 'autoMapInputData') {
							const incomingKeys = Object.keys(items[i].json);
							const inputDataToIgnore = split(
								this.getNodeParameter('inputsToIgnore', i, '') as string,
							);
							for (const key of incomingKeys) {
								if (inputDataToIgnore.includes(key)) continue;
								rowInput[key] = items[i].json[key] as TColumnValue;
							}
						} else {
							const columns = this.getNodeParameter(
								'columnsUi.columnValues',
								i,
								[],
							) as TColumnsUiValues;
							for (const column of columns) {
								rowInput[column.columnName] = column.columnValue;
							}
						}
						body.row = rowExport(rowInput, updateAble(tableColumns));
						body.table_name = tableName;
						body.row_id = rowId;
						responseData = await seaTableApiRequest.call(
							this,
							ctx,
							'PUT',
							`/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/`,
							body,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ _id: rowId, ...responseData }),
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
			} else {
				throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
			}
		}
		return this.prepareOutputData(returnData);
	}
}
