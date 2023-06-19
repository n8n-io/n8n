import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { microsoftApiRequest } from '../../transport';
import { workbookRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	workbookRLC,
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description:
					'The name of the sheet to be added. The name should be unique. If not specified, Excel will determine the name of the new worksheet.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['workbook'],
		operation: ['addWorksheet'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	//https://docs.microsoft.com/en-us/graph/api/worksheetcollection-add?view=graph-rest-1.0&tabs=http
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
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
			const responseData = await microsoftApiRequest.call(
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

			if (Array.isArray(responseData)) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} else if (responseData !== undefined) {
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

	return returnData;
}
