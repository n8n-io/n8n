import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

/** The instance's own OAuth2 server as a trusted source: what every trigger uses unless told otherwise. */
export const DEFAULT_TRUSTED_SOURCE_ID = 'n8n-internal';

async function listTriggerTrustedSources(
	context: ILoadOptionsFunctions,
	capability: 'verify-jwt' | 'redirect-login',
): Promise<INodePropertyOptions[]> {
	const sources =
		(await context.helpers.listTrustedSources?.({ surface: 'trigger', capability })) ?? [];
	return sources.map(({ id, name }) => ({ name, value: id }));
}

/**
 * The `trustedSource` dropdown of a trigger that signs the user in with a redirect: the sources
 * accepted on the trigger surface that can run that flow.
 */
export async function listRedirectLoginTrustedSources(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await listTriggerTrustedSources(this, 'redirect-login');
}

/**
 * The `trustedSource` dropdown of a trigger that takes a bearer token: the sources accepted on
 * the trigger surface whose tokens n8n can verify.
 */
export async function listBearerTrustedSources(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await listTriggerTrustedSources(this, 'verify-jwt');
}
