import type { IExecuteFunctions } from 'n8n-workflow';

import type { IEmail } from '@utils/sendAndWait/interfaces';

import { googleApiRequest } from '../../GenericFunctions';

function setEmailReplyHeaders(email: IEmail, messageId: string | undefined): void {
	if (messageId) {
		email.inReplyTo = messageId;
		email.references = messageId;
	}
}

function setThreadHeaders(
	email: IEmail,
	thread: { messages: Array<{ payload: { headers: Array<{ name: string; value: string }> } }> },
): void {
	if (thread?.messages) {
		const lastMessage = thread.messages.length - 1;
		const messageId = thread.messages[lastMessage].payload.headers.find(
			(header: { name: string; value: string }) =>
				header.name.toLowerCase().includes('message') && header.name.toLowerCase().includes('id'),
		)?.value;

		setEmailReplyHeaders(email, messageId);
	}
}

/**
 * Adds inReplyTo and reference headers to the email if threadId is provided.
 */
export async function addThreadHeadersToEmail(
	this: IExecuteFunctions,
	email: IEmail,
	threadId: string,
): Promise<void> {
	const thread = await googleApiRequest.call(
		this,
		'GET',
		`/gmail/v1/users/me/threads/${threadId}`,
		{},
		{ format: 'metadata', metadataHeaders: ['Message-ID'] },
	);

	setThreadHeaders(email, thread);
}
