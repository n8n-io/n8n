import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import {
	getSendAndWaitConfig,
	getSendAndWaitProperties,
} from '../../../../../../utils/sendAndWait/utils';
import { createUtmCampaignLink } from '../../../../../../utils/utilities';
import { chatRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = getSendAndWaitProperties(
	[chatRLC],
	'chatMessage',
	undefined,
	{
		noButtonStyle: true,
		defaultApproveLabel: '✓ Approve',
		defaultDisapproveLabel: '✗ Decline',
	},
).filter((p) => p.name !== 'subject');

export async function execute(this: IExecuteFunctions, i: number, instanceId: string) {
	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	const config = getSendAndWaitConfig(this);

	const buttons = config.options.map(
		(option) => `<a href="${config.url}?approved=${option.value}">${option.label}</a>`,
	);

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

	return await microsoftApiRequest.call(this, 'POST', `/v1.0/chats/${chatId}/messages`, body);
}
