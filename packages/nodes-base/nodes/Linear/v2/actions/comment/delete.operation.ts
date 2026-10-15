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
];

const displayOptions = {
	show: {
		resource: ['comment'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const commentId = this.getNodeParameter('commentId', i) as string;

	const body = {
		query: `mutation CommentDelete($commentId: String!) {
			commentDelete(id: $commentId) {
				success
			}
		}`,
		variables: { commentId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const result = (responseData as { data: { commentDelete: IDataObject } }).data.commentDelete;

	return result;
}
