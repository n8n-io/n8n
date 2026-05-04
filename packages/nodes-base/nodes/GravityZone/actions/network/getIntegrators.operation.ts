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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1300806-getintegrators.html" target="_blank" rel="noopener noreferrer">Get Integrators</a>',
		name: 'getIntegratorsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Integration ID',
		name: 'integrationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the integration to retrieve the list of integrators for',
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['getIntegrators'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const integrationId = this.getNodeParameter('integrationId', i) as string;

	const params: IDataObject = { integrationId };

	const responseData = await gravityZoneApiRequest.call(this, 'network', 'getIntegrators', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
