import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135320-getpusheventsettings.html" target="_blank" rel="noopener noreferrer">Get Push Event Settings</a>',
		name: 'getPushEventSettingsDocsNotice',
		type: 'notice',
		default: '',
	},
];

const displayOptions = {
	show: { category: ['push'], action: ['getPushEventSettings'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const responseData = await gravityZoneApiRequest.call(this, 'push', 'getPushEventSettings', {});

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
