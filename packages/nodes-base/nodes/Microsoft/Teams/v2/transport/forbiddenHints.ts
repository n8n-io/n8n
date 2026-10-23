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

export const TEAMS_FORBIDDEN_HINTS: readonly MicrosoftGraphForbiddenHint[] = Object.freeze([
	COMPANION_APP_FORBIDDEN,
	ACTIVITY_PERMISSION_FORBIDDEN,
]);
