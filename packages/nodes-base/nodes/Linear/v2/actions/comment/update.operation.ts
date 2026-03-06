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
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		required: true,
		typeOptions: { rows: 4 },
		default: '',
		description: 'The new comment body in markdown format',
	},
];

const displayOptions = {
	show: {
		resource: ['comment'],
		operation: ['update'],
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
			const body = this.getNodeParameter('body', i) as string;

			const requestBody = {
				query: `mutation CommentUpdate($commentId: String!, $body: String!) {
					commentUpdate(id: $commentId, input: { body: $body }) {
						success
						comment {
							id
							body
							createdAt
							updatedAt
							user {
								id
								displayName
							}
						}
					}
				}`,
				variables: { commentId, body },
			};

			const responseData = await linearApiRequest.call(this, requestBody);
			const result = (responseData as { data: { commentUpdate: IDataObject } }).data.commentUpdate;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(result),
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
