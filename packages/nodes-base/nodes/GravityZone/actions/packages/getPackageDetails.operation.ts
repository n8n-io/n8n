import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135301-getpackagedetails.html" target="_blank" rel="noopener noreferrer">Get Package Details</a>',
		name: 'getPackageDetailsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Package ID',
		name: 'packageId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the package to get details for',
	},
];

const displayOptions = {
	show: { category: ['packages'], action: ['getPackageDetails'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const packageId = this.getNodeParameter('packageId', i) as string;

	const responseData = await gravityZoneApiRequest.call(this, 'packages', 'getPackageDetails', {
		packageId,
	});

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
