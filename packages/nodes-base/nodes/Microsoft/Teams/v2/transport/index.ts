import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	IHookFunctions,
	INode,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { capitalize } from '../../../../../utils/utilities';

/**
 * Credential-name literal of the shared `microsoftEntraServicePrincipalApi`
 * (app-only) credential. Used as both the `authentication` selector value and the
 * credential type, so a rename stays in one place.
 */
export const SERVICE_PRINCIPAL_AUTH = 'microsoftEntraServicePrincipalApi';

/**
 * Field-level `displayOptions.hide` gate spread onto every operation/event/field
 * that has no usable app-only form. The slash-prefixed `/authentication` key
 * addresses the root selector from a nested field (distinct from the un-prefixed
 * `show.authentication` key used on the credential entries themselves).
 */
export const SP_HIDE = { '/authentication': [SERVICE_PRINCIPAL_AUTH] };

export type TeamsCredentialType =
	| 'microsoftTeamsOAuth2Api'
	| 'microsoftOAuth2Api'
	| typeof SERVICE_PRINCIPAL_AUTH;

/**
 * Resolves which credential type the node is configured to use. Defaults to the
 * node-specific `microsoftTeamsOAuth2Api` so existing workflows (and nodes saved
 * before the `authentication` selector existed) keep working unchanged, while
 * allowing the generic `microsoftOAuth2Api` (Graph) credential or the app-only
 * `microsoftEntraServicePrincipalApi` (Service Principal) credential to be selected.
 *
 * Allow-list resolver: only the two known non-default credential names are honored;
 * anything else (unset/legacy nodes, an unknown value, or the load-options fallback
 * `0`) falls back to the Teams credential.
 *
 * Shared by the action node (v2), its `listSearch` helpers and the Trigger's
 * webhook hooks, since all of them authenticate through `microsoftApiRequest`.
 */
export function getTeamsCredentialType(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
): TeamsCredentialType {
	// `0` is the execute item index; in load-options/hook contexts getNodeParameter
	// treats the 2nd arg as the FALLBACK value, so don't switch this to the 3-arg form.
	// Use an explicit allow-list (not `selected ?? default`): in load-options/hooks a
	// legacy node with no stored `authentication` returns the literal fallback `0`,
	// which is not nullish — so `?? default` would resolve to `0` and break
	// `getCredentials(0)`. Anything other than the two known non-default values
	// (incl. `0`, `undefined`, legacy nodes) resolves to the Teams credential.
	const selected = this.getNodeParameter('authentication', 0) as TeamsCredentialType | undefined;
	return selected === 'microsoftOAuth2Api' || selected === SERVICE_PRINCIPAL_AUTH
		? selected
		: 'microsoftTeamsOAuth2Api';
}

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

