import { isSlackInteractionRequest, parseHitlCallbackReference } from 'n8n-core';
import { jsonParse, type IDataObject, type IWebhookFunctions } from 'n8n-workflow';

import { slackApiRequest } from './GenericFunctions';
import { HITL_APPROVE_ACTION_ID, type SectionBlock } from './MessageInterface';
import type { SendAndWaitResponder } from '../../../utils/sendAndWait/interfaces';
import { sendAndWaitWebhook } from '../../../utils/sendAndWait/utils';
import { verifySignature } from '../SlackTriggerHelpers';

interface SlackInteractionPayload {
	user?: { id?: string; name?: string; username?: string };
	actions?: Array<{ action_id?: string; value?: string; action_ts?: string }>;
	channel?: { id?: string };
	message?: { ts?: string; blocks?: IDataObject[] };
	container?: { message_ts?: string };
	response_url?: string;
}

/**
 * Works out who clicked the button. Always returns their Slack id and name; the email is a
 * bonus that only comes through if the app has the `users:read.email` scope.
 */
async function extractSlackResponder(
	context: IWebhookFunctions,
	payload: SlackInteractionPayload,
): Promise<SendAndWaitResponder> {
	const user = payload.user ?? {};
	const responder: SendAndWaitResponder = {
		id: user.id ?? '',
		name: user.name,
		username: user.username,
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
			// No users:read.email scope? Just skip the email and keep id + name.
		}
	}

	return responder;
}

/**
 * When someone not on the approver list clicks a button, send them a private ("ephemeral")
 * message so only they see that it was ignored. If this fails, we carry on regardless — it
 * must never cause the execution to resume.
 */
async function notifyNotAuthorized(
	context: IWebhookFunctions,
	payload: SlackInteractionPayload,
): Promise<void> {
	const channel = payload.channel?.id;
	const user = payload.user?.id;
	if (!channel || !user) return;
	try {
		await slackApiRequest.call(context, 'POST', '/chat.postEphemeral', {
			channel,
			user,
			text: 'You are not authorized to respond to this request.',
		});
	} catch {
		// Missing chat:write scope, or the user left the channel. Nothing more we can do.
	}
}

/** Builds the "Approved/Declined by @user" line added under the message once someone decides. */
function buildDecisionBlocks(approved: boolean, responder: SendAndWaitResponder): SectionBlock[] {
	const who = responder.id ? `<@${responder.id}>` : (responder.name ?? 'a user');
	const outcome = approved ? ':white_check_mark: *Approved*' : ':x: *Declined*';
	return [{ type: 'section', text: { type: 'mrkdwn', text: `${outcome} by ${who}` } }];
}

/**
 * Rewrites the original message so the decision is final (buttons gone, outcome shown). Tries
 * `response_url` first (no token, but expires ~30 min), then falls back to `chat.update`. If both
 * fail the execution still resumes — locking the message is nice-to-have, not required.
 */
async function lockSlackMessage(
	context: IWebhookFunctions,
	payload: SlackInteractionPayload,
	blocks: IDataObject[],
	text: string,
): Promise<void> {
	if (payload.response_url) {
		try {
			await context.helpers.httpRequest({
				method: 'POST',
				url: payload.response_url,
				headers: { 'Content-Type': 'application/json' },
				// response_url replies with a plain "ok", not JSON, so we stringify the body
				// ourselves rather than letting the client try to parse the response.
				body: JSON.stringify({ replace_original: true, text, blocks }),
			});
			return;
		} catch (error) {
			context.logger.warn(
				`Slack HITL: response_url update failed (${error instanceof Error ? error.message : String(error)}); trying chat.update`,
			);
		}
	}

	const channel = payload.channel?.id;
	const ts = payload.message?.ts ?? payload.container?.message_ts;
	if (channel && ts) {
		try {
			await slackApiRequest.call(context, 'POST', '/chat.update', {
				channel,
				ts,
				text,
				blocks,
			});
		} catch (error) {
			// A missing chat:write scope shouldn't fail the resume, so leave the message as-is.
			context.logger.warn(
				`Slack HITL: chat.update failed (${error instanceof Error ? error.message : String(error)}); message left as-is`,
			);
		}
	} else {
		context.logger.warn('Slack HITL: cannot lock message — missing channel or message ts');
	}
}

