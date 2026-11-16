import type { MicrosoftGraphForbiddenHint } from '@utils/microsoft/transport';

export const ACTIVITY_NOTIFICATION_SETUP_URL =
	'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftteams/#send-an-activity-notification';

const ACTIVITY_NOTIFICATION_ENDPOINT = '/teamwork/sendActivityNotification';
const SUBSCRIPTIONS_ENDPOINT = '/subscriptions';

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

// Teams Trigger subscriptions (POST /v1.0/subscriptions). Graph names the refused
// resource in the 403 text, for example `'/teams('<id>')/members' resource`. Each
// permission `match` is a fragment of that path, never a permission name: the same 403
// also lists the roles the caller already has (PR #38954). The fragments do not overlap
// for the paths getResourcePath posts, so their order does not matter. The subscription
// limit hint below matches a phrase instead.
// `/channels('` is the channel-message path: a channel key follows `/channels` only there.
export const TEAM_MEMBER_SUBSCRIPTION_FORBIDDEN = {
	endpoint: SUBSCRIPTIONS_ENDPOINT,
	match: "/members' resource",
	message: 'The app registration is missing the TeamMember.Read.All application permission',
	description:
		'Add the TeamMember.Read.All application permission to the app registration in Microsoft Entra and grant admin consent. Then try again.',
	delegated: {
		message: 'The credential is missing the TeamMember.Read.All permission',
		description:
			'Ask a tenant admin to grant consent for TeamMember.Read.All. Then reconnect the credential so Microsoft asks for the permission. Without admin consent the sign-in fails. If the credential uses Custom Scopes, add TeamMember.Read.All to Enabled Scopes before you reconnect. On a generic Microsoft credential, add it to the Scope field. If the credential already has the permission, check that the signed-in user is a member of the team.',
	},
} satisfies MicrosoftGraphForbiddenHint;

export const CHANNEL_SUBSCRIPTION_FORBIDDEN = {
	endpoint: SUBSCRIPTIONS_ENDPOINT,
	match: "/channels' resource",
	message: 'The app registration is missing the Channel.ReadBasic.All application permission',
	description:
		'Add the Channel.ReadBasic.All application permission to the app registration in Microsoft Entra and grant admin consent. Then try again.',
	delegated: {
		message: 'The credential is missing the Channel.ReadBasic.All permission',
		description:
			'Reconnect the credential so Microsoft asks for the Channel.ReadBasic.All permission. If the credential uses Custom Scopes, add Channel.ReadBasic.All to Enabled Scopes first. On a generic Microsoft credential, add it to the Scope field. The default Group.ReadWrite.All scope also covers this event. If the credential already has either permission, check that the signed-in user is a member of the team.',
	},
} satisfies MicrosoftGraphForbiddenHint;

export const CHANNEL_MESSAGE_SUBSCRIPTION_FORBIDDEN = {
	endpoint: SUBSCRIPTIONS_ENDPOINT,
	match: "/channels('",
	message: 'The app registration is missing the ChannelMessage.Read.All application permission',
	description:
		'Add the ChannelMessage.Read.All application permission to the app registration in Microsoft Entra and grant admin consent. Then try again.',
	delegated: {
		message: 'The credential is missing the ChannelMessage.Read.All permission',
		description:
			'Ask a tenant admin to grant consent for ChannelMessage.Read.All. Then reconnect the credential so Microsoft asks for the permission. Without admin consent the sign-in fails. If the credential uses Custom Scopes, add ChannelMessage.Read.All to Enabled Scopes before you reconnect. On a generic Microsoft credential, add it to the Scope field. If the credential already has the permission, check that the signed-in user is a member of the team.',
	},
} satisfies MicrosoftGraphForbiddenHint;

