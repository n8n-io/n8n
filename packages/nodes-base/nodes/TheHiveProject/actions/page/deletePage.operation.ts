import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Create From ...',
		name: 'location',
		type: 'options',
		options: [
			{
				name: 'Case',
				value: 'case',
			},
			{
				name: 'Knowledge Base',
				value: 'knowledgeBase',
			},
		],
		default: 'case',
	},
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				location: ['case'],
			},
		},
	},
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
	},
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['deletePage'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const location = this.getNodeParameter('location', i) as string;
	const pageId = this.getNodeParameter('pageId', i) as string;

	let endpoint;

	if (location === 'case') {
		const id = this.getNodeParameter('id', i) as string;
		endpoint = `/v1/case/${id}/page/${pageId}`;
	} else {
		endpoint = `/v1/page/${pageId}`;
	}

	responseData = await theHiveApiRequest.call(this, 'DELETE', endpoint);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
