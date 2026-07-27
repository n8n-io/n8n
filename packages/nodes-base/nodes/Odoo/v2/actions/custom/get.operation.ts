import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { recordRLC } from '../../helpers/utils';
import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	recordRLC('Record', 'recordId', 'searchCustomRecords', 'Record to retrieve', [
		'customResource.value',
	]),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Fields to Include',
				name: 'fieldsList',
				type: 'string',
				requiresDataPath: 'multiple',
				default: '',
				description: 'Comma-separated list of field names to include in the response',
				placeholder: 'e.g. name,email,phone',
			},
		],
	},
];

const displayOptions = {
	show: { resource: ['custom'], operation: ['get'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const model = this.getNodeParameter('customResource', i, undefined, {
				extractValue: true,
			}) as string;
			const recordId = Number(
				this.getNodeParameter('recordId', i, undefined, {
					extractValue: true,
				}),
			);
			const options = this.getNodeParameter('options', i) as IDataObject;

			const fieldsRaw = (options.fieldsList as string) ?? '';
			const fields = fieldsRaw
				? fieldsRaw
						.split(',')
						.map((f) => f.trim())
						.filter(Boolean)
				: [];

			const response = (await odooApiRequest.call(this, model, 'read', {
				ids: [recordId],
				fields,
			})) as IDataObject[];

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
