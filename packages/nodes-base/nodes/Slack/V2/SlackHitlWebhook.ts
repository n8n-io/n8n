import type { IWebhookFunctions } from 'n8n-workflow';

import { slackApiRequest } from './GenericFunctions';
import type { SendAndWaitResponder } from '../../../utils/sendAndWait/interfaces';
import { sendAndWaitWebhook } from '../../../utils/sendAndWait/utils';
import { verifySignature } from '../SlackTriggerHelpers';

interface SlackInteractionPayload {
	user?: { id?: string; name?: string; username?: string };
	actions?: Array<{ action_id?: string; value?: string }>;
}

/** Best-effort responder identity from a Slack interaction; email needs the users:read.email scope. */
async function extractSlackResponder(
	context: IWebhookFunctions,
	payload: SlackInteractionPayload,
): Promise<SendAndWaitResponder> {
	const user = payload.user ?? {};
	const responder: SendAndWaitResponder = {
		id: user.id ?? '',
		name: user.name ?? user.username,
		source: 'slack',
	};

	if (user.id) {
		try {
			const info = (await slackApiRequest.call(
				context,
				'GET',
				'/users.info',
				{},
				{ user: user.id },
			)) as {
				user?: { profile?: { email?: string } };
			};
			if (info?.user?.profile?.email) responder.email = info.user.profile.email;
		} catch {
			// users:read.email may be missing; degrade to id + name.
		}
	}

	return responder;
}

/**
 * Slack webhook entry. For an interactive button callback (signed POST) it verifies the
 * Slack signature and surfaces the responder; otherwise it falls back to the shared handler
 * (plain-link approvals and form responses are unchanged).
 */
export async function slackSendAndWaitWebhook(this: IWebhookFunctions) {
	const req = this.getRequestObject();
	const isInteraction = req.method === 'POST' && Boolean(req.headers['x-slack-signature']);

	if (!isInteraction) {
		return await sendAndWaitWebhook.call(this);
	}

	// Fail closed: this server-initiated callback must have a signing secret to verify against,
	// unlike the trigger's lenient skip-if-no-secret default.
	const credential = await this.getCredentials('slackApi');
	const signingSecret =
		typeof credential.signatureSecret === 'string' ? credential.signatureSecret : '';
	if (!signingSecret || !(await verifySignature.call(this))) {
		this.getResponseObject().status(401).send('');
		return { noWebhookResponse: true };
	}

	const payload = this.getBodyData() as SlackInteractionPayload;
	// Fail closed: only an explicit approve action counts as approved.
	const approved = payload.actions?.[0]?.action_id === 'n8n_hitl_approve';
	const responder = await extractSlackResponder(this, payload);

	return {
		webhookResponse: '',
		workflowData: [[{ json: { data: { approved, responder } } }]],
	};
}
