import type { MicrosoftGraphForbiddenHint } from '@utils/microsoft/transport';

export const ACTIVITY_NOTIFICATION_SETUP_URL =
	'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftteams/#send-an-activity-notification';

export const COMPANION_APP_FORBIDDEN: MicrosoftGraphForbiddenHint = {
	match: 'is not authorized to generate custom text notifications',
	message: 'The companion Teams app is not installed for this recipient',
	description: `Teams shows activity notifications only from a Teams app that is installed for the recipient. The app manifest must name this credential's client ID under webApplicationInfo. Ask a Teams admin to publish the companion app to the organization catalog and install it for the recipient. Wait a few minutes, then try again. Setup guide: ${ACTIVITY_NOTIFICATION_SETUP_URL}`,
};

export const ACTIVITY_PERMISSION_MATCH = 'TeamsActivity.Send';

export const ACTIVITY_PERMISSION_FORBIDDEN_APP_ONLY: MicrosoftGraphForbiddenHint = {
	match: ACTIVITY_PERMISSION_MATCH,
	message: 'The app registration is missing the TeamsActivity.Send application permission',
	description:
		'Add the TeamsActivity.Send application permission to the app registration in Microsoft Entra and grant admin consent, then try again.',
};

export const ACTIVITY_PERMISSION_FORBIDDEN_DELEGATED = {
	message: 'The credential is missing the TeamsActivity.Send permission',
	description:
		'Add TeamsActivity.Send to the scopes of the credential: turn on Custom Scopes and add it to Enabled Scopes on the Microsoft Teams credential, or add it to the Scope field on a generic Microsoft credential. Then reconnect the credential so Microsoft asks for the new permission.',
};

export const TEAMS_FORBIDDEN_HINTS: readonly MicrosoftGraphForbiddenHint[] = [
	COMPANION_APP_FORBIDDEN,
	ACTIVITY_PERMISSION_FORBIDDEN_APP_ONLY,
];
