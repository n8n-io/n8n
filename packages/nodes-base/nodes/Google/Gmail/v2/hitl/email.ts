import {
	createEmailBodyWithN8nAttribution,
	createEmailBodyWithoutN8nAttribution,
} from '@utils/sendAndWait/email-templates';
import type { IEmail } from '@utils/sendAndWait/interfaces';
import { createButton, createEmail, getSendAndWaitConfig } from '@utils/sendAndWait/utils';
import type { IExecuteFunctions } from 'n8n-workflow';

import type { GmailHitlEmailOptions } from './descriptions';
import { googleApiRequest, prepareEmailsInput } from '../../GenericFunctions';
import { addThreadHeadersToEmail } from '../utils/draft';

/**
 * Builds the Send and Wait email. With the advanced section off, delegates to
 * the shared `createEmail` so behavior matches nodes without the section.
 */
export async function createSendAndWaitEmail(
	context: IExecuteFunctions,
): Promise<{ email: IEmail; threadId?: string }> {
	const advancedEmail = context.getNodeParameter('advancedEmail', 0, false) as boolean;

	if (!advancedEmail) {
		return { email: createEmail(context) };
	}

	const options = context.getNodeParameter('advancedEmailOptions', 0, {}) as GmailHitlEmailOptions;
	const sendTo = context.getNodeParameter('sendTo', 0, '') as string;
	const config = getSendAndWaitConfig(context);
	const buttons = config.options.map((option) =>
		createButton(option.url, option.label, option.style),
	);

	const htmlBody =
		config.appendAttribution !== false
			? createEmailBodyWithN8nAttribution(
					config.message,
					buttons.join('\n'),
					context.getInstanceId(),
				)
			: createEmailBodyWithoutN8nAttribution(config.message, buttons.join('\n'));

	const email: IEmail = {
		to: prepareEmailsInput.call(context, sendTo, 'To', 0),
		subject: config.title,
		body: '',
		htmlBody,
	};

	if (options.ccList) {
		email.cc = prepareEmailsInput.call(context, options.ccList, 'CC', 0);
	}
	if (options.bccList) {
		email.bcc = prepareEmailsInput.call(context, options.bccList, 'BCC', 0);
	}
	if (options.replyTo) {
		email.replyTo = prepareEmailsInput.call(context, options.replyTo, 'ReplyTo', 0);
	}

	if (options.senderName) {
		const { emailAddress } = await googleApiRequest.call(
			context,
			'GET',
			'/gmail/v1/users/me/profile',
		);
		email.from = `${options.senderName} <${emailAddress as string}>`;
	}

	if (options.threadId) {
		await addThreadHeadersToEmail.call(context, email, options.threadId);
		return { email, threadId: options.threadId };
	}

	return { email };
}
