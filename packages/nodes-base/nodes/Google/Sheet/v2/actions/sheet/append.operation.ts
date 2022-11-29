import { IExecuteFunctions } from 'n8n-core';
import { SheetProperties, ValueInputOption } from '../../helpers/GoogleSheets.types';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { GoogleSheet } from '../../helpers/GoogleSheet';
import { autoMapInputData, mapFields, untilSheetSelected } from '../../helpers/GoogleSheets.utils';
import { cellFormat, handlingExtraData } from './commonDescription';

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
			"In this mode, make sure the incoming data is named the same as the columns in your Sheet. (Use a 'set' node before this node to change it if required.)",
		name: 'autoMapNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['append'],
				dataMode: ['autoMapInputData'],
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
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
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
			...cellFormat,
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
			...handlingExtraData,
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const dataMode = this.getNodeParameter('dataMode', 0) as string;

	if (!items.length || dataMode === 'nothing') return [];

	const options = this.getNodeParameter('options', 0, {}) as IDataObject;
	const locationDefine = ((options.locationDefine as IDataObject) || {}).values as IDataObject;

	let headerRow = 1;
	if (locationDefine && locationDefine.headerRow) {
		headerRow = locationDefine.headerRow as number;
	}

	let setData: IDataObject[] = [];

	if (dataMode === 'autoMapInputData') {
		setData = await autoMapInputData.call(this, sheetName, sheet, items, options);
	} else {
		setData = mapFields.call(this, items.length);
	}

	await sheet.appendSheetData(
		setData,
		sheetName,
		headerRow,
		(options.cellFormat as ValueInputOption) || 'RAW',
		false,
	);

	return items;
}
