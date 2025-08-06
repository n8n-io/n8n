import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { BINARY_ENCODING, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	JSON2SheetOpts,
	ParsingOptions,
	Sheet2JSONOpts,
	WorkBook,
	WritingOptions,
} from 'xlsx';
import {
	read as xlsxRead,
	readFile as xlsxReadFile,
	utils as xlsxUtils,
	write as xlsxWrite,
} from 'xlsx';

import { oldVersionNotice } from '@utils/descriptions';
import { flattenObject, generatePairedItemData } from '@utils/utilities';

import {
	operationProperty,
	binaryProperty,
	toFileProperties,
	fromFileOptions,
	toFileOptions,
} from '../description';

export class SpreadsheetFileV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: 'Spreadsheet File',
				color: '#2244FF',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [
				oldVersionNotice,
				operationProperty,
				binaryProperty,
				...toFileProperties,
				fromFileOptions,
				toFileOptions,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const pairedItem = generatePairedItemData(items.length);

		const operation = this.getNodeParameter('operation', 0);

		const newItems: INodeExecutionData[] = [];

		if (operation === 'fromFile') {
			// Read data from spreadsheet file to workflow
			for (let i = 0; i < items.length; i++) {
				try {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
					const options = this.getNodeParameter('options', i, {});
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

					// Read the binary spreadsheet data
					let workbook: WorkBook;
					const xlsxOptions: ParsingOptions = { raw: options.rawData as boolean };
					if (options.readAsString) xlsxOptions.type = 'string';

					if (binaryData.id) {
						const binaryPath = this.helpers.getBinaryPath(binaryData.id);
						xlsxOptions.codepage = 65001; // utf8 codepage
						workbook = xlsxReadFile(binaryPath, xlsxOptions);
					} else {
						const binaryDataBuffer = Buffer.from(binaryData.data, BINARY_ENCODING);
						workbook = xlsxRead(
							options.readAsString ? binaryDataBuffer.toString() : binaryDataBuffer,
							xlsxOptions,
						);
					}

					if (workbook.SheetNames.length === 0) {
						throw new NodeOperationError(this.getNode(), 'Spreadsheet does not have any sheets!', {
							itemIndex: i,
						});
					}

					let sheetName = workbook.SheetNames[0];
					if (options.sheetName) {
						if (!workbook.SheetNames.includes(options.sheetName as string)) {
							throw new NodeOperationError(
								this.getNode(),
								`Spreadsheet does not contain sheet called "${options.sheetName}"!`,
								{ itemIndex: i },
							);
						}
						sheetName = options.sheetName as string;
					}

					// Convert it to json
					const sheetToJsonOptions: Sheet2JSONOpts = {};
					if (options.range) {
						if (isNaN(options.range as number)) {
							sheetToJsonOptions.range = options.range;
						} else {
							sheetToJsonOptions.range = parseInt(options.range as string, 10);
						}
					}

					if (options.includeEmptyCells) {
						sheetToJsonOptions.defval = '';
					}
					if (options.headerRow === false) {
						sheetToJsonOptions.header = 1; // Consider the first row as a data row
					}

					const sheetJson = xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], sheetToJsonOptions);

					// Check if data could be found in file
					if (sheetJson.length === 0) {
						continue;
					}

					// Add all the found data columns to the workflow data
					if (options.headerRow === false) {
						// Data was returned as an array - https://github.com/SheetJS/sheetjs#json
						for (const rowData of sheetJson) {
							newItems.push({
								json: {
									row: rowData,
								},
								pairedItem: {
									item: i,
								},
							} as INodeExecutionData);
						}
					} else {
						for (const rowData of sheetJson) {
							newItems.push({
								json: rowData,
								pairedItem: {
									item: i,
								},
							} as INodeExecutionData);
						}
					}
				} catch (error) {
					if (this.continueOnFail()) {
						newItems.push({
							json: {
								error: error.message,
							},
							pairedItem: {
								item: i,
							},
						});
						continue;
					}
					throw error;
				}
			}

			return [newItems];
		} else if (operation === 'toFile') {
			try {
				// Write the workflow data to spreadsheet file
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0);
				const fileFormat = this.getNodeParameter('fileFormat', 0) as string;
				const options = this.getNodeParameter('options', 0, {});
				const sheetToJsonOptions: JSON2SheetOpts = {};
				if (options.headerRow === false) {
					sheetToJsonOptions.skipHeader = true;
				}
				// Get the json data of the items and flatten it
				let item: INodeExecutionData;
				const itemData: IDataObject[] = [];
				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					item = items[itemIndex];
					itemData.push(flattenObject(item.json));
				}

				const ws = xlsxUtils.json_to_sheet(itemData, sheetToJsonOptions);

				const wopts: WritingOptions = {
					bookSST: false,
					type: 'buffer',
				};

				if (fileFormat === 'csv') {
					wopts.bookType = 'csv';
				} else if (fileFormat === 'html') {
					wopts.bookType = 'html';
				} else if (fileFormat === 'rtf') {
					wopts.bookType = 'rtf';
				} else if (fileFormat === 'ods') {
					wopts.bookType = 'ods';
					if (options.compression) {
						wopts.compression = true;
					}
				} else if (fileFormat === 'xls') {
					wopts.bookType = 'xls';
				} else if (fileFormat === 'xlsx') {
					wopts.bookType = 'xlsx';
					if (options.compression) {
						wopts.compression = true;
					}
				}

				// Convert the data in the correct format
				const sheetName = (options.sheetName as string) || 'Sheet';
				const wb: WorkBook = {
					SheetNames: [sheetName],
					Sheets: {
						[sheetName]: ws,
					},
				};
				const wbout: Buffer = xlsxWrite(wb, wopts);

				// Create a new item with only the binary spreadsheet data
				const newItem: INodeExecutionData = {
					json: {},
					binary: {},
					pairedItem,
				};

				let fileName = `spreadsheet.${fileFormat}`;
				if (options.fileName !== undefined) {
					fileName = options.fileName as string;
				}

				newItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(wbout, fileName);

				newItems.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					newItems.push({
						json: {
							error: error.message,
						},
						pairedItem,
					});
				} else {
					throw error;
				}
			}
		} else {
			if (this.continueOnFail()) {
				return [[{ json: { error: `The operation "${operation}" is not supported!` } }]];
			} else {
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
				);
			}
		}
		return [newItems];
	}
}
