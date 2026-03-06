import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { ISSUE_FIELDS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Issue ID',
		name: 'issueId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the issue to retrieve',
	},
];

const displayOptions = {
	show: {
		resource: ['issue'],
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
			const issueId = this.getNodeParameter('issueId', i) as string;

			const body = {
				query: `query Issue($issueId: String!) {
					issue(id: $issueId) {
						${ISSUE_FIELDS}
					}
				}`,
				variables: { issueId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const issue = (responseData as { data: { issue: IDataObject } }).data.issue;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(issue),
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
