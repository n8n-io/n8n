import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { ISSUE_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	ISSUE_LOCATOR,
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		description: 'The URL to attach to the issue',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'The attachment title',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
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
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const issueId = this.getNodeParameter('issueId', i, '', { extractValue: true }) as string;
	const url = this.getNodeParameter('url', i) as string;
	const title = this.getNodeParameter('title', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i) as Record<string, unknown>;

	const body = {
		query: `mutation AttachmentCreate($issueId: String!, $url: String!, $title: String!, $subtitle: String) {
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
			title,
			...additionalFields,
		},
	};

	const responseData = await linearApiRequest.call(this, body);
	const attachment = (responseData as { data: { attachmentCreate: { attachment: IDataObject } } })
		.data.attachmentCreate?.attachment;

	return attachment;
}
