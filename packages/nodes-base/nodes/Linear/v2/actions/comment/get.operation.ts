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
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
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

	return comment;
}
