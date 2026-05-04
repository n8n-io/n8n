import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1300589-createintegration.html" target="_blank" rel="noopener noreferrer">Create Integration</a>',
		name: 'createIntegrationDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the integration',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		options: [
			{
				name: 'VMware Integration',
				value: 1,
			},
		],
		default: 1,
		description: 'The integration type',
	},
	{
		displayName: 'Specifics (JSON)',
		name: 'specificsJson',
		type: 'json',
		required: true,
		default: '{}',
		description: 'A specifics object',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
];

const displayOptions = {
	show: { category: ['integrations'], action: ['createIntegration'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('name', i) as string;
	const type = this.getNodeParameter('type', i) as number;
	const specifics = processJsonInput(
		this.getNodeParameter('specificsJson', i),
		'Specifics',
	) as IDataObject;

	const params: IDataObject = { name, type, specifics };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'integrations',
		'createIntegration',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