/**
 * Slack webhook entry point. Interactive button clicks (signed POSTs) are signature-verified,
 * attributed to a responder, and lock the message; everything else — plain-link approvals, form
 * responses — is handed to the shared handler unchanged.
 */
export async function slackSendAndWaitWebhook(this: IWebhookFunctions) {
	// Whether the request came via the `-slack` interaction route is decided by the CLI flagging
	// the request object, not by the attacker-controlled x-slack-signature header. Unflagged
	// requests belong to the shared handler, authenticated by the signed resume URL + query param.
	const req = this.getRequestObject();
	if (!isSlackInteractionRequest(req)) {
		return await sendAndWaitWebhook.call(this);
	}

	// Interaction-route requests carry no signed resume URL, so they must be a validly Slack-signed
	// interaction: fail closed with 401 if the secret is missing or the signature doesn't verify,
	// never falling back to the query-param path. verifySignature also enforces replay protection
	// and constant-time comparison. Pick the credential matching the node's auth mode.
	const authentication = this.getNodeParameter('authentication', 'accessToken') as string;
	const credentialType = authentication === 'oAuth2' ? 'slackOAuth2Api' : 'slackApi';
	const credential = await this.getCredentials(credentialType);
	const signingSecret =
		typeof credential.signatureSecret === 'string' ? credential.signatureSecret : '';
	if (!signingSecret || !(await verifySignature.call(this, credentialType))) {
		this.getResponseObject().status(401).send('');
		return { noWebhookResponse: true };
	}

	// Slack sends interactions as form data with the JSON inside a `payload` field.
	const body = this.getBodyData();
	const payload =
		typeof body.payload === 'string'
			? jsonParse<SlackInteractionPayload>(body.payload, { fallbackValue: {} })
			: (body as SlackInteractionPayload);

	// Fail closed: approve only when both signals agree — the HMAC-minted callback reference
	// (verified at the CLI layer) and Slack's native action_id. Anything else counts as declined.
	const action = payload.actions?.[0];
	const parsed = parseHitlCallbackReference(action?.value ?? '');
	const approved = parsed?.decision === 'a' && action?.action_id === HITL_APPROVE_ACTION_ID;

	// No approvers configured means anyone can respond (the original default). If a list is set,
	// a click from anyone not on it is ignored: tell them privately and keep waiting.
	const approvers = this.getNodeParameter('approvers', []) as string[];
	if (approvers.length > 0 && !approvers.includes(payload.user?.id ?? '')) {
		this.logHitlResponse({ approved, authorized: false });
		// Acknowledge the interaction before the best-effort notification so Slack does not time out and retry the click.
		this.getResponseObject().status(200).send('');
		await notifyNotAuthorized(this, payload);
		return { noWebhookResponse: true };
	}

	this.logHitlResponse({ approved, authorized: true });
	const responder = await extractSlackResponder(this, payload);

	// Slack tells us when the button was clicked via action_ts (epoch seconds). If it's
	// missing, fall back to the time we received the request.
	const actionTs = action?.action_ts;
	const actionMs = actionTs ? Number(actionTs) * 1000 : NaN;
	const respondedAt = new Date(Number.isFinite(actionMs) ? actionMs : Date.now()).toISOString();

	// Rebuild the message: keep everything except the buttons, then add the outcome line.
	const keptBlocks = (payload.message?.blocks ?? []).filter(
		(block) => (block as { type?: string }).type !== 'actions',
	);
	const lockedBlocks = [
		...keptBlocks,
		...buildDecisionBlocks(approved, responder),
	] as IDataObject[];
	await lockSlackMessage(
		this,
		payload,
		lockedBlocks,
		approved ? 'Request approved' : 'Request declined',
	);

	return {
		webhookResponse: '',
		workflowData: [
			[
				{
					json: {
						data: {
							approved,
							responder,
							respondedAt,
							channel: payload.channel?.id,
							messageId: payload.message?.ts ?? payload.container?.message_ts,
						},
					},
				},
			],
		],
	};
}
