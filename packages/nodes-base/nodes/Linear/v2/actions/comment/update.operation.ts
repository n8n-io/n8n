import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

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
	i: number,
): Promise<IDataObject | IDataObject[]> {
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

	return result;
}
