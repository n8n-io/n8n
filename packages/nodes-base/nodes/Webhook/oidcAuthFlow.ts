import type { Request, Response } from 'express';
import type { IWebhookFunctions } from 'n8n-workflow';
import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * OIDC Authorization Code Flow implementation for browser-based triggers
 * (Form Trigger, Chat Trigger)
 *
 * Uses a centralized /oidc-callback endpoint so users only need to register
 * one redirect URI in their IdP.
 */

export interface OidcConfig {
	discoveryUrl: string;
	clientId: string;
	clientSecret: string;
	scopes: string;
	issuer: string;
	audience: string;
	sessionSecret: string;
	sessionDurationHours: number;
}

interface OidcDiscoveryDocument {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	jwks_uri: string;
	userinfo_endpoint?: string;
}

interface OidcSession {
	sub: string; // Subject (user ID)
	email?: string;
	name?: string;
	exp: number; // Expiration timestamp
	iat: number; // Issued at timestamp
}

// Cache for OIDC discovery documents
const discoveryCache = new Map<string, { doc: OidcDiscoveryDocument; expires: number }>();
const DISCOVERY_CACHE_TTL = 3600000; // 1 hour

/**
 * Fetch and cache OIDC discovery document
 */
export async function getDiscoveryDocument(discoveryUrl: string): Promise<OidcDiscoveryDocument> {
	const cached = discoveryCache.get(discoveryUrl);
	if (cached && cached.expires > Date.now()) {
		return cached.doc;
	}

	const response = await fetch(discoveryUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch OIDC discovery document: ${response.statusText}`);
	}

	const doc = (await response.json()) as OidcDiscoveryDocument;
	discoveryCache.set(discoveryUrl, { doc, expires: Date.now() + DISCOVERY_CACHE_TTL });
	return doc;
}

/**
 * Generate PKCE code verifier and challenge
 */
function generatePkce(): { codeVerifier: string; codeChallenge: string } {
	const codeVerifier = randomBytes(32).toString('base64url');
	// S256: code_challenge = BASE64URL(SHA256(code_verifier))
	const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
	return { codeVerifier, codeChallenge };
}

/**
 * Verify and decode session from JWT cookie
 */
function verifySession(token: string, secret: string): OidcSession | null {
	try {
		const [header, payload, signature] = token.split('.');
		const expectedSignature = createHmac('sha256', secret)
			.update(`${header}.${payload}`)
			.digest('base64url');

		if (signature !== expectedSignature) {
			return null;
		}

		const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as OidcSession;

		// Check expiration
		if (session.exp < Date.now() / 1000) {
			return null;
		}

		return session;
	} catch {
		return null;
	}
}

/**
 * Normalize webhook path to remove test/production prefixes
 * This allows the same session cookie to work for both test and production modes
 */
function normalizeWebhookPath(webhookPath: string): string {
	// Remove test mode prefixes: /form-test/, /webhook-test/, etc.
	return webhookPath
		.replace(/^\/(form|webhook|chat)-test\//, '/$1/')
		.replace(/^\/form\/test\//, '/form/');
}

/**
 * Get session cookie name for a specific webhook path
 */
function getSessionCookieName(webhookPath: string): string {
	// Normalize path so test and production share the same session
	const normalizedPath = normalizeWebhookPath(webhookPath);
	const hash = createHmac('sha256', 'n8n-oidc')
		.update(normalizedPath)
		.digest('hex')
		.substring(0, 8);
	return `n8n_oidc_${hash}`;
}

/**
 * Check if the current request has a valid OIDC session
 */
export function hasValidSession(
	req: Request,
	webhookPath: string,
	sessionSecret: string,
): OidcSession | null {
	const cookieName = getSessionCookieName(webhookPath);
	const cookies = parseCookies(req.headers.cookie || '');
	const sessionToken = cookies[cookieName];

	if (!sessionToken) {
		return null;
	}

	return verifySession(sessionToken, sessionSecret);
}

/**
 * Parse cookies from header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
	const cookies: Record<string, string> = {};
	cookieHeader.split(';').forEach((cookie) => {
		const [name, ...rest] = cookie.trim().split('=');
		if (name) {
			cookies[name] = rest.join('=');
		}
	});
	return cookies;
}

/**
 * Generate the authorization URL and redirect the user
 * Uses centralized /oidc-callback endpoint to simplify IdP configuration
 */
export async function redirectToAuthorization(
	res: Response,
	config: OidcConfig,
	webhookPath: string,
	originalUrl: string,
	credentialId: string,
): Promise<void> {
	const discovery = await getDiscoveryDocument(config.discoveryUrl);
	const csrf = randomBytes(16).toString('hex');
	const { codeVerifier, codeChallenge } = generatePkce();

	// Build centralized callback URL
	const protocol = (res.req.headers['x-forwarded-proto'] as string) || res.req.protocol || 'http';
	const host = (res.req.headers['x-forwarded-host'] as string) || res.req.headers.host;
	const callbackUrl = `${protocol}://${host}/rest/oidc-callback`;

	// Store complete state in cookie for the callback controller to use
	const stateData = JSON.stringify({
		csrf,
		codeVerifier,
		returnUrl: originalUrl,
		credentialId,
		webhookPath,
		timestamp: Date.now(),
	});
	const stateCookie = Buffer.from(stateData).toString('base64url');

	// State sent to IdP only contains CSRF token (minimal, signed by matching in cookie)
	const idpState = Buffer.from(JSON.stringify({ csrf })).toString('base64url');

	const authUrl = new URL(discovery.authorization_endpoint);
	authUrl.searchParams.set('client_id', config.clientId);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('redirect_uri', callbackUrl);
	authUrl.searchParams.set('scope', config.scopes);
	authUrl.searchParams.set('state', idpState);
	authUrl.searchParams.set('code_challenge', codeChallenge);
	authUrl.searchParams.set('code_challenge_method', 'S256');

	// Set state cookie (short-lived, 10 minutes)
	res.setHeader(
		'Set-Cookie',
		`n8n_oidc_state=${stateCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
	);

	res.writeHead(302, { Location: authUrl.toString() });
	res.end();
}

// Note: handleOidcCallback has been moved to the centralized OidcCallbackController
// in packages/cli/src/controllers/oidc-callback.controller.ts
// This avoids the need to register individual form/webhook URLs as redirect URIs

/**
 * Get OIDC config from credentials
 */
export async function getOidcConfig(
	ctx: IWebhookFunctions,
): Promise<{ config: OidcConfig; credentialId: string }> {
	const creds = await ctx.getCredentials<{
		discoveryUrl: string;
		clientId: string;
		clientSecret: string;
		scopes: string;
		issuer: string;
		audience: string;
		sessionSecret: string;
		sessionDurationHours: number;
	}>('oidcWebhookAuth');

	// Get credential ID from node parameters
	const nodeCredentials = ctx.getNode().credentials;
	const oidcCredential = nodeCredentials?.oidcWebhookAuth;
	const credentialId =
		typeof oidcCredential === 'object' && oidcCredential !== null && 'id' in oidcCredential
			? String(oidcCredential.id)
			: '';

	return {
		config: {
			discoveryUrl: creds.discoveryUrl,
			clientId: creds.clientId,
			clientSecret: creds.clientSecret || '',
			scopes: creds.scopes || 'openid profile email',
			issuer: creds.issuer || '',
			audience: creds.audience || '',
			sessionSecret: creds.sessionSecret,
			sessionDurationHours: creds.sessionDurationHours || 8,
		},
		credentialId,
	};
}
