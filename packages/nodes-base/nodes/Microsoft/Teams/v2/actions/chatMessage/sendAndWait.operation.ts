import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import {
	getSendAndWaitConfig,
	getSendAndWaitProperties,
} from '../../../../../../utils/sendAndWait/utils';
import { createUtmCampaignLink } from '../../../../../../utils/utilities';
import { chatRLC } from '../../descriptions';
import { microsoftApiRequest, SP_HIDE } from '../../transport';
import { throwIfChatUnsupported } from './sharedGuard';

export const description: INodeProperties[] = getSendAndWaitProperties(
	[chatRLC],
	'chatMessage',
	undefined,
	{
		noButtonStyle: true,
		defaultApproveLabel: '✓ Approve',
		defaultDisapproveLabel: '✗ Decline',
	},
)
	.filter((p) => p.name !== 'subject')
	.map((property) => ({
		...property,
		displayOptions: {
			...property.displayOptions,
			hide: {
				...property.displayOptions?.hide,
				...SP_HIDE,
			},
		},
	}));

export async function execute(this: IExecuteFunctions, i: number, instanceId: string) {
	// App-only Graph cannot post chat messages. Dispatched from the router before the
	// item loop, so this guard fires before any putExecutionToWait.
	throwIfChatUnsupported.call(this);

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	const config = getSendAndWaitConfig(this);

	const buttons = config.options.map((option) => `<a href="${option.url}">${option.label}</a>`);

	let content = `${config.message}<br><br>${buttons.join(' ')}`;

	if (config.appendAttribution !== false) {
		const attributionText = 'This message was sent automatically with';
		const link = createUtmCampaignLink('n8n-nodes-base.microsoftTeams', instanceId);
		const attribution = `<em>${attributionText} <a href="${link}">n8n</a></em>`;
		content += `<br><br>${attribution}`;
	}

	const body = {
		body: {
			contentType: 'html',
			content,
		},
	};

	// OAuth2-only path (chatMessage is hidden + guarded under SP by throwIfChatUnsupported
	// above), so `chatId` is interpolated raw without buildTeamsPath by design.
	return await microsoftApiRequest.call(this, 'POST', `/v1.0/chats/${chatId}/messages`, body);
}
