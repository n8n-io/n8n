import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { SpreadSheetProperties } from '../../helpers/GoogleSheets.types';
import { apiRequest } from '../../transport';

export const description: SpreadSheetProperties = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['spreadsheet'],
				operation: ['create'],
			},
		},
		description: 'The title of the spreadsheet',
	},
	{
		displayName: 'Sheets',
		name: 'sheetsUi',
		placeholder: 'Add Sheet',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				name: 'sheetValues',
				displayName: 'Sheet',
				values: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Title of the property to create',
					},
					{
						displayName: 'Hidden',
						name: 'hidden',
						type: 'boolean',
						default: false,
						description: 'Whether the Sheet should be hidden in the UI',
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['spreadsheet'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['spreadsheet'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Locale',
				name: 'locale',
				type: 'string',
				default: '',
				placeholder: 'en_US',
				description: `The locale of the spreadsheet in one of the following formats:
				<ul>
					<li>en (639-1)</li>
					<li>fil (639-2 if no 639-1 format exists)</li>
					<li>en_US (combination of ISO language an country)</li>
				<ul>`,
			},
			{
				displayName: 'Recalculation Interval',
				name: 'autoRecalc',
				type: 'options',
				options: [
					{
						name: 'Default',
						value: '',
						description: 'Default value',
					},
					{
						name: 'On Change',
						value: 'ON_CHANGE',
						description: 'Volatile functions are updated on every change',
					},
					{
						name: 'Minute',
						value: 'MINUTE',
						description: 'Volatile functions are updated on every change and every minute',
					},
					{
						name: 'Hour',
						value: 'HOUR',
						description: 'Volatile functions are updated on every change and hourly',
					},
				],
				default: '',
				description: 'Cell recalculation interval options',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: IDataObject[] = [];

	for (let i = 0; i < items.length; i++) {
		const title = this.getNodeParameter('title', i) as string;
		const sheetsUi = this.getNodeParameter('sheetsUi', i, {}) as IDataObject;

		const body = {
			properties: {
				title,
				autoRecalc: undefined as undefined | string,
				locale: undefined as undefined | string,
			},
			sheets: [] as IDataObject[],
		};

		const options = this.getNodeParameter('options', i, {}) as IDataObject;

		if (Object.keys(sheetsUi).length) {
			const data = [];
			const sheets = sheetsUi.sheetValues as IDataObject[];
			for (const properties of sheets) {
				data.push({ properties });
			}
			body.sheets = data;
		}

		body.properties!.autoRecalc = options.autoRecalc ? (options.autoRecalc as string) : undefined;
		body.properties!.locale = options.locale ? (options.locale as string) : undefined;

		const response = await apiRequest.call(this, 'POST', `/v4/spreadsheets`, body);
		returnData.push(response);
	}

	return this.helpers.returnJsonArray(returnData);
}
