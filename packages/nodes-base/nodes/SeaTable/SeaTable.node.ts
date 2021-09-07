import {IExecuteFunctions} from 'n8n-core';

import {
		IDataObject,
		ILoadOptionsFunctions,
		INodeExecutionData,
		INodeType,
		INodeTypeDescription,
		NodeOperationError,
} from 'n8n-workflow';

import {
		apiDtableColumns,
		apiMetadata,
		apiRequest,
		apiRequestAllItems,
		columnNamesGlob,
		columnNamesToArray,
		dtableSchemaColumns,
		getTableNames,
		nameOfPredicate,
		rowDeleteInternalColumns,
		rowExport,
		rowFormatColumns,
		rowMapKeyToName,
		rowsFormatColumns,
		split,
		toOptions,
		updateAble,
} from './GenericFunctions';

import {operationFields} from './OperationDescription';
import {TColumnsUiValues, TColumnValue, TDeferredEndpoint, TMethod, TOperation} from './types';
import {ICtx, IRow, IRowObject} from './Interfaces';

export class SeaTable implements INodeType {
		description: INodeTypeDescription = {
				displayName: 'SeaTable',
				name: 'seatable',
				icon: 'file:seaTable.svg',
				group: ['input'],
				version: 1,
				// nodelinter-ignore-next-line NON_STANDARD_SUBTITLE
				subtitle: '={{$parameter["operation"] + ": " + $parameter["table"]}}',
				description: 'Read, update, write and delete data from SeaTable',
				defaults: {
						// nodelinter-ignore-next-line PARAM_DESCRIPTION_MISSING_WHERE_OPTIONAL
						name: 'SeaTable',
						color: '#FF8000',
				},
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
						{
								// nodelinter-ignore-next-line PARAM_DESCRIPTION_MISSING_WHERE_OPTIONAL
								name: 'seatableApi',
								required: true,
						},
				],
				properties: [
						{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
										{
												name: 'Append',
												value: 'append',
												description: 'Append data as new rows to a SeaTable table',
										},
										{
												name: 'List',
												value: 'list',
												description: 'Obtain all rows of a SeaTable table',
										},
										{
												name: 'Metadata',
												value: 'metadata',
												description: 'Obtain metadata of a SeaTable base or table',
										},
								],
								default: 'metadata',
								description: 'The operation being performed',
						},
						...operationFields,
				],
		};

		methods = {
				loadOptions: {
						async getTableNames(this: ILoadOptionsFunctions) {
								return await getTableNames.call(this);
						},

						async getTableUpdateAbleColumns(this: ILoadOptionsFunctions) {
								const tableName = this.getNodeParameter('tableName', undefined);
								if (undefined === tableName) return [];
								const columns = await apiDtableColumns.call(this, undefined, tableName as string);
								return toOptions(updateAble(columns));
						},
				},
		};

		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();
				const returnData: IDataObject[] = [];
				let responseData;

				const operation = this.getNodeParameter('operation', 0) as TOperation;

				const ctx: ICtx = {} as ICtx;
				let requestMethod: TMethod = 'GET';

				const body: IDataObject = {};
				const qs: IDataObject = {};

				if (operation === 'append') {
						// ----------------------------------
						//         append
						// ----------------------------------

						const tableName = this.getNodeParameter('tableName', 0) as string;
						const tableColumns = await apiDtableColumns.call(this, ctx, tableName);

						body.table_name = tableName;

						const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData';
						let rowInput: IRowObject = {};

						for (let i = 0; i < items.length; i++) {
								rowInput = {} as IRowObject;
								try {
										if (dataToSend === 'autoMapInputData') {
												const incomingKeys = Object.keys(items[i].json);
												const inputDataToIgnore = split(this.getNodeParameter('inputsToIgnore', i, '') as string);
												for (const key of incomingKeys) {
														if (inputDataToIgnore.includes(key)) continue;
														rowInput[key] = items[i].json[key] as TColumnValue;
												}
										} else {
												const columns = this.getNodeParameter('columnsUi.columnValues', i, []) as TColumnsUiValues;
												for (const column of columns) {
														rowInput[column.columnName] = column.columnValue;
												}
										}
										body.row = rowExport(rowInput, updateAble(tableColumns));

										responseData = await apiRequest.call(this, ctx, 'POST', '/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/', body);
										const {_id: insertId} = responseData;
										if (insertId === undefined) {
												throw new NodeOperationError(this.getNode(), 'SeaTable: No identity after appending row.');
										}
										const newRowInsertData = rowMapKeyToName(responseData, tableColumns);

										qs.table_name = tableName;
										qs.convert = true;
										const newRow = await apiRequest.call(this, ctx, 'GET', `/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/${encodeURIComponent(insertId)}/` as TDeferredEndpoint, body, qs) as unknown as IRow;
										if (newRow._id === undefined) {
												throw new NodeOperationError(this.getNode(), 'SeaTable: No identity for appended row.');
										}
										const row = rowFormatColumns({...newRowInsertData, ...newRow}, tableColumns.map(({name}) => name));
										returnData.push(rowDeleteInternalColumns(row));
								} catch (error) {
										if (this.continueOnFail()) {
												returnData.push({json: {error: error.message}});
												continue;
										}
										throw error;
								}
						}
				} else if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------

						const tableName = this.getNodeParameter('tableName', 0) as string;

						const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;

						try {
								const dtableColumns = await apiDtableColumns.call(this, ctx, tableName);

								requestMethod = 'GET';
								const endpoint = '/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/';
								qs.table_name = tableName;
								const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

								if (returnAll) {
										responseData = await apiRequestAllItems.call(this, ctx, requestMethod, endpoint, body, qs);
								} else {
										qs.limit = this.getNodeParameter('limit', 0) as number;
										responseData = await apiRequest.call(this, ctx, requestMethod, endpoint, body, qs);
								}

								let columnNames = columnNamesToArray(additionalFields.columnNames as string);
								columnNames = columnNamesGlob(columnNames, dtableColumns);
								const [{name: defaultColumn}] = dtableColumns;
								columnNames = [
										defaultColumn,
										...columnNames,
								].filter(nameOfPredicate(dtableColumns));

								rowsFormatColumns(responseData, columnNames);

								returnData.push(...responseData.rows);
						} catch (error) {
								if (this.continueOnFail()) {
										returnData.push({json: {error: error.message}});
								}
								throw error;
						}
				} else if (operation === 'metadata') {
						// ----------------------------------
						//         metadata
						// ----------------------------------

						try {
								const tableName = this.getNodeParameter('tableName', 0) as string;
								const metaData = await apiMetadata.call(this, ctx);
								let {tables} = metaData;
								const tableNameIndex = tables.findIndex(({name}) => name === tableName);
								if (tableNameIndex > -1) {
										tables = [tables[tableNameIndex]];
								}
								const result = tables.map(({name, columns}) => (
									{name, columns: dtableSchemaColumns(columns).map(({name}) => name).join(', ')}
								)) as unknown as IDataObject[];

								returnData.push(...result);
						} catch (error) {
								if (this.continueOnFail()) {
										returnData.push({json: {error: error.message}});
								}
								throw error;
						}
				} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
				}

				return [this.helpers.returnJsonArray(returnData)];
		}
}
