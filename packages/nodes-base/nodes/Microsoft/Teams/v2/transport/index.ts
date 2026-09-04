import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import {
	buildMicrosoftGraphPath,
	createMicrosoftGraphTransport,
	type MicrosoftGraphCredentialType,
	SERVICE_PRINCIPAL_AUTH,
	SP_HIDE,
	validateMicrosoftGraphId,
} from '@utils/microsoft/transport';

// Thin facade over the shared Microsoft Graph transport kernel. The export
// surface is unchanged so operations, listSearch and the Trigger keep
// importing from this path.
export {
	SERVICE_PRINCIPAL_AUTH,
	SP_HIDE,
	buildMicrosoftGraphPath as buildTeamsPath,
	validateMicrosoftGraphId as validateTeamsId,
};

export type TeamsCredentialType = MicrosoftGraphCredentialType<'microsoftTeamsOAuth2Api'>;

const {
	getCredentialType: getTeamsCredentialType,
	getGraphBaseUrl,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} = createMicrosoftGraphTransport({ defaultCredentialType: 'microsoftTeamsOAuth2Api' });

export {
	getTeamsCredentialType,
	getGraphBaseUrl,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
};

/**
 * App-only Microsoft Graph has no `/me`, so the joined-teams listing is fetched
 * from the org-wide `/v1.0/teams` endpoint under the Service Principal credential
 * (App `Team.ReadBasic.All`). OAuth2 keeps the per-user `/v1.0/me/joinedTeams`.
 * Shared by `getTeams` (listSearch) and `fetchAllTeams` (trigger).
 */
export function joinedTeamsEndpoint(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
): string {
	return getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH
		? '/v1.0/teams'
		: '/v1.0/me/joinedTeams';
}

/**
 * Shape-validates Planner body IDs (`planId`/`bucketId`) under SP for `task:create`
 * and `task:update`. These go into the JSON body (not a path), so this is
 * defense-in-depth — a malformed id is a bad request; path-interpolated ids are
 * guarded by `buildTeamsPath`. No-op under OAuth2.
 */
export function validateTaskBodyIdsUnderSp(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	ids: { planId?: string; bucketId?: string },
): void {
	if (getTeamsCredentialType.call(this) !== SERVICE_PRINCIPAL_AUTH) return;
	const node = this.getNode();
	if (ids.planId !== undefined) validateMicrosoftGraphId(ids.planId, node);
	if (ids.bucketId !== undefined) validateMicrosoftGraphId(ids.bucketId, node);
}
