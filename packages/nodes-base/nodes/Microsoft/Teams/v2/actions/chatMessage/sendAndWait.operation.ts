import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import {
	getSendAndWaitConfig,
	getSendAndWaitProperties,
} from '../../../../../../utils/sendAndWait/utils';
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

	const attributionText = '_This message was sent automatically with_';
	const link = `https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=${encodeURIComponent(
		'n8n-nodes-base.telegram',
	)}${instanceId ? '_' + instanceId : ''}`;
	const attribution = `${attributionText} [n8n](${link})`;

	const buttons: string[] = config.options.map(
		(option) => `[${option.label}](${`${config.url}?approved=${option.value}`})`,
	);

	const content = `${config.message}\n\n${buttons.join('   ')}\n\n${attribution}`;

	const body = {
		body: {
			contentType: 'text',
			content,
		},
	};

	return await microsoftApiRequest.call(this, 'POST', `/v1.0/chats/${chatId}/messages`, body);
}
