import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { microsoftApiRequest } from '../../transport';
import { tableRLC, workbookRLC, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	workbookRLC,
	worksheetRLC,
	tableRLC,
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Index',
				name: 'index',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description:
					'Specifies the relative position of the new row. If not defined, the addition happens at the end. Any row below the inserted row will be shifted downwards. First row index is 0.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['table'],
		operation: ['addRow'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	//https://docs.microsoft.com/en-us/graph/api/table-post-rows?view=graph-rest-1.0&tabs=http
	const returnData: INodeExecutionData[] = [];

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
		let responseData = await microsoftApiRequest.call(
			this,
			'GET',
			`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
			{},
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

	return returnData;
}
