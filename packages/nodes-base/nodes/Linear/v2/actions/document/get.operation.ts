import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { DOCUMENT_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [DOCUMENT_LOCATOR];

const displayOptions = {
	show: {
		resource: ['document'],
		operation: ['get'],
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
		query: `query Document($documentId: String!) {
			document(id: $documentId) {
				id
				title
				content
				createdAt
				updatedAt
				project {
					id
					name
				}
			}
		}`,
		variables: { documentId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const document = (responseData as { data: { document: IDataObject } }).data.document;

	return document;
}