// Chat paths: `/chats('<id>')/messages` and `/users('<id>')/chats` contain `/chats`, and all
// chat events need the same delegated scope. The app-only copy is the single source for
// throwChatTriggerUnsupported (helpers/utils-trigger.ts), which runs first under SP.
export const CHAT_SUBSCRIPTION_FORBIDDEN = {
	endpoint: SUBSCRIPTIONS_ENDPOINT,
	match: '/chats',
	message: 'Chat triggers are not available with the Service Principal credential',
	description:
		'App-only Microsoft Graph cannot subscribe to the chats of a signed-in user. Use an OAuth2 credential for chat triggers.',
	delegated: {
		message: 'The credential is missing the Chat.Read permission',
		description:
			'Reconnect the credential so Microsoft asks for the Chat.Read permission. If the credential uses Custom Scopes, add Chat.Read to Enabled Scopes first. On a generic Microsoft credential, add it to the Scope field. The default Chat.ReadWrite scope also covers chat triggers. If the credential already has either permission and the trigger watches one chat, check that the signed-in user is a member of that chat.',
	},
} satisfies MicrosoftGraphForbiddenHint;

// `/me/chats/getAllMessages` (New Chat Message, watch all chats) has its own renderer, seen live
// 2026-10-19: "Required permissions to access user-scoped chat message subscription ('Chat.Read,
// Chat.ReadWrite') are missing." The text has no path, so the fragment is its own phrase.
export const CHAT_ALL_MESSAGES_SUBSCRIPTION_FORBIDDEN = {
	...CHAT_SUBSCRIPTION_FORBIDDEN,
	match: 'user-scoped chat message subscription',
} satisfies MicrosoftGraphForbiddenHint;

// Graph answers 403 `ExtensionError` with this text when a subscription would go over a
// quota of one. Seen live for a second `/teams/{id}/channels` subscription: "User '<id>' has
// reached its limit of '1' 'TEAMS/<ID>/CHANNELS' subscription". The Graph docs list a quota of
// one for each app and team (channels, members) and for each app and channel or chat
// (messages), and ten for the chats of one user (change-notifications-overview). The match
// names no subject, so the app-subject variant under the Service Principal credential matches
// too. It keeps the `'1'`, because the quota of ten is not this case. The main copy is for the
// Service Principal credential, the `delegated` copy for a signed-in account.
export const SUBSCRIPTION_LIMIT_FORBIDDEN = {
	endpoint: SUBSCRIPTIONS_ENDPOINT,
	match: "has reached its limit of '1'",
	message: 'Microsoft Graph allows only one subscription of this kind per app registration',
	description:
		'Another workflow or n8n instance that uses the same app registration already watches this team or channel, or an earlier subscription was left behind. When you listen for a test event, the published version of this workflow also counts. Unpublish the other workflow, wait up to three days for the old subscription to expire, or use a different app registration. Then try again.',
	delegated: {
		message: 'Microsoft Graph allows only one subscription of this kind per Microsoft account',
		description:
			'Another workflow with the same Microsoft account already watches this team, channel or chat, or an earlier subscription was left behind, for example by a deleted workflow or by another n8n instance. When you listen for a test event, the published version of this workflow also counts. Unpublish the other workflow, wait up to three days for the old subscription to expire, or connect this credential with a different Microsoft account. Then try again.',
	},
} satisfies MicrosoftGraphForbiddenHint;

export const TEAMS_FORBIDDEN_HINTS: readonly MicrosoftGraphForbiddenHint[] = Object.freeze([
	SUBSCRIPTION_LIMIT_FORBIDDEN,
	COMPANION_APP_FORBIDDEN,
	ACTIVITY_PERMISSION_FORBIDDEN,
	TEAM_MEMBER_SUBSCRIPTION_FORBIDDEN,
	CHANNEL_SUBSCRIPTION_FORBIDDEN,
	CHANNEL_MESSAGE_SUBSCRIPTION_FORBIDDEN,
	CHAT_SUBSCRIPTION_FORBIDDEN,
	CHAT_ALL_MESSAGES_SUBSCRIPTION_FORBIDDEN,
]);
