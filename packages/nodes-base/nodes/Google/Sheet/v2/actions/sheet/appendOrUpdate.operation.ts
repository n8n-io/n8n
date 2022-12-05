import { IExecuteFunctions } from 'n8n-core';
import {
	ISheetUpdateData,
	SheetProperties,
	ValueInputOption,
	ValueRenderOption,
} from '../../helpers/GoogleSheets.types';
import { IDataObject, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { GoogleSheet } from '../../helpers/GoogleSheet';
import { untilSheetSelected } from '../../helpers/GoogleSheets.utils';
import { cellFormat, handlingExtraData, locationDefine } from './commonDescription';

export const description: SheetProperties = [
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Map Each Column Below',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
			{
				name: 'Nothing',
				value: 'nothing',
				description: 'Do not send anything',
			},
		],
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['appendOrUpdate'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased, n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column to match on',
		name: 'columnToMatchOn',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsDependsOn: ['sheetName.value'],
			loadOptionsMethod: 'getSheetHeaderRowAndSkipEmpty',
		},
		default: '',
		hint: "Used to find the correct row to update. Doesn't get changed.",
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['appendOrUpdate'],
			},
			hide: {
				...untilSheetSelected,
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
				resource: ['sheet'],
				operation: ['appendOrUpdate'],
				dataMode: ['defineBelow'],
			},
			hide: {
				...untilSheetSelected,
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
				resource: ['sheet'],
				operation: ['appendOrUpdate'],
				dataMode: ['defineBelow'],
			},
			hide: {
				...untilSheetSelected,
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
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['sheetName.value', 'columnToMatchOn'],
							loadOptionsMethod: 'getSheetHeaderRowAndAddColumn',
						},
						default: '',
					},
					{
						displayName: 'Column Name',
						name: 'columnName',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								column: ['newColumn'],
							},
						},
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
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['appendOrUpdate'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		options: [...cellFormat, ...locationDefine, ...handlingExtraData],
	},
];

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
	sheetId: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const valueInputMode = this.getNodeParameter('options.cellFormat', 0, 'RAW') as ValueInputOption;
	const range = `${sheetName}!A:Z`;

	const options = this.getNodeParameter('options', 0, {});

	const valueRenderMode = (options.valueRenderMode || 'UNFORMATTED_VALUE') as ValueRenderOption;

	const locationDefineOption = (options.locationDefine as IDataObject)?.values as IDataObject;

	let headerRow = 0;
	let firstDataRow = 1;

	if (locationDefineOption) {
		if (locationDefineOption.headerRow) {
			headerRow = parseInt(locationDefineOption.headerRow as string, 10) - 1;
		}
		if (locationDefineOption.firstDataRow) {
			firstDataRow = parseInt(locationDefineOption.firstDataRow as string, 10) - 1;
		}
	}

	let columnNames: string[] = [];

	const sheetData = await sheet.getData(sheetName, 'FORMATTED_VALUE');

	if (sheetData === undefined || sheetData[headerRow] === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			`Could not retrieve the column names from row ${headerRow + 1}`,
		);
	}

	columnNames = sheetData[headerRow];
	const newColumns = new Set<string>();

	const columnToMatchOn = this.getNodeParameter('columnToMatchOn', 0) as string;
	const keyIndex = columnNames.indexOf(columnToMatchOn);

	const columnValues = await sheet.getColumnValues(
		range,
		keyIndex,
		firstDataRow,
		valueRenderMode,
		sheetData,
	);

	const updateData: ISheetUpdateData[] = [];
	const appendData: IDataObject[] = [];

	for (let i = 0; i < items.length; i++) {
		const dataMode = this.getNodeParameter('dataMode', i) as
			| 'defineBelow'
			| 'autoMapInputData'
			| 'nothing';

		if (dataMode === 'nothing') continue;

		const data: IDataObject[] = [];

		if (dataMode === 'autoMapInputData') {
			const handlingExtraDataOption = (options.handlingExtraData as string) || 'insertInNewColumn';
			if (handlingExtraDataOption === 'ignoreIt') {
				data.push(items[i].json);
			}
			if (handlingExtraDataOption === 'error') {
				Object.keys(items[i].json).forEach((key) => {
					if (!columnNames.includes(key)) {
						throw new NodeOperationError(this.getNode(), `Unexpected fields in node input`, {
							itemIndex: i,
							description: `The input field '${key}' doesn't match any column in the Sheet. You can ignore this by changing the 'Handling extra data' field, which you can find under 'Options'.`,
						});
					}
				});
				data.push(items[i].json);
			}
			if (handlingExtraDataOption === 'insertInNewColumn') {
				Object.keys(items[i].json).forEach((key) => {
					if (!columnNames.includes(key)) {
						newColumns.add(key);
					}
				});
				data.push(items[i].json);
			}
		} else {
			const valueToMatchOn = this.getNodeParameter('valueToMatchOn', i) as string;

			const fields = (
				(this.getNodeParameter('fieldsUi.values', i, {}) as IDataObject[]) || []
			).reduce((acc, entry) => {
				if (entry.column === 'newColumn') {
					const columnName = entry.columnName as string;

					if (!columnNames.includes(columnName)) {
						newColumns.add(columnName);
					}

					acc[columnName] = entry.fieldValue as string;
				} else {
					acc[entry.column as string] = entry.fieldValue as string;
				}
				return acc;
			}, {} as IDataObject);

			fields[columnToMatchOn] = valueToMatchOn;

			data.push(fields);
		}

		if (newColumns.size) {
			await sheet.updateRows(
				sheetName,
				[columnNames.concat([...newColumns])],
				(options.cellFormat as ValueInputOption) || 'RAW',
				headerRow + 1,
			);
		}

		const preparedData = await sheet.prepareDataForUpdateOrUpsert(
			data,
			columnToMatchOn,
			range,
			headerRow,
			firstDataRow,
			valueRenderMode,
			true,
			[columnNames.concat([...newColumns])],
			columnValues,
		);

		updateData.push(...preparedData.updateData);
		appendData.push(...preparedData.appendData);
	}

	if (updateData.length) {
		await sheet.batchUpdate(updateData, valueInputMode);
	}
	if (appendData.length) {
		await sheet.appendEmptyRowsOrColumns(sheetId, 1, 0);
		const lastRow = sheetData.length + 1;
		await sheet.appendSheetData(
			appendData,
			range,
			headerRow + 1,
			valueInputMode,
			false,
			[columnNames.concat([...newColumns])],
			lastRow,
		);
	}
	return items;
}
