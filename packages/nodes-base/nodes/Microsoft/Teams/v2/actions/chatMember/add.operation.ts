import {
	type INodeProperties,
	type IExecuteFunctions,
	type IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { chatRLC, userRLC } from '../../descriptions';
import {
	buildTeamsPath,
	getGraphBaseUrl,
	microsoftApiRequest,
	SP_HIDE,
	validateTeamsId,
} from '../../transport';
import { throwIfChatMemberUnsupported } from './sharedGuard';

const properties: INodeProperties[] = [
	chatRLC,
	userRLC,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		description: 'Other options to set',
		placeholder: 'Add option',
		options: [
			{
				displayName: 'History Start Date',
				name: 'historyStartDate',
				type: 'dateTime',
				default: '',
				description: 'Point in time from which the chat history is shared',
				displayOptions: {
					show: {
						shareHistory: ['fromDate'],
					},
				},
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				default: 'owner',
				description:
					'Select Guest for a B2B guest user, since adding a guest as an owner fails. A guest must be identified by object ID, not by user principal name.',
				options: [
					{
						name: 'Guest',
						value: 'guest',
					},
					{
						name: 'Owner',
						value: 'owner',
					},
				],
			},
			{
				displayName: 'Share History',
				name: 'shareHistory',
				type: 'options',
				default: 'none',
				description: 'How much of the existing chat history the new member can read',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'From Date',
						value: 'fromDate',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['chatMember'],
		operation: ['add'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/chat-post-members?view=graph-rest-1.0

	// App-only Graph cannot change chat membership; fail before any request.
	throwIfChatMemberUnsupported.call(this, i);

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	// Direct validator call rather than buildTeamsPath: this id is interpolated into
	// the body, and RLC `validation` is UI-only, so an expression can still supply
	// anything. The returned value (trimmed, decoded) is what must be interpolated.
	const userId = validateTeamsId(
		this.getNodeParameter('userId', i, '', { extractValue: true }) as string,
		this.getNode(),
	);
	const options = this.getNodeParameter('options', i, {});

	const body: IDataObject = {
		'@odata.type': '#microsoft.graph.aadUserConversationMember',
		'user@odata.bind': `${await getGraphBaseUrl.call(this)}/v1.0/users/${userId}`,
		roles: [options.role ?? 'owner'],
	};

	// Not inverted: omitting the field shares NO history, and the 0001-01-01 sentinel
	// shares the WHOLE history.
	if (options.shareHistory === 'all') {
		body.visibleHistoryStartDateTime = '0001-01-01T00:00:00Z';
	} else if (options.shareHistory === 'fromDate') {
		if (!options.historyStartDate) {
			throw new NodeOperationError(this.getNode(), 'No history start date was given', {
				description: 'Set "History Start Date", or change "Share History" to "All" or "None".',
				itemIndex: i,
			});
		}
		body.visibleHistoryStartDateTime = options.historyStartDate;
	}

	await microsoftApiRequest.call(
		this,
		'POST',
		buildTeamsPath.call(this, ['/v1.0/chats/', { id: chatId }, '/members']),
		body,
	);

	// Graph answers 201 with a Location header and no body.
	return { success: true };
}
