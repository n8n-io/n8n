import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135311-disableamazonec2integration.html" target="_blank" rel="noopener noreferrer">Disable Amazon EC2 Integration</a>',
		name: 'disableAmazonEC2IntegrationDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Company ID',
				name: 'companyId',
				type: 'string',
				default: '',
				description: 'The ID of the company the integration belongs to',
			},
			{
				displayName: 'Integration Name',
				name: 'integrationName',
				type: 'string',
				default: '',
				description: 'The name identifying the specific integration to disable',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['integrations'], action: ['disableAmazonEC2Integration'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if (options.companyId) params.companyId = options.companyId;
	if (options.integrationName) params.integrationName = options.integrationName;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'integrations',
		'disableAmazonEC2Integration',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
