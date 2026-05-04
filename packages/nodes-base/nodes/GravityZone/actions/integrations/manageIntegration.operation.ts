import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1300652-manageintegration.html" target="_blank" rel="noopener noreferrer">Manage Integration</a>',
		name: 'manageIntegrationDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Integration ID',
		name: 'integrationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the integration you want to enable or disable',
	},
	{
		displayName: 'Action',
		name: 'integrationAction',
		type: 'options',
		required: true,
		default: 'enable',
		options: [
			{ name: 'Enable', value: 'enable' },
			{ name: 'Disable', value: 'disable' },
		],
		description: 'Whether to enable or disable the integration',
	},
];

const displayOptions = {
	show: { category: ['integrations'], action: ['manageIntegration'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const integrationId = this.getNodeParameter('integrationId', i) as string;
	const integrationAction = this.getNodeParameter('integrationAction', i) as string;

	const params: IDataObject = { integrationId, action: integrationAction };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'integrations',
		'manageIntegration',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
