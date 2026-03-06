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
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
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

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(attachment), {
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
