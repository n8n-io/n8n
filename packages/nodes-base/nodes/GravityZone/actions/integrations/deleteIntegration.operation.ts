import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1300625-deleteintegration.html" target="_blank" rel="noopener noreferrer">Delete Integration</a>',
		name: 'deleteIntegrationDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Integration ID',
		name: 'integrationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the integration to delete',
	},
];

const displayOptions = {
	show: { category: ['integrations'], action: ['deleteIntegration'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const integrationId = this.getNodeParameter('integrationId', i) as string;

	const responseData = await gravityZoneApiRequest.call(this, 'integrations', 'deleteIntegration', {
		integrationId,
	});

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
