import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Create in ...',
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
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
	},
	{
		displayName: 'Category',
		name: 'category',
		type: 'string',
		default: '',
		required: true,
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		required: true,
		typeOptions: {
			rows: 2,
		},
	},
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const location = this.getNodeParameter('location', i) as string;
	const title = this.getNodeParameter('title', i) as string;
	const category = this.getNodeParameter('category', i) as string;
	const content = this.getNodeParameter('content', i) as string;

	let endpoint;

	if (location === 'case') {
		const caseId = this.getNodeParameter('caseId', i) as string;
		endpoint = `/v1/case/${caseId}/page`;
	} else {
		endpoint = '/v1/page';
	}

	const body: IDataObject = {
		title,
		category,
		content,
	};

	responseData = await theHiveApiRequest.call(this, 'POST', endpoint, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
