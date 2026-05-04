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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-126234-getnotificationssettings.html" target="_blank" rel="noopener noreferrer">Get Notifications Settings</a>',
		name: 'getNotificationsSettingsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		default: '',
		description:
			'The ID of the account to get notification settings for. If not provided, retrieves settings for the account that generated the API key.',
	},
];

const displayOptions = {
	show: { category: ['accounts'], action: ['getNotificationsSettings'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const accountId = this.getNodeParameter('accountId', i) as string;

	const params: IDataObject = {};

	if (accountId) params.accountId = accountId;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'accounts',
		'getNotificationsSettings',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
