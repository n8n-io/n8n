import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { DOCUMENT_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [DOCUMENT_LOCATOR];

const displayOptions = {
	show: {
		resource: ['document'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const documentId = this.getNodeParameter('documentId', i, '', {
		extractValue: true,
	}) as string;

	const body = {
		query: `mutation DocumentDelete($documentId: String!) {
			documentDelete(id: $documentId) {
				success
			}
		}`,
		variables: { documentId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const result = (responseData as { data: { documentDelete: IDataObject } }).data.documentDelete;

	return result;
}
