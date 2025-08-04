import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	NodeOperationError,
	type ResourceMapperField,
} from 'n8n-workflow';

import { cellFormat, handlingExtraData, useAppendOption } from './commonDescription';
import type { GoogleSheet } from '../../helpers/GoogleSheet';
import type { SheetProperties, ValueInputOption } from '../../helpers/GoogleSheets.types';
import {
	autoMapInputData,
	cellFormatDefault,
	checkForSchemaChanges,
	mapFields,
	untilSheetSelected,
} from '../../helpers/GoogleSheets.utils';

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
				operation: ['append'],
				'@version': [3],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName:
			"In this mode, make sure the incoming data is named the same as the columns in your Sheet. (Use an 'Edit Fields' node before this node to change it if required.)",
		name: 'autoMapNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['append'],
				dataMode: ['autoMapInputData'],
				'@version': [3],
			},
			hide: {
				...untilSheetSelected,
			},
		},
	},
	{
		displayName: 'Fields to Send',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Field to Send',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['append'],
				dataMode: ['defineBelow'],
				'@version': [3],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['sheetName.value'],
							loadOptionsMethod: 'getSheetHeaderRowAndSkipEmpty',
						},
						default: '',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'resourceMapper',
		noDataExpression: true,
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['sheetName.value'],
			resourceMapper: {
				resourceMapperMethod: 'getMappingColumns',
				mode: 'add',
				fieldWords: {
					singular: 'column',
					plural: 'columns',
				},
				addAllFields: true,
				multiKeyMatch: false,
			},
		},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['append'],
				'@version': [{ _cnd: { gte: 4 } }],
			},
			hide: {
				...untilSheetSelected,
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['append'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		options: [
			cellFormat,
			{
				displayName: 'Data Location on Sheet',
				name: 'locationDefine',
				type: 'fixedCollection',
				placeholder: 'Select Range',
				default: { values: {} },
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Header Row',
								name: 'headerRow',
								type: 'number',
								typeOptions: {
									minValue: 1,
								},
								default: 1,
								description:
									'Index of the row which contains the keys. Starts at 1. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
							},
						],
					},
				],
			},
			handlingExtraData,
			{
				...handlingExtraData,
				displayOptions: { show: { '/columns.mappingMode': ['autoMapInputData'] } },
			},
			useAppendOption,
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	range: string,
	sheetId: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const nodeVersion = this.getNode().typeVersion;
	let dataMode =
		nodeVersion < 4
			? (this.getNodeParameter('dataMode', 0) as string)
			: (this.getNodeParameter('columns.mappingMode', 0) as string);

	if (!items.length || dataMode === 'nothing') return [];

	const options = this.getNodeParameter('options', 0, {});
	const locationDefine = (options.locationDefine as IDataObject)?.values as IDataObject;

	let keyRowIndex = 1;
	if (locationDefine?.headerRow) {
		keyRowIndex = locationDefine.headerRow as number;
	}

	const sheetData = await sheet.getData(range, 'FORMATTED_VALUE');

	if (!sheetData?.length) {
		dataMode = 'autoMapInputData';
	}

	if (nodeVersion >= 4.4 && dataMode !== 'autoMapInputData') {
		//not possible to refresh columns when mode is autoMapInputData
		if (sheetData?.[keyRowIndex - 1] === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				`Could not retrieve the column names from row ${keyRowIndex}`,
			);
		}

		const schema = this.getNodeParameter('columns.schema', 0) as ResourceMapperField[];
		checkForSchemaChanges(this.getNode(), sheetData[keyRowIndex - 1], schema);
	}

	let inputData: IDataObject[] = [];

	if (dataMode === 'autoMapInputData') {
		inputData = await autoMapInputData.call(this, range, sheet, items, options);
	} else {
		inputData = mapFields.call(this, items.length);
	}

	if (inputData.length === 0) {
		return [];
	}

	const valueInputMode = (options.cellFormat as ValueInputOption) || cellFormatDefault(nodeVersion);
	const useAppend = options.useAppend as boolean;

	if (options.useAppend) {
		await sheet.appendSheetData({
			inputData,
			range,
			keyRowIndex,
			valueInputMode,
			useAppend,
		});
	} else {
		//if no trailing empty row exists in the sheet update operation will fail
		await sheet.appendEmptyRowsOrColumns(sheetId, 1, 0);

		// if sheetData is undefined it means that the sheet was empty
		// we did add row with column names in the first row (autoMapInputData)
		// to account for that length has to be 1 and we append data in the next row
		const lastRow = (sheetData ?? [{}]).length + 1;

		await sheet.appendSheetData({
			inputData,
			range,
			keyRowIndex,
			valueInputMode,
			lastRow,
		});
	}

	if (nodeVersion < 4 || dataMode === 'autoMapInputData') {
		return items.map((item, index) => {
			item.pairedItem = { item: index };
			return item;
		});
	} else {
		const returnData: INodeExecutionData[] = [];
		for (const [index, entry] of inputData.entries()) {
			returnData.push({
				json: entry,
				pairedItem: { item: index },
			});
		}
		return returnData;
	}
}
