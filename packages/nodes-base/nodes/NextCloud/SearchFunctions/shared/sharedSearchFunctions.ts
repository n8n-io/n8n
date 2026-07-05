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
		// 'authentication' parameter not yet set — fall back to default.
		authenticationMethod = 'accessToken';
	}
	const credentialName = authenticationMethod === 'oAuth2' ? 'nextCloudOAuth2Api' : 'nextCloudApi';
	let credentials: { webDavUrl?: string; user?: string; password?: string };
	try {
		credentials = await ctx.getCredentials(credentialName);
	} catch {
		return null;
	}
	if (!credentials?.webDavUrl || !credentials.user || !credentials.password) {
		return null;
	}
	const baseUrl = (credentials.webDavUrl as string)
		.replace(/\/remote\.php\/(webdav|dav)\/?$/, '')
		.replace(/\/+$/, '');
	const basicAuth = Buffer.from(`${credentials.user}:${credentials.password}`).toString('base64');
	return { baseUrl, basicAuth };
}

/**
 * Shared user search — reusable by Deck (assign/unassign) and User resource.
 * Calls global OCS /cloud/users endpoint.
 */
export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const ctx = await getNextCloudContext(this);
	if (!ctx) return { results: [] };

	try {
		const response = (await this.helpers.request({
			method: 'GET',
			url: `${ctx.baseUrl}/ocs/v1.php/cloud/users?limit=200&offset=0`,
			headers: {
				'OCS-APIRequest': 'true',
				Accept: 'application/json',
				Authorization: `Basic ${ctx.basicAuth}`,
			},
			json: true,
		})) as { ocs?: { data?: { users?: string[] } } };

		const users = response?.ocs?.data?.users ?? [];
		let results: INodeListSearchItems[] = users.map((id) => ({ name: id, value: id }));
		if (filter) {
			const needle = filter.toLowerCase();
			results = results.filter((r) => r.name.toLowerCase().includes(needle));
		}
		return { results };
	} catch (error) {
		console.error('NextCloud getUsers failed:', (error as Error).message);
		return { results: [] };
	}
}
