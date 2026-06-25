import { UserError } from './errors';
import { NodeOperationError } from './errors/node-operation.error';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	INode,
	INodeProperties,
} from './interfaces';

export type DomainRestrictionMode = 'all' | 'domains' | 'none';

const DEFAULT_SURFACE = 'HTTP Request';

export const DOMAIN_RESTRICTION_FIELDS: INodeProperties[] = [
	{
		displayName: 'Allowed HTTP Request Domains',
		name: 'allowedHttpRequestDomains',
		type: 'options',
		options: [
			{
				name: 'All',
				value: 'all',
				description: 'Allow all requests when used in the HTTP Request node',
			},
			{
				name: 'Specific Domains',
				value: 'domains',
				description: 'Restrict requests to specific domains',
			},
			{
				name: 'None',
				value: 'none',
				description: 'Block all requests when used in the HTTP Request node',
			},
		],
		default: 'all',
		description: 'Control which domains this credential can be used with in HTTP Request nodes',
	},
	{
		displayName: 'Allowed Domains',
		name: 'allowedDomains',
		type: 'string',
		default: '',
		placeholder: 'example.com, *.subdomain.com',
		description: 'Comma-separated list of allowed domains (supports wildcards with *)',
		displayOptions: {
			show: {
				allowedHttpRequestDomains: ['domains'],
			},
		},
	},
];

function isRestrictionMode(value: unknown): value is DomainRestrictionMode {
	return value === 'all' || value === 'domains' || value === 'none';
}

function readMode(
	credentialData: ICredentialDataDecryptedObject,
): DomainRestrictionMode | undefined {
	const value = credentialData.allowedHttpRequestDomains;
	return isRestrictionMode(value) ? value : undefined;
}

function readAllowedDomainsField(
	credentialData: ICredentialDataDecryptedObject,
): string | undefined {
	const value = credentialData.allowedDomains;
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function shouldInjectDomainRestrictionFields(credentialType: ICredentialType): boolean {
	return (
		credentialType.authenticate !== undefined ||
		credentialType.genericAuth === true ||
		(Array.isArray(credentialType.extends) &&
			(credentialType.extends.includes('oAuth2Api') ||
				credentialType.extends.includes('oAuth1Api') ||
				credentialType.extends.includes('googleOAuth2Api')))
	);
}

/** Idempotent — safe to call repeatedly. */
export function injectDomainRestrictionFields(credentialType: ICredentialType): INodeProperties[] {
	const properties = Array.isArray(credentialType.properties) ? credentialType.properties : [];
	if (!shouldInjectDomainRestrictionFields(credentialType)) {
		return properties;
	}
	if (properties.some((prop) => prop.name === 'allowedHttpRequestDomains')) {
		return properties;
	}
	return [...properties, ...DOMAIN_RESTRICTION_FIELDS];
}

/** `*.example.com` matches subdomains only, never the bare domain. */
export function isDomainAllowed(options: { url: string; allowedDomains: string }): boolean {
	const { url: urlString, allowedDomains } = options;
	if (!allowedDomains || allowedDomains.trim() === '') {
		return true;
	}

	let url: URL;
	try {
		url = new URL(urlString);
	} catch {
		return false;
	}

	const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
	if (!hostname) return false;

	const allowedDomainsList = allowedDomains
		.split(',')
		.map((domain) => domain.trim().toLowerCase().replace(/\.$/, ''))
		.filter(Boolean);

	for (const allowedDomain of allowedDomainsList) {
		if (allowedDomain.startsWith('*.')) {
			const domainSuffix = allowedDomain.substring(2);
			if (!domainSuffix) continue;
			if (hostname.endsWith('.' + domainSuffix)) return true;
		} else if (hostname === allowedDomain) {
			return true;
		}
	}

	return false;
}

/** Throws `UserError` when `node` is omitted, so callers without an `INode` (axios helper) get a wrappable error. */
export function assertUrlAllowed(options: {
	url: string;
	allowedDomains?: string;
	node?: INode;
}): void {
	const { url, allowedDomains, node } = options;
	if (!allowedDomains) return;
	if (isDomainAllowed({ url, allowedDomains })) return;

	const message = `Domain not allowed: This credential is restricted from accessing ${url}. Only the following domains are allowed: ${allowedDomains}`;
	throw node ? new NodeOperationError(node, message) : new UserError(message);
}

/** Returns the allowlist for forwarding to per-hop redirect checks; `undefined` means allow-all. */
export function getCredentialAllowedDomains(options: {
	node: INode;
	credentialData: ICredentialDataDecryptedObject;
	surface?: string;
}): string | undefined {
	const { node, credentialData, surface = DEFAULT_SURFACE } = options;
	const mode = readMode(credentialData);

	if (mode === 'none') {
		throw new NodeOperationError(
			node,
			`This credential is configured to prevent use within an ${surface} node`,
		);
	}

	if (mode === 'domains') {
		const allowedDomains = readAllowedDomainsField(credentialData);
		if (!allowedDomains) {
			throw new NodeOperationError(
				node,
				'No allowed domains specified. Configure allowed domains or change restriction setting.',
			);
		}
		return allowedDomains;
	}

	return undefined;
}

/**
 * Passing `pinnedUrl` switches `'none'` mode from "block all" to "allow only
 * the pinned URL" — for surfaces like OpenAI where the credential pins a base
 * URL but the user may override it. A falsy `pinnedUrl` makes `'none'` a no-op.
 */
export function assertCredentialAllowsUrl(options: {
	node: INode;
	credentialData: ICredentialDataDecryptedObject;
	url: string;
	pinnedUrl?: string;
	surface?: string;
}): string | undefined {
	const { node, credentialData, url, surface = DEFAULT_SURFACE } = options;
	const usePinnedUrlSemantic = 'pinnedUrl' in options;
	const mode = readMode(credentialData);

	if (mode === 'none') {
		if (!usePinnedUrlSemantic) {
			throw new NodeOperationError(
				node,
				`This credential is configured to prevent use within an ${surface} node`,
			);
		}
		if (options.pinnedUrl && url !== options.pinnedUrl) {
			throw new NodeOperationError(
				node,
				`Domain not allowed: This credential is restricted from accessing ${url}.`,
			);
		}
		return undefined;
	}

	if (mode === 'domains') {
		const allowedDomains = readAllowedDomainsField(credentialData);
		if (!allowedDomains) {
			throw new NodeOperationError(
				node,
				'No allowed domains specified. Configure allowed domains or change restriction setting.',
			);
		}
		assertUrlAllowed({ url, allowedDomains, node });
		return allowedDomains;
	}

	return undefined;
}
