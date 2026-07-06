import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

export interface NextCloudContext {
	baseUrl: string;
	basicAuth: string;
}

/**
 * Resolve NextCloud credentials and base URL for loadOptions.
 * Returns null when credentials are unavailable so callers can short-circuit
 * to an empty list rather than crashing the UI.
 */
export async function getNextCloudContext(
	ctx: ILoadOptionsFunctions,
): Promise<NextCloudContext | null> {
	let authenticationMethod: string;
	try {
		authenticationMethod = ctx.getCurrentNodeParameter('authentication') as string;
	} catch {
		// 'authentication' parameter not yet set � fall back to default.
		authenticationMethod = 'accessToken';
	}
	const credentialName = authenticationMethod === 'oAuth2' ? 'nextCloudOAuth2Api' : 'nextCloudApi';
	let credentials: { webDavUrl?: string; user?: string; password?: string };
	try {
		credentials = await ctx.getCredentials(credentialName);
	} catch {
		if (authenticationMethod === 'oAuth2') {
			throw new Error(
				'Deck resource locators require username/password authentication. OAuth2 is not supported.',
			);
		}
		return null;
	}
	if (!credentials?.webDavUrl || !credentials.user || !credentials.password) {
		if (authenticationMethod === 'oAuth2') {
			throw new Error(
				'Deck resource locators require username/password authentication. OAuth2 is not supported.',
			);
		}
		return null;
	}
	const baseUrl = (credentials.webDavUrl as string)
		.replace(/\/remote\.php\/.*$/, '')
		.replace(/\/+$/, '');
	const basicAuth = Buffer.from(`${credentials.user}:${credentials.password}`).toString('base64');
	return { baseUrl, basicAuth };
}

/**
 * Shared user search � reusable by Deck (assign/unassign) and User resource.
 * Calls global OCS /cloud/users endpoint.
 */
export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const ctx = await getNextCloudContext(this);
	if (!ctx) return { results: [] };

	const limit = 200;
	let offset = 0;
	const users: string[] = [];
	const maxPages = 100; // safety cap (20,000 users)
	let page = 0;

	while (page < maxPages) {
		const response = (await this.helpers.request({
			method: 'GET',
			url: `${ctx.baseUrl}/ocs/v1.php/cloud/users?limit=${limit}&offset=${offset}`,
			headers: {
				'OCS-APIRequest': 'true',
				Accept: 'application/json',
				Authorization: `Basic ${ctx.basicAuth}`,
			},
			json: true,
		})) as { ocs?: { data?: { users?: string[] } } };

		const pageUsers = response?.ocs?.data?.users ?? [];
		users.push(...pageUsers);

		if (pageUsers.length < limit) break;
		offset += limit;
		page++;
	}

	let results: INodeListSearchItems[] = users.map((id) => ({ name: id, value: id }));
	if (filter) {
		const needle = filter.toLowerCase();
		results = results.filter((r) => r.name.toLowerCase().includes(needle));
	}
	return { results };
}
