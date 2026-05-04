import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-587809-getmanuallyapprovedpatches.html" target="_blank" rel="noopener noreferrer">Get Manually Approved Patches</a>',
		name: 'getManuallyApprovedPatchesDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The ID of the company to retrieve patches for. Defaults to the company the API key belongs to.',
	},
];

const displayOptions = {
	show: { category: ['maintenance_windows'], action: ['getManuallyApprovedPatches'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const companyId = this.getNodeParameter('companyId', i) as string;

	const params = { companyId };

	const responseData = await gravityZoneApiRequest.call(
		this,
		'maintenanceWindows',
		'getManuallyApprovedPatches',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
