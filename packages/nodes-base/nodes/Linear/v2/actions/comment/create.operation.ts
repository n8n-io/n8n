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
		displayName: 'Issue ID',
		name: 'issueId',
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
		description: 'The comment body in markdown format',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Parent Comment ID',
				name: 'parentId',
				type: 'string',
				description: 'ID of the parent comment if this is a reply',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['comment'],
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
			const body = this.getNodeParameter('body', i) as string;
			const additionalFields = this.getNodeParameter('additionalFields', i) as Record<
				string,
				unknown
			>;

			const variables: IDataObject = { issueId, body };
			if (additionalFields.parentId && (additionalFields.parentId as string).trim() !== '') {
				variables.parentId = additionalFields.parentId;
			}

			const requestBody = {
				query: `mutation CommentCreate($issueId: String!, $body: String!, $parentId: String) {
					commentCreate(input: { issueId: $issueId, body: $body, parentId: $parentId }) {
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
				variables,
			};

			const responseData = await linearApiRequest.call(this, requestBody);
			const result = (responseData as { data: { commentCreate: IDataObject } }).data.commentCreate;

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
