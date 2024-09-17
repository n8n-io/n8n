import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';

import type { Sheet2JSONOpts, WorkBook, ParsingOptions } from 'xlsx';
import { read as xlsxRead, readFile as xlsxReadFile, utils as xlsxUtils } from 'xlsx';

import { parse as createCSVParser } from 'csv-parse';
import { binaryProperty, fromFileOptions } from '../description';

export const description: INodeProperties[] = [
	binaryProperty,
	{
		displayName: 'File Format',
		name: 'fileFormat',
		type: 'options',
		options: [
			{
				name: 'Autodetect',
				value: 'autodetect',
			},
			{
				name: 'CSV',
				value: 'csv',
				description: 'Comma-separated values',
			},
			{
				name: 'HTML',
				value: 'html',
				description: 'HTML Table',
			},
			{
				name: 'ODS',
				value: 'ods',
				description: 'OpenDocument Spreadsheet',
			},
			{
				name: 'RTF',
				value: 'rtf',
				description: 'Rich Text Format',
			},
			{
				name: 'XLS',
				value: 'xls',
				description: 'Excel',
			},
			{
				name: 'XLSX',
				value: 'xlsx',
				description: 'Excel',
			},
		],
		default: 'autodetect',
		description: 'The format of the binary data to read from',
		displayOptions: {
			show: {
				operation: ['fromFile'],
			},
		},
	},
	fromFileOptions,
];

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	fileFormatProperty = 'fileFormat',
) {
	const returnData: INodeExecutionData[] = [];
	let fileExtension;
	let fileFormat;

	for (let i = 0; i < items.length; i++) {
		try {
			const options = this.getNodeParameter('options', i, {});
			fileFormat = this.getNodeParameter(fileFormatProperty, i, '');
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
			const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
			fileExtension = binaryData.fileExtension;

			let rows: unknown[] = [];

			if (
				fileFormat === 'autodetect' &&
				(binaryData.mimeType === 'text/csv' ||
					(binaryData.mimeType === 'text/plain' && binaryData.fileExtension === 'csv'))
			) {
				fileFormat = 'csv';
			}

			if (fileFormat === 'csv') {
				const maxRowCount = options.maxRowCount as number;
				const parser = createCSVParser({
					delimiter: options.delimiter as string,
					fromLine: options.fromLine as number,
					encoding: options.encoding as BufferEncoding,
					bom: options.enableBOM as boolean,
					to: maxRowCount > -1 ? maxRowCount : undefined,
					columns: options.headerRow !== false,
					onRecord: (record) => {
						if (!options.includeEmptyCells) {
							record = Object.fromEntries(
								Object.entries(record).filter(([_key, value]) => value !== ''),
							);
						}
						rows.push(record);
					},
				});
				if (binaryData.id) {
					const stream = await this.helpers.getBinaryStream(binaryData.id);
					await new Promise<void>(async (resolve, reject) => {
						parser.on('error', reject);
						parser.on('readable', () => {
							stream.unpipe(parser);
							stream.destroy();
							resolve();
						});
						stream.pipe(parser);
					});
				} else {
					parser.write(binaryData.data, BINARY_ENCODING);
					parser.end();
				}
			} else {
				let workbook: WorkBook;
				const xlsxOptions: ParsingOptions = { raw: options.rawData as boolean };
				if (options.readAsString) xlsxOptions.type = 'string';

				if (binaryData.id) {
					const binaryPath = this.helpers.getBinaryPath(binaryData.id);
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

				rows = xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], sheetToJsonOptions);

				// Check if data could be found in file
				if (rows.length === 0) {
					continue;
				}
			}

			// Add all the found data columns to the workflow data
			if (options.headerRow === false) {
				// Data was returned as an array - https://github.com/SheetJS/sheetjs#json
				for (const rowData of rows) {
					returnData.push({
						json: {
							row: rowData,
						},
						pairedItem: {
							item: i,
						},
					} as INodeExecutionData);
				}
			} else {
				for (const rowData of rows) {
					returnData.push({
						json: rowData,
						pairedItem: {
							item: i,
						},
					} as INodeExecutionData);
				}
			}
		} catch (error) {
			let errorDescription = error.description;
			if (fileExtension && fileExtension !== fileFormat) {
				error.message = `The file selected in 'Input Binary Field' is not in ${fileFormat} format`;
				errorDescription = `Try to change the operation or select a ${fileFormat} file in 'Input Binary Field'`;
			}
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
					pairedItem: {
						item: i,
					},
				});
				continue;
			}
			throw new NodeOperationError(this.getNode(), error, {
				itemIndex: i,
				description: errorDescription,
			});
		}
	}

	return returnData;
}
