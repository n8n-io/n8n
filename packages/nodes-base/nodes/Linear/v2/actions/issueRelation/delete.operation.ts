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
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
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

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(result), {
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
