import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { generatePairedItemData, processJsonInput, updateDisplayOptions } from '@utils/utilities';

import type { ExcelResponse, UpdateSummary } from '../../helpers/interfaces';
import {
	checkRange,
	prepareOutput,
	updateByAutoMaping,
	updateByDefinedValues,
} from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
import { workbookRLC, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	workbookRLC,
	worksheetRLC,
	{
		displayName: 'Select a Range',
		name: 'useRange',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		displayOptions: {
			show: {
				dataMode: ['autoMap', 'define'],
				useRange: [true],
			},
		},
		placeholder: 'e.g. A1:B2',
		default: '',
		description:
			'The sheet range to read the data from specified using a A1-style notation, has to be specific e.g A1:B5, generic ranges like A:B are not supported. Leave blank to use whole used range in the sheet.',
		hint: 'First row must contain column names',
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		displayOptions: {
			show: {
				dataMode: ['raw'],
				useRange: [true],
			},
		},
		placeholder: 'e.g. A1:B2',
		default: '',
		description: 'The sheet range to read the data from specified using a A1-style notation',
		hint: 'Leave blank for entire worksheet',
	},
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		default: 'define',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMap',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Map Each Column Below',
				value: 'define',
				description: 'Set the value for each destination column',
			},
			{
				name: 'Raw',
				value: 'raw',
				description:
					'Send raw data as JSON, the whole selected range would be updated with the new values',
			},
		],
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '',
		required: true,
		placeholder: 'e.g. [["Sara","1/2/2006","Berlin"],["George","5/3/2010","Paris"]]',
		description:
			'Raw values for the specified range as array of string arrays in JSON format. Should match the specified range: one array item for each row.',
		displayOptions: {
			show: {
				dataMode: ['raw'],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased, n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column to match on',
		name: 'columnToMatchOn',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsDependsOn: ['worksheet.value', 'workbook.value', 'range'],
			loadOptionsMethod: 'getWorksheetColumnRow',
		},
		default: '',
		hint: "Used to find the correct row to update. Doesn't get changed.",
		displayOptions: {
			show: {
				dataMode: ['autoMap', 'define'],
			},
		},
	},
	{
		displayName: 'Value of Column to Match On',
		name: 'valueToMatchOn',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				dataMode: ['define'],
			},
		},
	},
	{
		displayName: 'Values to Send',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				dataMode: ['define'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'values',
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Column',
						name: 'column',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['columnToMatchOn', 'range'],
							loadOptionsMethod: 'getWorksheetColumnRowSkipColumnToMatchOn',
						},
						default: '',
					},
					{
						displayName: 'Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-boolean
				default: 0,
				description:
					'Whether the data should be returned RAW instead of parsed into keys according to their header',
			},
			{
				displayName: 'Data Property',
				name: 'dataProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						rawData: [true],
					},
				},
				description: 'The name of the property into which to write the RAW data',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will containt. Multiple can be added separated by ,.',
				displayOptions: {
					show: {
						rawData: [true],
					},
				},
			},
			{
				displayName: 'Update All Matches',
				name: 'updateAll',
				type: 'boolean',
				default: false,
				description: 'Whether to update all matching rows or just the first match',
				displayOptions: {
					hide: {
						'/dataMode': ['raw'],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['worksheet'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	try {
		const options = this.getNodeParameter('options', 0, {});

		const rawData = options.rawData as boolean;
		const dataProperty = options.dataProperty ? (options.dataProperty as string) : 'data';

		const qs: IDataObject = {};
		if (rawData && options.fields) {
			qs.$select = options.fields;
		}

		const workbookId = this.getNodeParameter('workbook', 0, undefined, {
			extractValue: true,
		}) as string;

		const worksheetId = this.getNodeParameter('worksheet', 0, undefined, {
			extractValue: true,
		}) as string;

		let range = this.getNodeParameter('range', 0, '') as string;
		checkRange(this.getNode(), range);

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

		let responseData;
		if (dataMode === 'raw') {
			const data = this.getNodeParameter('data', 0);

			const values = processJsonInput(data, 'Data') as string[][];

			responseData = await microsoftApiRequest.call(
				this,
				'PATCH',
				`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
				{ values },
				qs,
			);

			returnData.push(
				...prepareOutput.call(this, this.getNode(), responseData as ExcelResponse, {
					rawData,
					dataProperty,
				}),
			);
		} else {
			if (worksheetData.values === undefined || (worksheetData.values as string[][]).length <= 1) {
				throw new NodeOperationError(
					this.getNode(),
					'No data found in the specified range, mapping not possible, you can use raw mode instead to update selected range',
				);
			}

			const updateAll = this.getNodeParameter('options.updateAll', 0, false) as boolean;

			let updateSummary: UpdateSummary = {
				updatedData: [],
				updatedRows: [],
				appendData: [],
			};

			if (dataMode === 'define') {
				updateSummary = updateByDefinedValues.call(
					this,
					items.length,
					worksheetData.values as string[][],
					updateAll,
				);
			}

			if (dataMode === 'autoMap') {
				const columnToMatchOn = this.getNodeParameter('columnToMatchOn', 0) as string;

				if (!items.some(({ json }) => json[columnToMatchOn] !== undefined)) {
					throw new NodeOperationError(
						this.getNode(),
						`Any item in input data contains column '${columnToMatchOn}', that is selected to match on`,
					);
				}

				updateSummary = updateByAutoMaping(
					items,
					worksheetData.values as string[][],
					columnToMatchOn,
					updateAll,
				);
			}

			responseData = await microsoftApiRequest.call(
				this,
				'PATCH',
				`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
				{ values: updateSummary.updatedData },
			);

			const { updatedRows } = updateSummary;

			returnData.push(
				...prepareOutput.call(this, this.getNode(), responseData as ExcelResponse, {
					updatedRows,
					rawData,
					dataProperty,
				}),
			);
		}
	} catch (error) {
		if (this.continueOnFail()) {
			const itemData = generatePairedItemData(this.getInputData().length);
			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: error.message }),
				{ itemData },
			);
			returnData.push(...executionErrorData);
		} else {
			throw error;
		}
	}

	return returnData;
}
