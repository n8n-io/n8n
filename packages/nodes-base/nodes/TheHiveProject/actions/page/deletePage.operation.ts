import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { caseRLC, pageRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Delete From ...',
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
		default: 'knowledgeBase',
	},
	{
		...caseRLC,
		displayOptions: {
			show: {
				location: ['case'],
			},
		},
	},
	pageRLC,
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['deletePage'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const location = this.getNodeParameter('location', i) as string;
	const pageId = this.getNodeParameter('pageId', i, '', { extractValue: true }) as string;

	let endpoint;

	if (location === 'case') {
		const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;
		endpoint = `/v1/case/${caseId}/page/${pageId}`;
	} else {
		endpoint = `/v1/page/${pageId}`;
	}

	await theHiveApiRequest.call(this, 'DELETE', endpoint);

	const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
		itemData: { item: i },
	});

	return executionData;
}
