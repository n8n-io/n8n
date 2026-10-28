import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Issue Relation ID',
		name: 'issueRelationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the issue relation to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['issueRelation'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const issueRelationId = this.getNodeParameter('issueRelationId', i) as string;

	const body = {
		query: `mutation IssueRelationDelete($issueRelationId: String!) {
			issueRelationDelete(id: $issueRelationId) {
				success
			}
		}`,
		variables: { issueRelationId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const result = (responseData as { data: { issueRelationDelete: IDataObject } }).data
		.issueRelationDelete;

	return result;
}
