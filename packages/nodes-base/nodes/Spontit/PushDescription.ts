import {
	INodeProperties,
} from 'n8n-workflow';

export const pushOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'push',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a push notification',
			},
		],
		default: 'push',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const pushFields = [
	/* -------------------------------------------------------------------------- */
	/*                                push:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'push',
				],
			},
		},
		description: `To provide text in a push, supply one of either "content" or "pushContent" (or both).
		Limited to 2500 characters. (Required if a value for "pushContent" is not provided).`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'push',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Channel Name',
				name: 'channelName',
				type: 'string',
				default: '',
				description: 'The name of a channel you created. If you have not yet created a channel, simply don\'t provide this value and the push will be sent to your main account.',
			},
			{
				displayName: 'Expiration Stamp',
				name: 'expirationStamp',
				type: 'dateTime',
				default: '',
				description: 'A Unix timestamp. When to automatically expire your push notification. The default is 10 days after pushing. The push will become unaccessible within 15-30 minutes of the selected time, but will remain on all device screens until dismissed or clicked.',
			},
			{
				displayName: 'iOS DeepLink',
				name: 'iOSDeepLink',
				type: 'string',
				default: '',
				description: 'An iOS deep link. Use this to deep link into other apps. Alternatively, you can provide a universal link in the link attribute and set openLinkInApp to false.',
			},
			{
				displayName: 'Link',
				name: 'link',
				type: 'string',
				default: '',
				description: 'A link that can be attached to your push. Must be a valid URL.',
			},
			{
				displayName: 'Open In Home Feed',
				name: 'openInHomeFeed',
				type: 'boolean',
				default: false,
				description: 'Control whether the notification opens to the home feed or to a standalone page with the notification. The default (openInHomeFeed=False) is to open the notification on a standalone page.',
			},
			{
				displayName: 'Open Link In App',
				name: 'openLinkInApp',
				type: 'boolean',
				default: false,
				description: 'Whether to open the provided link within the iOS app or in Safari. Android PWA opens all links in the default web browser.',
			},
			{
				displayName: 'Push To Emails',
				name: 'pushToEmails',
				type: 'string',
				default: '',
				required: false,
				description: `Emails (strings) to whom to send the notification.<br>
				If all three attributes 'pushToFollowers', 'pushToPhoneNumbers' and 'pushToEmails'<br>
				are not supplied, then everyone who follows the channel will receive the push notification.<br>
				If 'pushToFollowers' is supplied, only those listed in the array will receive the push notification.<br>
				If one of the userIds supplied does not follow the specified channel, then that userId value will be ignored.<br>
				See the "Followers" section to learn how to list the userIds of those who follow one of your channels.`,
			},
			{
				displayName: 'Push To Followers',
				name: 'pushToFollowers',
				type: 'string',
				default: '',
				description: `User IDs (strings) to whom to send the notification.<br>
				If all three attributes 'pushToFollowers', 'pushToPhoneNumbers' and 'pushToEmails'<br>
				are not supplied, then everyone who follows the channel will receive the push notification.<br>
				If 'pushToFollowers' is supplied, only those listed in the array will receive the push notification.<br>
				If one of the userIds supplied does not follow the specified channel, then that userId value will be ignored.<br>
				See the "Followers" section to learn how to list the userIds of those who follow one of your channels.`,
			},
			{
				displayName: 'Push To Phone Numbers',
				name: 'pushToPhoneNumbers',
				type: 'string',
				default: '',
				description: `Phone numbers (strings) to whom to send the notification.<br>
				If all three attributes 'pushToFollowers', 'pushToPhoneNumbers' and 'pushToEmails'<br>
				are not supplied, then everyone who follows the channel will receive the push notification.<br>
				If 'pushToFollowers' is supplied, only those listed in the array will receive the push notification.<br>
				If one of the userIds supplied does not follow the specified channel, then that userId value will be ignored.<br>
				See the "Followers" section to learn how to list the userIds of those who follow one of your channels.`,
			},
			{
				displayName: 'Subtitle',
				name: 'subtitle',
				type: 'string',
				default: '',
				description: 'The subtitle of your push. Limited to 20 characters. Only appears on iOS devices.',
			},
			{
				displayName: 'Title',
				name: 'pushTitle',
				type: 'string',
				default: '',
				description: 'The title of push. Appears in bold at the top. Limited to 100 characters.',
			},
			{
				displayName: 'Schedule',
				name: 'schedule',
				type: 'dateTime',
				default: '',
				description: 'A Unix timestamp. Schedule a push to be sent at a later date and time.',
			},
		],
	},
] as INodeProperties[];
