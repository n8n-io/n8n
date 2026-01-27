/* eslint-disable n8n-nodes-base/node-param-default-missing */
import type { INodePropertyMode } from 'n8n-workflow';

/**
 * Converts a timestamp value to Slack's Unix timestamp format.
 * Handles both ISO date strings (from date picker) and Slack timestamps (numeric strings).
 *
 * @param value - The timestamp value (ISO date string or Slack timestamp)
 * @returns Unix timestamp in seconds (with optional microseconds for Slack timestamps)
 */
export function parseSlackTimestamp(value: string): number | string {
	// Check if the value looks like a Slack timestamp (numeric, possibly with decimal)
	// Slack timestamps are Unix timestamps in seconds, like "1663233118.856619"
	if (/^\d+(\.\d+)?$/.test(value)) {
		return value;
	}

	// Otherwise, treat it as an ISO date string and convert to Unix timestamp
	const date = new Date(value);
	if (isNaN(date.getTime())) {
		// If parsing fails, return the original value and let Slack API handle validation
		return value;
	}
	return date.getTime() / 1000;
}

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
