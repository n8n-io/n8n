import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import moment = require('moment');
import {OptionsWithUri} from "request";

export class Spontit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Spontit',
		name: 'spontit',
		icon: 'file:spontit.png',
		group: ['output'],
		version: 1,
		description: 'Send notifications via Spontit API',
		defaults: {
			name: 'Spontit',
			color: '#00deff',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'spontitApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				placeholder: 'Text to push',
				required: false,
				description: 'To provide text in a push, supply one of either "content" or "pushContent" (or both). Limited to 2500 characters. (Required if a value for "pushContent" is not provided).',
			},
			{
				displayName: 'PushContent',
				name: 'pushContent',
				type: 'string',
				default: '',
				placeholder: 'Text to push',
				required: false,
				description: 'If you want to control exactly what shows when the notification pops up, then provide a value for "pushContent". Limited to 100 characters. The value provided for "pushContent" will appear when the notification first pops up. Once the user opens the notification, they will then see the value provided for "pushContent" and for "content" (if any). (Required if a value for "content" is not provided).',
			},
			{
				displayName: 'PushTitle',
				name: 'pushTitle',
				type: 'string',
				default: '',
				placeholder: 'Title',
				required: false,
				description: 'The title of push. Appears in bold at the top. Limited to 100 characters.',
			},
			{
				displayName: 'ChannelName',
				name: 'channelName',
				type: 'string',
				default: '',
				placeholder: 'Channelname',
				required: false,
				description: 'The name of a channel you created. If you have not yet created a channel, simply don\'t provide this value and the push will be sent to your main account.',
			},
			{
				displayName: 'Subtitle',
				name: 'subtitle',
				type: 'string',
				default: '',
				placeholder: 'Subtitle',
				required: false,
				description: 'The subtitle of your push. Limited to 20 characters. Only appears on iOS devices.',
			},
			{
				displayName: 'Link',
				name: 'link',
				type: 'string',
				default: '',
				placeholder: 'https://...',
				required: false,
				description: 'A link that can be attached to your push. Must be a valid URL.',
			},
			{
				displayName: 'PushToFollowers',
				name: 'pushToFollowers',
				type: 'string',
				default: '',
				required: false,
				description: `An array of userIds (strings) to whom to send the notification. If all three attributes 'pushToFollowers', 'pushToPhoneNumbers' and 'pushToEmails' are not supplied, then everyone who follows the channel will receive the push notification. If 'pushToFollowers' is supplied, only those listed in the array will receive the push notification. If one of the userIds supplied does not follow the specified channel, then that userId value will be ignored. See the "Followers" section to learn how to list the userIds of those who follow one of your channels.`,
			},
			{
				displayName: 'PushToPhoneNumbers',
				name: 'pushToPhoneNumbers',
				type: 'string',
				default: '',
				required: false,
				description: `An array of phoneNumbers (strings) to whom to send the notification. If all three attributes 'pushToFollowers', 'pushToPhoneNumbers' and 'pushToEmails' are not supplied, then everyone who follows the channel will receive the push notification. If 'pushToPhoneNumbers' is supplied, then we will map the numbers to Spontit accounts and push accordingly. The users specified by 'pushToPhoneNumbers' do not have to follow the specified channel in order to receive the push. However, they can report your push as spam if they do not follow you and do not wish to receive your pushes.`,
			},
			{
				displayName: 'pushToEmails',
				name: 'pushToEmails',
				type: 'string',
				default: '',
				required: false,
				description: `An array of emails (strings) to whom to send the notification. If all three attributes 'pushToFollowers', 'pushToPhoneNumbers' and 'pushToEmails' are not supplied, then everyone who follows the channel will receive the push notification. If 'pushToEmails' is supplied, then we will map the emails to Spontit accounts and push accordingly. The users specified by 'pushToEmails' do not have to follow the specified channel in order to receive the push. However, they can report your push as spam if they do not follow you and do not wish to receive your pushes.`,
			},
			{
				displayName: 'Schedule',
				name: 'schedule',
				type: 'dateTime',
				default: '',
				required: false,
				description: 'A Unix timestamp. Schedule a push to be sent at a later date and time.',
			},
			{
				displayName: 'ExpirationStamp',
				name: 'expirationStamp',
				type: 'dateTime',
				default: '',
				required: false,
				description: 'A Unix timestamp. When to automatically expire your push notification. The default is 10 days after pushing. The push will become unaccessible within 15-30 minutes of the selected time, but will remain on all device screens until dismissed or clicked.',
			},
			{
				displayName: 'OpenLinkInApp',
				name: 'openLinkInApp',
				type: 'boolean',
				default: false,
				required: false,
				description: 'Whether to open the provided link within the iOS app or in Safari. Android PWA opens all links in the default web browser.',
			},
			{
				displayName: 'OpenInHomeFeed',
				name: 'openInHomeFeed',
				type: 'boolean',
				default: false,
				required: false,
				description: 'Control whether the notification opens to the home feed or to a standalone page with the notification. The default (openInHomeFeed=False) is to open the notification on a standalone page.',
			},
			{
				displayName: 'iOSDeepLink',
				name: 'iOSDeepLink',
				type: 'string',
				default: '',
				placeholder: '',
				required: false,
				description: 'An iOS deep link. Use this to deep link into other apps. Alternatively, you can provide a universal link in the link attribute and set openLinkInApp to false.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const timezone = this.getTimezone();

		const credentials = this.getCredentials('spontitApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}
		const headers: IDataObject = {};
		headers["X-Authorization"] = credentials.apiKey;
		headers["X-UserId"] = credentials.userId;

		for (let i = 0; i < items.length; i++) {
			let body: IDataObject;
			body = { }

			const content = this.getNodeParameter('content', i) as string;
			if (content) {
				body.content = content;
			}

			const pushContent = this.getNodeParameter('pushContent', i) as string;
			if (pushContent) {
				body.pushContent = pushContent;
			}

			const pushTitle = this.getNodeParameter('pushTitle', i) as string;
			if (pushTitle) {
				body.pushTitle = pushTitle;
			}

			const channelName = this.getNodeParameter('channelName', i) as string;
			if (channelName) {
				body.channelName = channelName;
			}

			const subtitle = this.getNodeParameter('subtitle', i) as string;
			if (subtitle) {
				body.subtitle = subtitle;
			}

			const link = this.getNodeParameter('link', i) as string;
			if (link) {
				body.link = link;
			}

			const pushToFollowers = this.getNodeParameter('pushToEmails', i) as string;
			if (pushToFollowers) {
				body.pushToFollowers = pushToFollowers.split(',');
			}

			const pushToPhoneNumbers = this.getNodeParameter('pushToPhoneNumbers', i) as string;
			if (pushToPhoneNumbers) {
				body.pushToPhoneNumbers = pushToPhoneNumbers.split(',');
			}

			const pushToEmails = this.getNodeParameter('pushToEmails', i) as string;
			if (pushToEmails) {
				body.pushToEmails = pushToEmails.split(',');
			}

			const schedule = this.getNodeParameter('schedule', i) as string;
			if (schedule) {
				body.schedule = moment.tz(schedule, timezone).unix();
			}

			const expirationStamp = this.getNodeParameter('expirationStamp', i) as string;
			if (expirationStamp) {
				body.expirationStamp = moment.tz(expirationStamp, timezone).unix();
			}


			const openLinkInApp = this.getNodeParameter('openLinkInApp', i) as string;
			if (openLinkInApp) {
				body.openLinkInApp = openLinkInApp;
			}

			const openInHomeFeed = this.getNodeParameter('openInHomeFeed', i) as string;
			if (openInHomeFeed) {
				body.openInHomeFeed = openInHomeFeed;
			}

			const iOSDeepLink = this.getNodeParameter('iOSDeepLink', i) as string;
			if (iOSDeepLink) {
				body.iOSDeepLink = iOSDeepLink;
			}

			const options: OptionsWithUri = {
				method: 'POST',
				body,
				headers,
				uri: `https://api.spontit.com/v3/push`,
				json: true,
			};

			const responseData = await this.helpers.request(options);

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
