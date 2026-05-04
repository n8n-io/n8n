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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135304-getpolicydetails.html" target="_blank" rel="noopener noreferrer">Get Policy Details</a>',
		name: 'getPolicyDetailsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Policy ID',
		name: 'policyId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the policy you want to get details for',
	},
];

const displayOptions = {
	show: { category: ['policies'], action: ['getPolicyDetails'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const policyId = this.getNodeParameter('policyId', i) as string;

	const params: IDataObject = { policyId };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'policies',
		'getPolicyDetails',
		params,
		'v1.1',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
