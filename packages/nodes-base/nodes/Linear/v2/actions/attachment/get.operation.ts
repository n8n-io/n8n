import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['attachment'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const attachmentId = this.getNodeParameter('attachmentId', i) as string;

	const body = {
		query: `query Attachment($attachmentId: String!) {
			attachment(id: $attachmentId) {
				id
				url
				title
				subtitle
				createdAt
				updatedAt
				issue {
					id
					identifier
					title
				}
			}
		}`,
		variables: { attachmentId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const attachment = (responseData as { data: { attachment: IDataObject } }).data.attachment;

	return attachment;
}
