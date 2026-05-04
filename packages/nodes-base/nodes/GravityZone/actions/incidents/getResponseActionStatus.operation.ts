import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1002923-getresponseactionstatus.html" target="_blank" rel="noopener noreferrer">Get Response Action Status</a>',
		name: 'getResponseActionStatusDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Action ID',
		name: 'actionId',
		type: 'string',
		required: true,
		default: '',
		description: 'The action ID returned by the "Create Response Action" action',
	},
];

const displayOptions = {
	show: { category: ['incidents'], action: ['getResponseActionStatus'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const actionId = this.getNodeParameter('actionId', i) as string;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'incidents',
		'getResponseActionStatus',
		{ actionId },
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
