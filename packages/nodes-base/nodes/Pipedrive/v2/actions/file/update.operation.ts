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
		displayName: 'File ID',
		name: 'fileId',
		type: 'number',
		default: 0,
		required: true,
		description: 'ID of the file to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The updated visible name of the file',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The updated description of the file',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const fileId = this.getNodeParameter('fileId', i) as number;
			const updateFields = this.getNodeParameter('updateFields', i);

			const body: IDataObject = {};
			for (const key of Object.keys(updateFields)) {
				body[key] = updateFields[key];
			}

			const responseData = await pipedriveApiRequest.call(
				this,
				'PUT',
				`/files/${fileId}`,
				body,
				{},
				{ apiVersion: 'v1' },
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
