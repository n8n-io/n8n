import {
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as campaign from './campaign';
import * as userList from './userList';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Google Ads',
	name: 'googleAds',
	icon: 'file:googleAds.svg',
	group: ['transform'],
	version: 1,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Use the Google Ads API',
	defaults: {
		name: 'Google Ads',
		color: '#1A82e2',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'googleAdsOAuth2Api',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [
				{
					name: 'Campaign',
					value: 'campaign',
				},
				{
					name: 'User List',
					value: 'userList',
				},
			],
			default: 'campaign',
			description: 'The resource to operate on',
		},
		...campaign.descriptions,
		...userList.descriptions,
	],
};
