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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135300-deletepackage.html" target="_blank" rel="noopener noreferrer">Delete Package</a>',
		name: 'deletePackageDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Package ID',
		name: 'packageId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the package to delete',
	},
];

const displayOptions = {
	show: { category: ['packages'], action: ['deletePackage'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const packageId = this.getNodeParameter('packageId', i) as string;

	const params: IDataObject = { packageId };

	const responseData = await gravityZoneApiRequest.call(this, 'packages', 'deletePackage', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
