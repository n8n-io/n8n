import type { IExecuteFunctions } from 'n8n-workflow';

import type { IEmail } from '@utils/sendAndWait/interfaces';

import { googleApiRequest } from '../../GenericFunctions';

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

	if (thread?.messages) {
		const lastMessage = thread.messages.length - 1;
		const messageId: string = thread.messages[lastMessage].payload.headers[0].value;

		email.inReplyTo = messageId;
		email.reference = messageId;
	}
}
