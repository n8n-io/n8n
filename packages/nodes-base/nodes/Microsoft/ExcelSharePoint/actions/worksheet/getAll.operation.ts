import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { libraryRLC, siteRLC, workbookRLC } from '../../descriptions/common.descriptions';
import { resolveWorkbookRoot } from '../../helpers/utils';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';

const properties: INodeProperties[] = [
	workbookRLC,
	siteRLC,
	libraryRLC,
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will contain. Multiple can be added separated by ,.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['worksheet'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// https://learn.microsoft.com/en-us/graph/api/workbook-list-worksheets
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const returnAll = this.getNodeParameter('returnAll', i);
			const options = this.getNodeParameter('options', i, {}) as { fields?: string };

			const qs: IDataObject = {};
			if (options.fields) {
				qs.$select = options.fields;
			}

			const workbookRoot = await resolveWorkbookRoot.call(this, i);
			const endpoint = `${workbookRoot}/workbook/worksheets`;

			let responseData: IDataObject[];
			if (returnAll) {
				responseData = await microsoftApiRequestAllItems.call(this, endpoint, qs);
			} else {
				qs.$top = this.getNodeParameter('limit', i);
				const response = await microsoftApiRequest.call(this, 'GET', endpoint, {}, qs);
				responseData = (response.value as IDataObject[]) ?? [];
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			if (!this.continueOnFail()) throw error;

			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: error.message }),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionErrorData);
		}
	}

	return returnData;
}
