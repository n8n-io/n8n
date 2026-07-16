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
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		description: 'The URL to attach to the issue',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The attachment title',
			},
			{
				displayName: 'Subtitle',
				name: 'subtitle',
				type: 'string',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['attachment'],
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
			const url = this.getNodeParameter('url', i) as string;
			const additionalFields = this.getNodeParameter('additionalFields', i) as Record<
				string,
				unknown
			>;

			const body = {
				query: `mutation AttachmentCreate($issueId: String!, $url: String!, $title: String, $subtitle: String) {
					attachmentCreate(input: {
						issueId: $issueId
						url: $url
						title: $title
						subtitle: $subtitle
					}) {
						success
						attachment {
							id
							url
							title
							subtitle
							createdAt
							updatedAt
						}
					}
				}`,
				variables: {
					issueId,
					url,
					...additionalFields,
				},
			};

			const responseData = await linearApiRequest.call(this, body);
			const attachment = (
				responseData as { data: { attachmentCreate: { attachment: IDataObject } } }
			).data.attachmentCreate?.attachment;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(attachment), {
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
