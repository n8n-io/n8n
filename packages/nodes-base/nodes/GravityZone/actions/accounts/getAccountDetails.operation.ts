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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1081603-getaccountdetails.html" target="_blank" rel="noopener noreferrer">Get Account Details</a>',
		name: 'getAccountDetailsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		default: '',
		description:
			'The ID of the account to retrieve details for. If not provided, defaults to the account that generated the API key.',
	},
];

const displayOptions = {
	show: { category: ['accounts'], action: ['getAccountDetails'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const accountId = this.getNodeParameter('accountId', i) as string;

	const params: IDataObject = {};

	if (accountId) params.accountId = accountId;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'accounts',
		'getAccountDetails',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