// Reject any id that could escape its Graph path segment or start a query/fragment:
// path separators (`/` `\`), query/fragment starters (`?` `#`), and control chars
// (0x00–0x1F). `:` and `@` are ALLOWED — they are structure-neutral inside a single
// Teams id segment (real channel ids look like `19:...@thread.tacv2`), and the proven
// Graph URL shape interpolates them raw. Validating the shape (not encoding) is what
// keeps a value safe to interpolate raw. Messages are static so a rejected id is
// never echoed back.
// eslint-disable-next-line no-control-regex
const TEAMS_ID_REJECT = /[\x00-\x1f\/\\?#]/;

/**
 * Validates a user-supplied Graph id (already `extractValue`-resolved) before it is
 * interpolated RAW into a Graph path, and returns the coerced + trimmed value.
 * Throws a `NodeOperationError` with a fully static message (never echoing the id)
 * on a bad shape. Reused for both path IDs and `task:create` body IDs.
 */
export function validateTeamsId(id: string, node: INode): string {
	const value = String(id ?? '').trim();
	if (value === '') {
		throw new NodeOperationError(node, 'A required ID is empty', {
			description: 'Set the team, channel, plan, bucket or task ID and try again.',
		});
	}
	if (/^\.+$/.test(value)) {
		throw new NodeOperationError(node, 'The ID is not valid', {
			description: 'An ID cannot consist only of dots.',
		});
	}
	if (TEAMS_ID_REJECT.test(value)) {
		throw new NodeOperationError(node, 'The ID is not valid', {
			description: 'Remove any slashes, backslashes, question marks or hashes and try again.',
		});
	}
	return value;
}

type TeamsPathSegment = string | { id: string };

/**
 * Single, non-bypassable path builder for every Graph path that interpolates a
 * user-supplied id. `segments` is an ordered mix of literal strings and id parts
 * (`{ id: value }`). Every `{ id }` is validated then interpolated RAW, under
 * both credential types. See `validateTeamsId` / `TEAMS_ID_REJECT` for why
 * validation (not encoding) is the guard.
 */
export function buildTeamsPath(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	segments: TeamsPathSegment[],
): string {
	const node = this.getNode();
	return segments
		.map((segment) => {
			if (typeof segment === 'string') return segment;
			// validateTeamsId coerces + trims — `as string` at the call sites is
			// compile-time only, so an expression can resolve an id to a non-string.
			return validateTeamsId(segment.id, node);
		})
		.join('');
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
	if (ids.planId !== undefined) validateTeamsId(ids.planId, node);
	if (ids.bucketId !== undefined) validateTeamsId(ids.bucketId, node);
}

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const credentialType = getTeamsCredentialType.call(this);
	const isServicePrincipal = credentialType === SERVICE_PRINCIPAL_AUTH;
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: 'https://graph.microsoft.com'
	).replace(/\/+$/, '');
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `${baseUrl}${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		// The Service Principal credential is not an `oAuth2Api` parent type — it
		// mints a bearer via preAuthentication + attaches it via authenticate, so it
		// must go through `requestWithAuthentication` (core's single 401-retry re-runs
		// the token mint). OAuth2 credentials keep using `requestOAuth2`.
		if (isServicePrincipal) {
			return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
		}
		return await this.helpers.requestOAuth2.call(this, credentialType, options);
	} catch (error) {
		if (isServicePrincipal) {
			// App-only runs under a tenant-wide token: a raw Graph error body can carry
			// correlation IDs and reflected input. For ANY status, never pass the raw
			// body to NodeApiError (it would land in `messages`/context); throw a
			// sanitized error whose only content is a static message + the status code.
			//
			// `requestWithAuthentication` wraps the underlying request error in a
			// `NodeApiError`, which exposes the HTTP status on `httpCode` (a string) — NOT
			// on `statusCode` / `error.error.statusCode`. Read `httpCode` first; fall back
			// to `statusCode` for the rare raw-error case. The Graph body/code is not
			// reliably accessible on the wrapped error, so key the NotFound rewrite off the
			// numeric 404 rather than the Graph `code`.
			const rawCode = error?.httpCode ?? error?.statusCode;
			const httpCode: number | undefined =
				rawCode === undefined || rawCode === null ? undefined : Number(rawCode);

			let message: string;
			// `resource` exists on the action node but NOT in the trigger IHookFunctions
			// context — read it defensively so a 404 in the trigger falls through to the
			// generic static message instead of "Undefined not found".
			let nodeResource: string | undefined;
			try {
				const resource = this.getNodeParameter('resource', 0) as string | undefined;
				if (typeof resource === 'string' && resource !== '') {
					nodeResource = capitalize(resource);
				}
			} catch {
				nodeResource = undefined;
			}
			if (httpCode === 404 && nodeResource) {
				message = `${nodeResource} not found`;
			} else if (httpCode === 401) {
				message =
					"The Service Principal token was rejected. Check the app registration's client secret and that admin consent is granted.";
			} else if (httpCode === 402) {
				message =
					'This operation requires a metered Microsoft Teams API to be enabled on the tenant.';
			} else if (httpCode === 403) {
				message =
					'The app registration is missing a consented application permission for this operation. Grant the required Graph application permission and admin consent, then retry.';
			} else {
				message = `Microsoft Graph rejected the request (HTTP ${httpCode ?? 'unknown'}). Check the operation's inputs and the app registration's permissions.`;
			}

			const sanitizedError: JsonObject = { message };
			const errorOptions: IDataObject = { message };
			if (httpCode !== undefined && !Number.isNaN(httpCode)) {
				sanitizedError.httpStatusCode = httpCode;
				errorOptions.httpCode = `${httpCode}`;
			}
			throw new NodeApiError(this.getNode(), sanitizedError, errorOptions);
		}

		const errorOptions: IDataObject = {};
		if (error.error?.error) {
			const httpCode = error.statusCode;
			error = error.error.error;
			error.statusCode = httpCode;
			errorOptions.message = error.message;

			if (error.code === 'NotFound' && error.message === 'Resource not found') {
				const nodeResource = capitalize(this.getNodeParameter('resource', 0) as string);
				errorOptions.message = `${nodeResource} not found`;
			}
		}
		throw new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData['@odata.nextLink'];
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		const limit = query.limit as number | undefined;
		if (limit && limit <= returnData.length) {
			return returnData;
		}
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}

export async function microsoftApiRequestAllItemsSkip(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.$top = 100;
	query.$skip = 0;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query);
		query.$skip += query.$top;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.value.length !== 0);

	return returnData;
}
