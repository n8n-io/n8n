import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

/** The instance's own OAuth2 server as a trusted source: what every trigger uses unless told otherwise. */
export const DEFAULT_TRUSTED_SOURCE_ID = 'n8n-internal';

/**
 * The `trustedSource` dropdown of a trigger that signs the user in with a redirect: the sources
 * accepted on the trigger surface that can run that flow.
 */
export async function listRedirectLoginTrustedSources(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const sources =
		(await this.helpers.listTrustedSources?.({
			surface: 'trigger',
			capability: 'redirect-login',
		})) ?? [];
	return sources.map(({ id, name }) => ({ name, value: id }));
}
