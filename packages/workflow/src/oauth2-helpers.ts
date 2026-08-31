import { isRecord } from '@n8n/utils/is-record';
import get from 'lodash/get';
import set from 'lodash/set';

import type { CredentialOAuth2Options, ICredentialDataDecryptedObject } from './interfaces';

export function applyOAuth2RefreshToken(
	tokenData: Record<string, unknown>,
	refreshData: Record<string, unknown>,
	oauth2?: CredentialOAuth2Options,
): void {
	if (!oauth2?.property || !oauth2.refreshProperty) return;

	const refreshedAccessToken = get(refreshData, oauth2.refreshProperty);
	if (typeof refreshedAccessToken !== 'string' || refreshedAccessToken.length === 0) return;

	set(tokenData, oauth2.property, refreshedAccessToken);
}

export function getOAuth2AuthHeaders(
	credentialData: ICredentialDataDecryptedObject,
	oauth2?: CredentialOAuth2Options,
): Record<string, string> {
	const tokenData = credentialData.oauthTokenData;
	if (!isRecord(tokenData)) return {};

	const customAccessToken = oauth2?.property ? get(tokenData, oauth2.property) : undefined;
	const accessToken = customAccessToken ?? tokenData.access_token ?? tokenData.accessToken;
	if (typeof accessToken !== 'string' || accessToken.length === 0) return {};

	const tokenType = oauth2?.tokenType ?? 'Bearer';
	const headers = { ['Authorization']: `${tokenType} ${accessToken}` };
	if (oauth2?.keyToIncludeInAccessTokenHeader) {
		return {
			...headers,
			[oauth2.keyToIncludeInAccessTokenHeader]: accessToken,
		};
	}
	return headers;
}
