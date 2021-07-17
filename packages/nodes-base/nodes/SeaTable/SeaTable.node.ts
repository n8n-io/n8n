import {IExecuteFunctions} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError} from 'n8n-workflow';

import {
		apiDtableColumns,
		apiMetadata,
		apiRequest,
		apiRequestAllItems,
		columnNamesToArray,
		dtableSchemaIsColumn,
		ICtx,
		IDtableMetadataColumn,
		IRow,
		rowDeleteInternalColumns,
		rowFormatColumns,
		rowMapColumnsFromKeysToNames,
		rowsFormatColumns,
} from './GenericFunctions';

export class SeaTable implements INodeType {
		description: INodeTypeDescription = {
				displayName: 'SeaTable',
				name: 'seatable',
				icon: 'file:seaTable.svg',
				group: ['input'],
				version: 1,
				description: 'Read, update, write and delete data from SeaTable',
				defaults: {
						name: 'SeaTable',
						color: '#FF8000',
				},
				inputs: ['main'],
				outputs: ['main'],
				credentials: [
						{
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
								description: 'The operation to perform.',
						},

						// ----------------------------------
						//         All
						// ----------------------------------
						{
								displayName: 'Table',
								name: 'table',
								type: 'string',
								default: '',
								placeholder: 'Name of table',
								required: true,
								description: 'The name of SeaTable table to access.',
						},

						// ----------------------------------
						//         list
						// ----------------------------------
						{
								displayName: 'Return All',
								name: 'returnAll',
								type: 'boolean',
								displayOptions: {
										show: {
												operation: [
														'list',
												],
										},
								},
								default: true,
								description: 'If all rows should be returned or only up to a given limit.',
						},
						{
								displayName: 'Limit',
								name: 'limit',
								type: 'number',
								displayOptions: {
										show: {
												operation: [
														'list',
												],
												returnAll: [
														false,
												],
										},
								},
								typeOptions: {
										minValue: 1,
										maxValue: 100,
								},
								default: 100,
								description: 'Number of rows to return.',
						},
						{
								displayName: 'Additional Fields',
								name: 'additionalFields',
								type: 'collection',
								placeholder: 'Add Field',
								displayOptions: {
										show: {
												operation: [
														'list',
												],
										},
								},
								default: {},
								options: [
										{
												displayName: 'Columns:',
												name: 'columnNames',
												type: 'string',
												default: '',
												description: `Additional columns to be included in the response. <br><br>By default the standard (always first) column is returned, this field allows to add one or more additional fields.<br><br>
																			<ul><li>Multiple ones can be set separated by comma. Example: <samp>Title,Surname</samp>.<br>`,
										},
								],
						},
				],
		};

		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();
				const returnData: IDataObject[] = [];
				let responseData;

				const operation = this.getNodeParameter('operation', 0) as string;

				const ctx = {} as ICtx;
				let requestMethod = '';

				const body: IDataObject = {};
				const qs: IDataObject = {};

				if (operation === 'append') {
						// ----------------------------------
						//         append
						// ----------------------------------

						const tableName = this.getNodeParameter('table', 0) as string;
						body.table_name = tableName;

						for (let i = 0; i < items.length; i++) {
								const dtableColumns = await apiDtableColumns.call(this, ctx, tableName);
								body.row = items[i].json as unknown as {};

								responseData = await apiRequest.call(this, ctx, 'POST', '/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/', body);
								const {_id: insertId} = responseData;
								if (insertId === undefined) {
										throw new NodeOperationError(this.getNode(), 'SeaTable: No identity after appending row.');
								}
								const newRowInsertData = rowMapColumnsFromKeysToNames(responseData, dtableColumns);

								qs.table_name = tableName;
								qs.convert = true;
								const newRow = await apiRequest.call(this, ctx, 'GET', `/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/${encodeURIComponent(insertId)}/`, body, qs) as unknown as IRow;
								if (newRow._id === undefined) {
										throw new NodeOperationError(this.getNode(), 'SeaTable: No identity for inserted row.');
								}
								const row = rowFormatColumns({...newRowInsertData, ...newRow}, dtableColumns.map($ => $.name));
								returnData.push(rowDeleteInternalColumns(row));
						}
				} else if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------

						const tableName = this.getNodeParameter('table', 0) as string;

						const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;

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
						const [{name: defaultColumn}] = dtableColumns;
						columnNames = [defaultColumn, ...columnNames].filter((name) => dtableColumns.find((column) => column.name === name));

						rowsFormatColumns(responseData, columnNames);

						returnData.push(...responseData.rows);
				} else if (operation === 'metadata') {
						// ----------------------------------
						//         metadata
						// ----------------------------------

						const tableName = this.getNodeParameter('table', 0) as string;
						const metaData = await apiMetadata.call(this, ctx);
						let {tables} = metaData;
						const tableNameIndex = tables.findIndex($ => $.name === tableName);
						if (tableNameIndex > -1) {
								tables = [tables[tableNameIndex]];
						}
						const result = tables.map(($) => {
								const table = {} as { name: string, columns: string | string[] | IDtableMetadataColumn[] };
								table.name = $.name;
								table.columns = $.columns.filter(dtableSchemaIsColumn);
								table.columns = table.columns.map($1 => $1.name).join(', ');
								return table;
						}) as unknown as IDataObject[];

						returnData.push(...result);
				} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
				}

				return [this.helpers.returnJsonArray(returnData)];
		}
}
