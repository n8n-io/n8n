import { IExecuteFunctions } from 'n8n-core';
import {
	ISheetUpdateData,
	RangeDetectionOptions,
	SheetProperties,
} from '../../helpers/GoogleSheets.types';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { GoogleSheet } from '../../helpers/GoogleSheet';
import { ValueInputOption, ValueRenderOption } from '../../helpers/GoogleSheets.types';
import { untilSheetSelected } from '../../helpers/GoogleSheets.utils';
import { locationDefine } from './commonDescription';

export const description: SheetProperties = [
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Match',
				value: 'autoMatch',
				description: 'Attempt to automatically find the field',
			},
			{
				name: 'Define Below',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
		],
		displayOptions: {
			show: {
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
			loadOptionsDependsOn: ['sheetName'],
			loadOptionsMethod: 'getSheetHeaderRow',
		},
		default: '',
		hint: 'This column does not get changed it gets only used to find the correct row to update',
		displayOptions: {
			show: {
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
				operation: ['appendOrUpdate'],
				dataToSend: ['defineBelow'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
	},
	{
		displayName: 'Fields',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['appendOrUpdate'],
				dataToSend: ['defineBelow'],
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
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['sheetName'],
							loadOptionsMethod: 'getSheetHeaderRow',
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
				operation: ['appendOrUpdate'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		options: [
			{
				displayName: 'Cell Format',
				name: 'cellFormat',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						'/operation': ['appendOrUpdate'],
					},
				},
				options: [
					{
						name: 'Use Format From N8N',
						value: 'RAW',
						description: 'The values will not be parsed and will be stored as-is',
					},
					{
						name: 'Automatic',
						value: 'USER_ENTERED',
						description:
							'The values will be parsed as if the user typed them into the UI. Numbers will stay as numbers, but strings may be converted to numbers, dates, etc. following the same rules that are applied when entering text into a cell via the Google Sheets UI.',
					},
				],
				default: 'RAW',
				description: 'Determines how data should be interpreted',
			},
			...locationDefine,
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const updateData: ISheetUpdateData[] = [];
	const valueInputMode = this.getNodeParameter('options.cellFormat', 0, 'RAW') as ValueInputOption;

	for (let i = 0; i < items.length; i++) {
		const options = this.getNodeParameter('options', i, {}) as IDataObject;

		// const valueInputMode = (options.cellFormat || 'RAW') as ValueInputOption;
		const valueRenderMode = (options.valueRenderMode || 'UNFORMATTED_VALUE') as ValueRenderOption;

		const locationDefine = ((options.locationDefine as IDataObject) || {}).values as IDataObject;

		let headerRow = 0;
		let firstDataRow = 1;
		let range = `${sheetName}!A:Z`;

		if (locationDefine) {
			if (locationDefine.headerRow) {
				headerRow = parseInt(locationDefine.headerRow as string, 10) - 1;
			}
			if (locationDefine.firstDataRow) {
				firstDataRow = parseInt(locationDefine.firstDataRow as string, 10) - 1;
			}
			if (locationDefine.range) {
				range = `${sheetName}!${locationDefine.range}`;
			}
		}

		const dataToSend = this.getNodeParameter('dataToSend', i) as 'defineBelow' | 'autoMatch';

		const data: IDataObject[] = [];
		const columnToMatchOn = this.getNodeParameter('columnToMatchOn', i) as string;

		if (dataToSend === 'autoMatch') {
			data.push(items[i].json);
		} else {
			const valueToMatchOn = this.getNodeParameter('valueToMatchOn', i) as string;

			const fields = (this.getNodeParameter('fieldsUi.values', i, {}) as IDataObject[]).reduce(
				(acc, entry) => {
					acc[entry.fieldId as string] = entry.fieldValue as string;
					return acc;
				},
				{} as IDataObject,
			);

			fields[columnToMatchOn] = valueToMatchOn;

			data.push(fields);
		}

		const preparedData = await sheet.prepareDataForUpdateOrUpsert(
			data,
			columnToMatchOn,
			range,
			headerRow,
			firstDataRow,
			valueRenderMode,
			true,
		);

		updateData.push(...preparedData.updateData);

		if (preparedData.appendData.length) {
			await sheet.appendSheetData(
				preparedData.appendData,
				range,
				headerRow + 1,
				valueInputMode,
				false,
			);
		}
	}

	if (updateData.length) {
		await sheet.batchUpdate(updateData, valueInputMode);
	}
	return items;
}
