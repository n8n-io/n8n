import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { theHiveApiRequest } from '../../transport';
import { caseRLC } from '../../descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Update in ...',
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
		...caseRLC,
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

	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const location = this.getNodeParameter('location', i) as string;
	const pageId = this.getNodeParameter('pageId', i) as string;
	const content = this.getNodeParameter('content', i, '') as string;
	const options = this.getNodeParameter('options', i, {});

	let endpoint;

	if (location === 'case') {
		const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;
		endpoint = `/v1/case/${caseId}/page/${pageId}`;
	} else {
		endpoint = `/v1/page/${pageId}`;
	}

	const body: IDataObject = options;

	if (content) {
		body.content = content;
	}

	responseData = await theHiveApiRequest.call(this, 'PATCH', endpoint, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
