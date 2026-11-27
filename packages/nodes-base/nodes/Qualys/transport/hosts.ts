import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

export type QualysPod =
	| 'custom'
	| 'us1'
	| 'us2'
	| 'us3'
	| 'us4'
	| 'eu1'
	| 'eu2'
	| 'eu3'
	| 'in1'
	| 'ca1'
	| 'ae1'
	| 'uk1'
	| 'au1'
	| 'ksa1'
	| 'gov1';

type PodHosts = {
	gateway: string;
	platform: string;
};

/** https://www.qualys.com/platform-identification/ */
export const POD_HOSTS: Record<Exclude<QualysPod, 'custom'>, PodHosts> = {
	us1: { gateway: 'gateway.qg1.apps.qualys.com', platform: 'qualysapi.qualys.com' },
	us2: { gateway: 'gateway.qg2.apps.qualys.com', platform: 'qualysapi.qg2.apps.qualys.com' },
	us3: { gateway: 'gateway.qg3.apps.qualys.com', platform: 'qualysapi.qg3.apps.qualys.com' },
	us4: { gateway: 'gateway.qg4.apps.qualys.com', platform: 'qualysapi.qg4.apps.qualys.com' },
	eu1: { gateway: 'gateway.qg1.apps.qualys.eu', platform: 'qualysapi.qualys.eu' },
	eu2: { gateway: 'gateway.qg2.apps.qualys.eu', platform: 'qualysapi.qg2.apps.qualys.eu' },
	eu3: { gateway: 'gateway.qg3.apps.qualys.it', platform: 'qualysapi.qg3.apps.qualys.it' },
	in1: { gateway: 'gateway.qg1.apps.qualys.in', platform: 'qualysapi.qg1.apps.qualys.in' },
	ca1: { gateway: 'gateway.qg1.apps.qualys.ca', platform: 'qualysapi.qg1.apps.qualys.ca' },
	ae1: { gateway: 'gateway.qg1.apps.qualys.ae', platform: 'qualysapi.qg1.apps.qualys.ae' },
	uk1: { gateway: 'gateway.qg1.apps.qualys.co.uk', platform: 'qualysapi.qg1.apps.qualys.co.uk' },
	au1: { gateway: 'gateway.qg1.apps.qualys.com.au', platform: 'qualysapi.qg1.apps.qualys.com.au' },
	ksa1: { gateway: 'gateway.qg1.apps.qualysksa.com', platform: 'qualysapi.qg1.apps.qualysksa.com' },
	gov1: { gateway: 'gateway.gov1.qualys.us', platform: 'qualysapi.gov1.qualys.us' },
};

/**
 * Which Qualys platform to call. The API client credential holds these fields.
 * The username and password credential (`qualysApi`) has no host field, so the
 * nodes show the same fields when it is selected. `show` adds display
 * conditions to every field.
 */
