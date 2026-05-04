import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-125283-deleteaccount.html" target="_blank" rel="noopener noreferrer">Delete Account</a>',
		name: 'deleteAccountDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the account to delete',
	},
];

const displayOptions = {
	show: { category: ['accounts'], action: ['deleteAccount'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const accountId = this.getNodeParameter('accountId', i) as string;

	const responseData = await gravityZoneApiRequest.call(this, 'accounts', 'deleteAccount', {
		accountId,
	});

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
