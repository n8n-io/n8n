import { OperationalError, UserError } from '@n8n/errors';
import type { IDataObject, IHttpRequestOptions, WithRequestTarget } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

export interface ClientCredentialsConfig {
	tokenUrl?: unknown;
	clientId?: unknown;
	clientSecret?: unknown;
	scope?: unknown;
}

export interface MintedToken {
	accessToken: string;
	expiresInSeconds: number;
}

/** Sends the request the token endpoint expects, so a caller only supplies transport. */
export type TokenRequest = (options: WithRequestTarget<IHttpRequestOptions>) => Promise<unknown>;

const ASSUMED_LIFETIME_SECONDS = 3600;
const CLOCK_SKEW_MARGIN_MS = 30_000;

const asFilledString = (value: unknown) =>
	typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

export async function requestClientCredentialsToken(
	request: TokenRequest,
	config: ClientCredentialsConfig,
): Promise<MintedToken> {
	const tokenUrl = asFilledString(config.tokenUrl);
	const clientId = asFilledString(config.clientId);
	const clientSecret = asFilledString(config.clientSecret);

	if (!tokenUrl || !clientId || !clientSecret) {
		throw new UserError('Set the token URL, client ID and client secret');
	}

	const body: IDataObject = {
		grant_type: 'client_credentials',
		client_id: clientId,
		client_secret: clientSecret,
	};
	const scope = asFilledString(config.scope);
	if (scope) body.scope = scope;

	const response = (await request({
		method: 'POST',
		url: requestUrl`${tokenUrl}`,
		body,
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		json: true,
	})) as { access_token?: unknown; expires_in?: unknown } | undefined;

	const accessToken = asFilledString(response?.access_token);
	if (!accessToken) {
		throw new OperationalError('The token endpoint returned no access token');
	}

	const expiresIn = Number(response?.expires_in);
	return {
		accessToken,
		expiresInSeconds:
			Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : ASSUMED_LIFETIME_SECONDS,
	};
}

/**
 * Holds one token for as long as the endpoint says it lives, so a caller that
 * outlives a token, such as a trigger holding one client for an activation,
 * keeps working.
 */
export function createClientCredentialsTokenSource(
	request: TokenRequest,
	config: ClientCredentialsConfig,
	now: () => number = Date.now,
) {
	let cached: { accessToken: string; expiresAt: number } | undefined;

	return {
		async getToken(): Promise<string> {
			if (cached && cached.expiresAt > now()) return cached.accessToken;

			const { accessToken, expiresInSeconds } = await requestClientCredentialsToken(
				request,
				config,
			);
			cached = {
				accessToken,
				expiresAt: now() + expiresInSeconds * 1000 - CLOCK_SKEW_MARGIN_MS,
			};
			return accessToken;
		},
	};
}