export function platformProperties(show: IDisplayOptions['show'] = {}): INodeProperties[] {
	const displayOptions = Object.keys(show).length > 0 ? { show } : undefined;

	return [
		{
			displayName: 'Platform',
			name: 'pod',
			type: 'options',
			default: 'us1',
			description:
				'Qualys platform your subscription lives on. Both the gateway and the qualysapi host are derived from it. Check Help > About in the Qualys UI if unsure.',
			options: [
				{ name: 'AU1 - Australia', value: 'au1' },
				{ name: 'CA1 - Canada', value: 'ca1' },
				{ name: 'Custom / Private Cloud Platform', value: 'custom' },
				{ name: 'EU1 - Europe 1', value: 'eu1' },
				{ name: 'EU2 - Europe 2', value: 'eu2' },
				{ name: 'EU3 - Europe 3 (Italy)', value: 'eu3' },
				{ name: 'GOV1 - US Government', value: 'gov1' },
				{ name: 'IN1 - India', value: 'in1' },
				{ name: 'KSA1 - Saudi Arabia', value: 'ksa1' },
				{ name: 'UAE1 - United Arab Emirates', value: 'ae1' },
				{ name: 'UK1 - United Kingdom', value: 'uk1' },
				{ name: 'US1 - United States 1', value: 'us1' },
				{ name: 'US2 - United States 2', value: 'us2' },
				{ name: 'US3 - United States 3', value: 'us3' },
				{ name: 'US4 - United States 4', value: 'us4' },
			],
			displayOptions,
		},
		{
			displayName: 'API Gateway Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://gateway.qg1.apps.qualys.com',
			description:
				'Gateway host, used for VMDR OT and IT Asset requests. Must be HTTPS; a bare host is assumed to be. A cleartext URL is refused.',
			placeholder: 'https://gateway.qg1.apps.qualys.com',
			displayOptions: { show: { ...show, pod: ['custom'] } },
		},
		{
			displayName: 'Platform API Base URL',
			name: 'platformUrl',
			type: 'string',
			default: '',
			description:
				'The qualysapi host, used for VMDR vulnerability and KnowledgeBase requests. Must be HTTPS. Leave empty to derive it from the gateway URL.',
			placeholder: 'https://qualysapi.qg1.apps.qualys.com',
			displayOptions: { show: { ...show, pod: ['custom'] } },
		},
	];
}

/** The platform fields as the API client credential shows them. */
export const PLATFORM_PROPERTIES = platformProperties();

/**
 * Normalise a credential's host into an absolute HTTPS base URL.
 *
 * HTTPS is mandatory. Every request carries the client's bearer token, and the
 * token endpoint carries the client secret itself, so a cleartext base URL
 * would put both on the wire - and would let anyone on the path rewrite the
 * platform API's paging link to redirect the token elsewhere. A bare host is
 * assumed to be HTTPS; any other scheme is refused rather than upgraded, so a
 * mistake is visible instead of silently rewritten.
 */
export function buildBaseUrl(baseUrl: string): string {
	const trimmed = baseUrl.trim().replace(/\/+$/, '');

	if (!trimmed) {
		throw new Error('Qualys API Gateway Base URL is required');
	}

	const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(trimmed);

	if (scheme && scheme[1].toLowerCase() !== 'https') {
		throw new Error(
			`Qualys base URLs must use HTTPS, but got "${trimmed}". The client secret and the bearer token minted from it would otherwise cross the network in the clear.`,
		);
	}

	return scheme ? trimmed : `https://${trimmed}`;
}

/**
 * Derive the qualysapi host from a gateway host when the credential does not
 * spell it out. `gateway.qg2.apps.qualys.eu` -> `qualysapi.qg2.apps.qualys.eu`,
 * and the US1/EU1 special cases where the gateway keeps a `qgN.apps` segment
 * the platform host drops.
 */
export function derivePlatformUrl(gatewayUrl: string): string {
	const url = buildBaseUrl(gatewayUrl);
	const host = url.replace(/^https?:\/\//i, '');

	for (const hosts of Object.values(POD_HOSTS)) {
		if (hosts.gateway === host) {
			return `https://${hosts.platform}`;
		}
	}

	if (host.startsWith('gateway.')) {
		return `https://${host.replace(/^gateway\./, 'qualysapi.')}`;
	}

	return url;
}

export function resolveHosts(credentials: {
	pod?: string;
	baseUrl?: string;
	platformUrl?: string;
}): { gateway: string; platform: string } {
	const pod = (credentials.pod ?? 'custom') as QualysPod;

	if (pod !== 'custom' && POD_HOSTS[pod]) {
		return {
			gateway: `https://${POD_HOSTS[pod].gateway}`,
			platform: `https://${POD_HOSTS[pod].platform}`,
		};
	}

	const gateway = buildBaseUrl(credentials.baseUrl ?? '');
	const platform = credentials.platformUrl?.trim()
		? buildBaseUrl(credentials.platformUrl)
		: derivePlatformUrl(gateway);

	return { gateway, platform };
}
