import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: '',
		hint: 'The name of the input binary field containing the file to be written',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Activity ID',
				name: 'activity_id',
				type: 'number',
				default: 0,
				description: 'ID of the activity this file will be associated with',
			},
			{
				displayName: 'Deal ID',
				name: 'deal_id',
				type: 'number',
				default: 0,
				description: 'ID of the deal this file will be associated with',
			},
			{
				displayName: 'Lead ID',
				name: 'lead_id',
				type: 'string',
				default: '',
				description: 'ID of the lead this file will be associated with',
			},
			{
				displayName: 'Organization Name or ID',
				name: 'org_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrganizationIds',
				},
				default: '',
				description:
					'ID of the organization this file will be associated with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Person ID',
				name: 'person_id',
				type: 'number',
				default: 0,
				description: 'ID of the person this file will be associated with',
			},
			{
				displayName: 'Product ID',
				name: 'product_id',
				type: 'number',
				default: 0,
				description: 'ID of the product this file will be associated with',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
			const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
			const fileBufferData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

			const formData: IDataObject = {
				file: {
					value: fileBufferData,
					options: {
						contentType: binaryData.mimeType,
						filename: binaryData.fileName,
					},
				},
			};

			const additionalFields = this.getNodeParameter('additionalFields', i);
			for (const key of Object.keys(additionalFields)) {
				formData[key] = additionalFields[key];
			}

			const responseData = await pipedriveApiRequest.call(
				this,
				'POST',
				'/files',
				{},
				{},
				{ formData, apiVersion: 'v1' },
			);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData.data as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					),
				);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
