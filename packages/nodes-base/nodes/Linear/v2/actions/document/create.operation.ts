import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { PROJECT_LOCATOR } from '../../../shared/constants';
import { extractLocatorIds, linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'The document content in markdown format',
			},
			{ ...PROJECT_LOCATOR, required: false },
		],
	},
];

const displayOptions = {
	show: {
		resource: ['document'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const title = this.getNodeParameter('title', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i) as Record<string, unknown>;
	extractLocatorIds(this, additionalFields, 'additionalFields', i);

	const body = {
		query: `mutation DocumentCreate($title: String!, $content: String, $projectId: String) {
			documentCreate(input: {
				title: $title
				content: $content
				projectId: $projectId
			}) {
				success
				document {
					id
					title
					content
					createdAt
					updatedAt
				}
			}
		}`,
		variables: { title, ...additionalFields },
	};

	const responseData = await linearApiRequest.call(this, body);
	const document = (responseData as { data: { documentCreate: { document: IDataObject } } }).data
		.documentCreate?.document;

	return document;
}
