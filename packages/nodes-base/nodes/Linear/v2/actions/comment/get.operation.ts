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
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['comment'],
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
			const commentId = this.getNodeParameter('commentId', i) as string;

			const body = {
				query: `query Comment($commentId: String!) {
					comment(id: $commentId) {
						id
						body
						createdAt
						updatedAt
						user {
							id
							displayName
							email
						}
						issue {
							id
							identifier
							title
						}
					}
				}`,
				variables: { commentId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const comment = (responseData as { data: { comment: IDataObject } }).data.comment;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(comment),
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
