import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-140282-getapikeydetails.html" target="_blank" rel="noopener noreferrer">Get API Key Details</a>',
		name: 'getApiKeyDetailsDocsNotice',
		type: 'notice',
		default: '',
	},
];

const displayOptions = {
	show: { category: ['general'], action: ['getApiKeyDetails'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const responseData = await gravityZoneApiRequest.call(this, 'general', 'getApiKeyDetails', {});

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
