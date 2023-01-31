import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	microsoftApiRequest,
	microsoftApiRequestAllItems,
	microsoftApiRequestAllItemsSkip,
	prepareOutput,
} from './GenericFunctions';

import { workbookFields, workbookOperations } from './WorkbookDescription';

import { worksheetFields, worksheetOperations } from './WorksheetDescription';

import { tableFields, tableOperations } from './TableDescription';
import { processJsonInput } from '../../../utils/utilities';

export class MicrosoftExcel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Excel 365',
		name: 'microsoftExcel',
		icon: 'file:excel.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Microsoft Excel API',
		defaults: {
			name: 'Microsoft Excel 365',
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
				displayName:
					'This node connects to the Microsoft 365 cloud platform. Use the \'Spreadsheet File\' node to directly manipulate spreadsheet files (.xls, .csv, etc). <a href="/templates/890" target="_blank">More info</a>.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
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
						description: 'A workbook is the top level object which contains one or more worksheets',
					},
					{
						name: 'Worksheet',
						value: 'worksheet',
						description:
							'A worksheet is a grid of cells which can contain data, tables, charts, etc',
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
		listSearch: {
			async searchWorkbooks(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const q = filter ? encodeURI(`.xlsx AND ${filter}`) : '.xlsx';

				let response: IDataObject = {};

				if (paginationToken) {
					response = await microsoftApiRequest.call(
						this,
						'GET',
						'',
						undefined,
						undefined,
						paginationToken, // paginationToken contains the full URL
					);
				} else {
					response = await microsoftApiRequest.call(
						this,
						'GET',
						`/drive/root/search(q='${q}')`,
						undefined,
						{
							select: 'id,name,webUrl',
							$top: 100,
						},
					);
				}

				return {
					results: (response.value as IDataObject[]).map((workbook: IDataObject) => ({
						name: (workbook.name as string).replace('.xlsx', ''),
						value: workbook.id as string,
						url: workbook.webUrl as string,
					})),
					paginationToken: response['@odata.nextLink'],
				};
			},

			async getWorksheetsList(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const workbookRLC = this.getNodeParameter('workbook') as IDataObject;
				const workbookId = workbookRLC.value as string;
				let workbookURL = workbookRLC.cachedResultUrl as string;

				if (workbookURL.includes('1drv.ms')) {
					workbookURL = `https://onedrive.live.com/edit.aspx?resid=${workbookId}`;
				}

				let response: IDataObject = {};

				response = await microsoftApiRequest.call(
					this,
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets`,
					undefined,
					{
						select: 'id,name',
					},
				);

				return {
					results: (response.value as IDataObject[]).map((worksheet: IDataObject) => ({
						name: worksheet.name as string,
						value: worksheet.id as string,
						url: `${workbookURL}&activeCell=${encodeURIComponent(worksheet.name as string)}!A1`,
					})),
				};
			},

			async getWorksheetTables(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const workbookRLC = this.getNodeParameter('workbook') as IDataObject;
				const workbookId = workbookRLC.value as string;
				let workbookURL = workbookRLC.cachedResultUrl as string;

				if (workbookURL.includes('1drv.ms')) {
					workbookURL = `https://onedrive.live.com/edit.aspx?resid=${workbookId}`;
				}

				const worksheetId = this.getNodeParameter('worksheet', undefined, {
					extractValue: true,
				}) as string;

				let response: IDataObject = {};

				response = await microsoftApiRequest.call(
					this,
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables`,
					undefined,
				);

				const results: INodeListSearchItems[] = [];

				for (const table of response.value as IDataObject[]) {
					const name = table.name as string;
					const value = table.id as string;

					const { address } = await microsoftApiRequest.call(
						this,
						'GET',
						`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${value}/range`,
						undefined,
						{
							select: 'address',
						},
					);

					const [sheetName, sheetRange] = address.split('!' as string);

					const url = `${workbookURL}&activeCell=${encodeURIComponent(sheetName)}${
						sheetRange ? ':' + (sheetRange as string) : ''
					}`;

					results.push({ name, value, url });
				}

				return { results };
			},
		},
		loadOptions: {},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let qs: IDataObject = {};
		const result: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		if (resource === 'table') {
			//https://docs.microsoft.com/en-us/graph/api/table-post-rows?view=graph-rest-1.0&tabs=http
			if (operation === 'addRow') {
				try {
					// TODO: At some point it should be possible to use item dependent parameters.
					//       Is however important to then not make one separate request each.
					const workbookId = this.getNodeParameter('workbook', 0, undefined, {
						extractValue: true,
					}) as string;

					const worksheetId = this.getNodeParameter('worksheet', 0, undefined, {
						extractValue: true,
					}) as string;

					const tableId = this.getNodeParameter('table', 0, undefined, {
						extractValue: true,
					}) as string;

					const additionalFields = this.getNodeParameter('additionalFields', 0);
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

					const rows: any[][] = [];

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
			//https://learn.microsoft.com/en-us/graph/api/worksheet-post-tables?view=graph-rest-1.0
			if (operation === 'addTable') {
				for (let i = 0; i < length; i++) {
					try {
						const workbookId = this.getNodeParameter('workbook', i, undefined, {
							extractValue: true,
						}) as string;

						const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
							extractValue: true,
						}) as string;

						const selectRange = this.getNodeParameter('selectRange', i) as string;

						const hasHeaders = this.getNodeParameter('hasHeaders', i) as boolean;

						let range = '';
						if (selectRange === 'auto') {
							const { address } = await microsoftApiRequest.call(
								this,
								'GET',
								`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/usedRange`,
								undefined,
								{
									select: 'address',
								},
							);
							range = address.split('!')[1];
						} else {
							range = this.getNodeParameter('range', i) as string;
						}

						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/add`,
							{
								address: range,
								hasHeaders,
							},
						);

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
			if (operation === 'delete') {
				for (let i = 0; i < length; i++) {
					try {
						const workbookId = this.getNodeParameter('workbook', i, undefined, {
							extractValue: true,
						}) as string;

						const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
							extractValue: true,
						}) as string;

						const tableId = this.getNodeParameter('table', i, undefined, {
							extractValue: true,
						}) as string;

						await microsoftApiRequest.call(
							this,
							'DELETE',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}`,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: true }),
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
			if (operation === 'convertToRange') {
				for (let i = 0; i < length; i++) {
					try {
						const workbookId = this.getNodeParameter('workbook', i, undefined, {
							extractValue: true,
						}) as string;

						const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
							extractValue: true,
						}) as string;

						const tableId = this.getNodeParameter('table', i, undefined, {
							extractValue: true,
						}) as string;

						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/convertToRange`,
						);

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
			//https://docs.microsoft.com/en-us/graph/api/table-list-columns?view=graph-rest-1.0&tabs=http
			if (operation === 'getColumns') {
				for (let i = 0; i < length; i++) {
					try {
						qs = {};
						const workbookId = this.getNodeParameter('workbook', i, undefined, {
							extractValue: true,
						}) as string;

						const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
							extractValue: true,
						}) as string;

						const tableId = this.getNodeParameter('table', i, undefined, {
							extractValue: true,
						}) as string;

						const returnAll = this.getNodeParameter('returnAll', i);
						const rawData = this.getNodeParameter('rawData', i);
						if (rawData) {
							const filters = this.getNodeParameter('filters', i);
							if (filters.fields) {
								qs.$select = filters.fields;
							}
						}
						if (returnAll) {
							responseData = await microsoftApiRequestAllItemsSkip.call(
								this,
								'value',
								'GET',
								`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
								{},
								qs,
							);
						} else {
							qs.$top = this.getNodeParameter('limit', i);
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
						const workbookId = this.getNodeParameter('workbook', i, undefined, {
							extractValue: true,
						}) as string;

						const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
							extractValue: true,
						}) as string;

						const tableId = this.getNodeParameter('table', i, undefined, {
							extractValue: true,
						}) as string;

						const returnAll = this.getNodeParameter('returnAll', i);
						const rawData = this.getNodeParameter('rawData', i);
						if (rawData) {
							const filters = this.getNodeParameter('filters', i);
							if (filters.fields) {
								qs.$select = filters.fields;
							}
						}
						if (returnAll) {
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
							rowsQs.$top = this.getNodeParameter('limit', i);
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
							columnsQs.$select = 'name';
							// TODO: That should probably be cached in the future
							let columns = await microsoftApiRequestAllItemsSkip.call(
								this,
								'value',
								'GET',
								`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
								{},
								columnsQs,
							);

							columns = (columns as IDataObject[]).map((column) => column.name);
							for (let index = 0; index < responseData.length; index++) {
								const object: IDataObject = {};
								for (let y = 0; y < columns.length; y++) {
									object[columns[y]] = responseData[index].values[0][y];
								}
								const executionData = this.helpers.constructExecutionMetaData(
									this.helpers.returnJsonArray({ ...object }),
									{ itemData: { item: index } },
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
						const workbookId = this.getNodeParameter('workbook', i, undefined, {
							extractValue: true,
						}) as string;

						const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
							extractValue: true,
						}) as string;

						const tableId = this.getNodeParameter('table', i, undefined, {
							extractValue: true,
						}) as string;

						const lookupColumn = this.getNodeParameter('lookupColumn', i) as string;
						const lookupValue = this.getNodeParameter('lookupValue', i) as string;
						const options = this.getNodeParameter('options', i);

						responseData = await microsoftApiRequestAllItemsSkip.call(
							this,
							'value',
							'GET',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows`,
							{},
							{},
						);

						qs.$select = 'name';
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
						for (let index = 0; index < responseData.length; index++) {
							const object: IDataObject = {};
							for (let y = 0; y < columns.length; y++) {
								object[columns[y]] = responseData[index].values[0][y];
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
						const workbookId = this.getNodeParameter('workbook', i, undefined, {
							extractValue: true,
						}) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);
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
					if (operation === 'delete') {
						const workbookId = this.getNodeParameter('workbook', i, undefined, {
							extractValue: true,
						}) as string;

						await microsoftApiRequest.call(this, 'DELETE', `/drive/items/${workbookId}`);

						responseData = { success: true };
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						if (filters.fields) {
							qs.$select = filters.fields;
						}
						if (returnAll) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								"/drive/root/search(q='.xlsx')",
								{},
								qs,
							);
						} else {
							qs.$top = this.getNodeParameter('limit', i);
							responseData = await microsoftApiRequest.call(
								this,
								'GET',
								"/drive/root/search(q='.xlsx')",
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
			if (operation === 'append') {
				const workbookId = this.getNodeParameter('workbook', 0, undefined, {
					extractValue: true,
				}) as string;

				const worksheetId = this.getNodeParameter('worksheet', 0, undefined, {
					extractValue: true,
				}) as string;

				const dataMode = this.getNodeParameter('dataMode', 0) as string;

				const worksheetData = await microsoftApiRequest.call(
					this,
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/usedRange`,
				);

				let values: string[][] = [];

				if (dataMode === 'raw') {
					const data = this.getNodeParameter('data', 0);
					values = processJsonInput(data, 'Data') as string[][];
				}

				if (dataMode === 'autoMap') {
					const columnsRow = (worksheetData.values as string[][])[0];

					const itemsData = items.map((item) => item.json);
					for (const item of itemsData) {
						const updateRow: string[] = [];

						for (const column of columnsRow) {
							updateRow.push(item[column] as string);
						}

						values.push(updateRow);
					}
				}

				const { address } = worksheetData;
				const usedRange = address.split('!')[1];

				const [rangeFrom, rangeTo] = usedRange.split(':');
				const cellDataFrom = rangeFrom.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) || [];
				const cellDataTo = rangeTo.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) || [];

				const from = `${cellDataFrom[1]}${Number(cellDataTo[2]) + 1}`;
				const to = `${cellDataTo[1]}${Number(cellDataTo[2]) + Number(values.length)}`;

				responseData = await microsoftApiRequest.call(
					this,
					'PATCH',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${from}:${to}')`,
					{ values },
				);

				const rawData = this.getNodeParameter('rawData', 0);

				returnData.push(...prepareOutput.call(this, responseData, rawData));
			} else if (operation === 'updateRange') {
				try {
					const workbookId = this.getNodeParameter('workbook', 0, undefined, {
						extractValue: true,
					}) as string;

					const worksheetId = this.getNodeParameter('worksheet', 0, undefined, {
						extractValue: true,
					}) as string;

					let range = this.getNodeParameter('range', 0) as string;
					const dataMode = this.getNodeParameter('dataMode', 0) as string;

					let worksheetData: IDataObject = {};

					if (range && dataMode !== 'raw') {
						worksheetData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
						);
					}

					//get used range if range not provided; if 'raw' mode fetch only address information
					if (range === '') {
						const query: IDataObject = {};
						if (dataMode === 'raw') {
							query.select = 'address';
						}

						worksheetData = await microsoftApiRequest.call(
							this,
							'GET',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/usedRange`,
							undefined,
							query,
						);

						range = (worksheetData.address as string).split('!')[1];
					}

					if (dataMode === 'raw') {
						const data = this.getNodeParameter('data', 0);

						const values = processJsonInput(data, 'Data') as string[][];

						responseData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
							{ values },
						);
					}

					if (dataMode === 'autoMap') {
						if (
							worksheetData.values === undefined ||
							(worksheetData.values as string[][]).length <= 1
						) {
							throw new NodeOperationError(
								this.getNode(),
								'No data found in the specified range could not auto map, you can use raw mode instead to update selected range',
							);
						}
						const columnToMatchOn = this.getNodeParameter('columnToMatchOn', 0) as string;

						if (!items.some(({ json }) => json[columnToMatchOn] !== undefined)) {
							throw new NodeOperationError(
								this.getNode(),
								`Any item in input data contains column '${columnToMatchOn}', that is selected to match on`,
							);
						}

						const [columns, ...values] = worksheetData.values as string[][];
						const columnToMatchOnIndex = columns.indexOf(columnToMatchOn);
						const columnToMatchOnData = values.map((row) => row[columnToMatchOnIndex]);

						const updateAll = this.getNodeParameter('options.updateAll', 0, false) as boolean;

						const itemsData = items.map((item) => item.json);
						for (const item of itemsData) {
							const columnValue = item[columnToMatchOn] as string;

							const rowIndexes: number[] = [];
							if (updateAll) {
								columnToMatchOnData.forEach((value, index) => {
									if (value === columnValue || Number(value) === Number(columnValue)) {
										rowIndexes.push(index);
									}
								});
							} else {
								const rowIndex = columnToMatchOnData.findIndex(
									(value) => value === columnValue || Number(value) === Number(columnValue),
								);

								if (rowIndex === -1) continue;

								rowIndexes.push(rowIndex);
							}

							if (!rowIndexes.length) continue;

							const updatedRow: Array<string | null> = [];

							for (const columnName of columns) {
								const updateValue =
									item[columnName] === undefined ? null : (item[columnName] as string);
								updatedRow.push(updateValue);
							}

							for (const rowIndex of rowIndexes) {
								values[rowIndex] = updatedRow as string[];
							}
						}

						responseData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
							{ values: [columns, ...values] },
						);
					}

					const rawData = this.getNodeParameter('rawData', 0);

					returnData.push(...prepareOutput.call(this, responseData, rawData));
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
			} else {
				for (let i = 0; i < length; i++) {
					qs = {};
					try {
						if (operation === 'clear') {
							const workbookId = this.getNodeParameter('workbook', i, undefined, {
								extractValue: true,
							}) as string;

							const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
								extractValue: true,
							}) as string;

							const applyTo = this.getNodeParameter('applyTo', i) as string;
							const selectRange = this.getNodeParameter('selectRange', i) as string;

							if (selectRange === 'whole') {
								await microsoftApiRequest.call(
									this,
									'POST',
									`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range/clear`,
									{ applyTo },
								);
							} else {
								const range = this.getNodeParameter('range', i) as string;
								await microsoftApiRequest.call(
									this,
									'POST',
									`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')/clear`,
									{ applyTo },
								);
							}

							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ success: true }),
								{ itemData: { item: i } },
							);

							returnData.push(...executionData);
						}
						if (operation === 'delete') {
							const workbookId = this.getNodeParameter('workbook', i, undefined, {
								extractValue: true,
							}) as string;

							const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
								extractValue: true,
							}) as string;

							await microsoftApiRequest.call(
								this,
								'DELETE',
								`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}`,
							);

							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ success: true }),
								{ itemData: { item: i } },
							);

							returnData.push(...executionData);
						}
						//https://docs.microsoft.com/en-us/graph/api/workbook-list-worksheets?view=graph-rest-1.0&tabs=http
						if (operation === 'getAll') {
							const returnAll = this.getNodeParameter('returnAll', i);
							const workbookId = this.getNodeParameter('workbook', i, undefined, {
								extractValue: true,
							}) as string;
							const filters = this.getNodeParameter('filters', i);
							if (filters.fields) {
								qs.$select = filters.fields;
							}

							if (returnAll) {
								responseData = await microsoftApiRequestAllItems.call(
									this,
									'value',
									'GET',
									`/drive/items/${workbookId}/workbook/worksheets`,
									{},
									qs,
								);
							} else {
								qs.$top = this.getNodeParameter('limit', i);
								responseData = await microsoftApiRequest.call(
									this,
									'GET',
									`/drive/items/${workbookId}/workbook/worksheets`,
									{},
									qs,
								);
								responseData = responseData.value;
							}
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData),
								{ itemData: { item: i } },
							);

							returnData.push(...executionData);
						}
						//https://docs.microsoft.com/en-us/graph/api/worksheet-range?view=graph-rest-1.0&tabs=http
						if (operation === 'getContent') {
							const workbookId = this.getNodeParameter('workbook', i, undefined, {
								extractValue: true,
							}) as string;

							const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
								extractValue: true,
							}) as string;

							const range = this.getNodeParameter('range', i) as string;

							const rawData = this.getNodeParameter('rawData', i);

							if (rawData) {
								const filters = this.getNodeParameter('filters', i);
								if (filters.fields) {
									qs.$select = filters.fields;
								}
							}

							if (range) {
								responseData = await microsoftApiRequest.call(
									this,
									'GET',
									`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
									{},
									qs,
								);
							} else {
								responseData = await microsoftApiRequest.call(
									this,
									'GET',
									`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/usedRange`,
									{},
									qs,
								);
							}

							if (!rawData) {
								const keyRow = this.getNodeParameter('keyRow', i) as number;
								const dataStartRow = this.getNodeParameter('dataStartRow', i) as number;
								returnData.push(
									...prepareOutput.call(this, responseData, rawData, keyRow, dataStartRow),
								);
							} else {
								returnData.push(...prepareOutput.call(this, responseData, rawData));
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
		}

		return this.prepareOutputData(returnData);
	}
}
