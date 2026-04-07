import type { IWebhookFunctions } from 'n8n-workflow';

import { sendAndWaitWebhook } from '@utils/sendAndWait/utils';

const PREVIEW_SERVICE_USER_AGENT_STRINGS = ['teams', 'skype', 'preview'];

export async function webhook(this: IWebhookFunctions) {
	const req = this.getRequestObject();
	const res = this.getResponseObject();
	const responseType = this.getNodeParameter('responseType', 'approval') as
		| 'approval'
		| 'freeText'
		| 'customForm';

	// Block Teams app preview requests to prevent
	// accidental approval/disapproval. Those requests
	// either don't have a User-Agent header or have a User-Agent
	// header that contains a string that matches the preview service user agent strings.
	const userAgent = (req.headers['user-agent'] ?? '').toLowerCase();
	if (
		responseType === 'approval' &&
		(!userAgent || PREVIEW_SERVICE_USER_AGENT_STRINGS.some((str) => userAgent.includes(str)))
	) {
		res.send('');
		return { noWebhookResponse: true };
	}

	return await sendAndWaitWebhook.call(this);
}
