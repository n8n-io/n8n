/* eslint-disable n8n-nodes-base/node-param-default-missing */
import type { INodePropertyMode } from 'n8n-workflow';

export const slackChannelModes: INodePropertyMode[] = [
	{
		displayName: 'From List',
		name: 'list',
		type: 'list',
		placeholder: 'Select a channel...',
		typeOptions: {
			searchListMethod: 'getChannels',
			searchable: true,
			slowLoadNotice: {
				message: 'If loading is slow, try selecting a channel using "By ID" or "By URL"',
				timeout: 15000,
			},
		},
	},
	{
		displayName: 'By ID',
		name: 'id',
		type: 'string',
		validation: [
			{
				type: 'regex',
				properties: {
					regex: '[a-zA-Z0-9]{2,}',
					errorMessage: 'Not a valid Slack Channel ID',
				},
			},
		],
		placeholder: 'C0122KQ70S7E',
	},
	{
		displayName: 'By URL',
		name: 'url',
		type: 'string',
		placeholder: 'https://app.slack.com/client/TS9594PZK/B0556F47Z3A',
		validation: [
			{
				type: 'regex',
				properties: {
					regex: 'http(s)?://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
					errorMessage: 'Not a valid Slack Channel URL',
				},
			},
		],
		extractValue: {
			type: 'regex',
			regex: 'https://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
		},
	},
];
