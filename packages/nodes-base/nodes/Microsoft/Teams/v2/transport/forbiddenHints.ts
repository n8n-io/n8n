import type { MicrosoftGraphForbiddenHint } from '@utils/microsoft/transport';

export const ACTIVITY_NOTIFICATION_SETUP_URL =
	'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftteams/#send-an-activity-notification';

const ACTIVITY_NOTIFICATION_ENDPOINT = '/teamwork/sendActivityNotification';

export const COMPANION_APP_FORBIDDEN = {
	endpoint: ACTIVITY_NOTIFICATION_ENDPOINT,
	match: 'is not authorized to generate custom text notifications',
	message: 'The companion Teams app is not installed for this recipient',
	description: `Teams shows activity notifications only from a Teams app that is installed for the recipient. The app manifest must name this credential's client ID under webApplicationInfo. Ask a Teams admin to publish the companion app to the organization catalog and install it for the recipient. Wait a few minutes, then try again. Setup guide: ${ACTIVITY_NOTIFICATION_SETUP_URL}`,
} satisfies MicrosoftGraphForbiddenHint;

export const ACTIVITY_PERMISSION_FORBIDDEN = {
	endpoint: ACTIVITY_NOTIFICATION_ENDPOINT,
	match: 'TeamsActivity.Send',
	message: 'The app registration is missing the TeamsActivity.Send application permission',
	description:
		'Add the TeamsActivity.Send application permission to the app registration in Microsoft Entra and grant admin consent. As an alternative, add the TeamsActivity.Send.User resource-specific permission to the companion Teams app manifest and install the updated app for the recipient. Then try again.',
	delegated: {
		message: 'The credential is missing the TeamsActivity.Send permission',
		description:
			'Reconnect the credential so Microsoft asks for the TeamsActivity.Send permission. If the credential uses Custom Scopes, add TeamsActivity.Send to Enabled Scopes first. On a generic Microsoft credential, add it to the Scope field.',
	},
} satisfies MicrosoftGraphForbiddenHint;

// Graph answers 403 `ExtensionError` with this text when a second `/teams/{id}/channels`
// subscription is created for the same identity. The match names no subject, so the
// app-subject variant under the Service Principal credential matches too; the main copy
// is for that credential, the `delegated` copy for a signed-in Microsoft account.
export const SUBSCRIPTION_LIMIT_FORBIDDEN = {
	endpoint: '/subscriptions',
	match: 'has reached its limit of',
	message: 'Microsoft Graph allows only one subscription of this kind per app registration',
	description:
		'Another workflow or n8n instance that uses the same app registration already watches this team or chat, or an earlier subscription was left behind. Unpublish the other workflow, wait up to three days for the old subscription to expire, or use a different app registration. Then publish again.',
	delegated: {
		message: 'Microsoft Graph allows only one subscription of this kind per Microsoft account',
		description:
			'Another workflow with the same Microsoft account already watches this team or chat, or an earlier subscription was left behind, for example by a deleted workflow or by another n8n instance. Unpublish the other workflow, wait up to three days for the old subscription to expire, or connect this credential with a different Microsoft account. Then publish again.',
	},
} satisfies MicrosoftGraphForbiddenHint;

export const TEAMS_FORBIDDEN_HINTS: readonly MicrosoftGraphForbiddenHint[] = Object.freeze([
	SUBSCRIPTION_LIMIT_FORBIDDEN,
	COMPANION_APP_FORBIDDEN,
	ACTIVITY_PERMISSION_FORBIDDEN,
]);
