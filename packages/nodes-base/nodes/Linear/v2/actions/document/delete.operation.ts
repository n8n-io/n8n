import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		required: true,
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['document'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const documentId = this.getNodeParameter('documentId', i) as string;

			const body = {
				query: `mutation DocumentDelete($documentId: String!) {
					documentDelete(id: $documentId) {
						success
					}
				}`,
				variables: { documentId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const result = (responseData as { data: { documentDelete: IDataObject } }).data
				.documentDelete;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(result), {
					itemData: { item: i },
				}),
			);
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
