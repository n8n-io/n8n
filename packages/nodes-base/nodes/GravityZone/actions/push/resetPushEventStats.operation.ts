import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135323-resetpusheventstats.html" target="_blank" rel="noopener noreferrer">Reset Push Event Stats</a>',
		name: 'resetPushEventStatsDocsNotice',
		type: 'notice',
		default: '',
	},
];

const displayOptions = {
	show: { category: ['push'], action: ['resetPushEventStats'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const responseData = await gravityZoneApiRequest.call(this, 'push', 'resetPushEventStats', {});

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
