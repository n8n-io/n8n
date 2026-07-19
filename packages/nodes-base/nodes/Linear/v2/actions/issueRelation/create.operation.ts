import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { ISSUE_RELATION_FIELDS, ISSUE_RELATION_TYPE_OPTIONS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Issue ID',
		name: 'issueId',
		type: 'string',
		required: true,
		default: '',
		description: 'The issue that the relation originates from',
	},
	{
		displayName: 'Related Issue ID',
		name: 'relatedIssueId',
		type: 'string',
		required: true,
		default: '',
		description: 'The issue that is related to the origin issue',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: ISSUE_RELATION_TYPE_OPTIONS,
		default: 'related',
		description: 'The type of relation between the issues',
	},
];

const displayOptions = {
	show: {
		resource: ['issueRelation'],
		operation: ['create'],
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
			const issueId = this.getNodeParameter('issueId', i) as string;
			const relatedIssueId = this.getNodeParameter('relatedIssueId', i) as string;
			const type = this.getNodeParameter('type', i) as string;

			const body = {
				query: `mutation IssueRelationCreate($issueId: String!, $relatedIssueId: String!, $type: String!) {
					issueRelationCreate(input: {
						issueId: $issueId
						relatedIssueId: $relatedIssueId
						type: $type
					}) {
						success
						issueRelation {
							${ISSUE_RELATION_FIELDS}
						}
					}
				}`,
				variables: { issueId, relatedIssueId, type },
			};

			const responseData = await linearApiRequest.call(this, body);
			const issueRelation = (
				responseData as { data: { issueRelationCreate: { issueRelation: IDataObject } } }
			).data.issueRelationCreate?.issueRelation;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(issueRelation), {
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
