import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import type { Approver } from './approvers';
import { configureTransport } from '../EmailSend/v2/utils';
import { slackApiRequest } from '../Slack/V2/GenericFunctions';
import { apiRequest as telegramApiRequest } from '../Telegram/GenericFunctions';
import { createEmailBodyWithN8nAttribution } from '../../utils/sendAndWait/email-templates';
import { createButton } from '../../utils/sendAndWait/utils';
import { escapeHtml } from '../../utils/utilities';

/** What one approver gets: the message, and a link for each vote. */
export interface ApprovalRequest {
	subject: string;
	message: string;
	approveUrl: string;
	/** Absent when approvers can only approve. */
	declineUrl?: string;
	fromEmail: string;
}

const APPROVE_LABEL = 'Approve';
const DECLINE_LABEL = 'Decline';

async function sendSlack(this: IExecuteFunctions, approver: Approver, request: ApprovalRequest) {
	const buttons = [
		...(request.declineUrl
			? [
					{
						type: 'button',
						text: { type: 'plain_text', text: DECLINE_LABEL },
						url: request.declineUrl,
					},
				]
			: []),
		{
			type: 'button',
			style: 'primary',
			text: { type: 'plain_text', text: APPROVE_LABEL },
			url: request.approveUrl,
		},
	];

	await slackApiRequest.call(this, 'POST', requestPath`/chat.postMessage`, {
		channel: approver.recipient,
		text: request.message,
		blocks: [
			{ type: 'section', text: { type: 'mrkdwn', text: request.message } },
			{ type: 'actions', elements: buttons },
		],
	});
}

async function sendEmail(this: IExecuteFunctions, approver: Approver, request: ApprovalRequest) {
	const buttons = [
		...(request.declineUrl ? [createButton(request.declineUrl, DECLINE_LABEL, 'secondary')] : []),
		createButton(request.approveUrl, APPROVE_LABEL, 'primary'),
	].join('\n');

	const transporter = configureTransport(await this.getCredentials('smtp'), {});
	await transporter.sendMail({
		from: request.fromEmail,
		to: approver.recipient,
		subject: request.subject,
		html: createEmailBodyWithN8nAttribution(
			escapeHtml(request.message),
			buttons,
			this.getInstanceId(),
		),
	});
}

async function sendTelegram(this: IExecuteFunctions, approver: Approver, request: ApprovalRequest) {
	const buttons = [
		...(request.declineUrl ? [{ text: `❌ ${DECLINE_LABEL}`, url: request.declineUrl }] : []),
		{ text: `✅ ${APPROVE_LABEL}`, url: request.approveUrl },
	];

	await telegramApiRequest.call(this, 'POST', 'sendMessage', {
		chat_id: approver.recipient,
		text: request.message,
		disable_web_page_preview: true,
		reply_markup: { inline_keyboard: [buttons] },
	});
}

/** Sends the approval request to one approver through the approver's channel. */
export async function sendApprovalRequest(
	this: IExecuteFunctions,
	approver: Approver,
	request: ApprovalRequest,
): Promise<void> {
	if (approver.channel === 'slack') return await sendSlack.call(this, approver, request);
	if (approver.channel === 'email') return await sendEmail.call(this, approver, request);
	return await sendTelegram.call(this, approver, request);
}
