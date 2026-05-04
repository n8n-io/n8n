import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135309-generateamazonec2externalidforcrossaccountrole.html" target="_blank" rel="noopener noreferrer">Generate Amazon EC2 External ID for Cross-Account Role</a>',
		name: 'generateAmazonEC2ExternalIdForCrossAccountRoleDocsNotice',
		type: 'notice',
		default: '',
	},
];

const displayOptions = {
	show: {
		category: ['integrations'],
		action: ['generateAmazonEC2ExternalIdForCrossAccountRole'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const responseData = await gravityZoneApiRequest.call(
		this,
		'integrations',
		'generateAmazonEC2ExternalIdForCrossAccountRole',
		{},
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
