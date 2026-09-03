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
import { NodeApiError, NodeOperationError, UnexpectedError } from 'n8n-workflow';

import { capitalize } from '../utilities';

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
 * Frozen so no import can mutate the contract (the inner array keeps the mutable
 * type `IDisplayOptions` expects, so only the key is locked).
 */
export const SP_HIDE: Readonly<{ '/authentication': string[] }> = Object.freeze({
	'/authentication': [SERVICE_PRINCIPAL_AUTH],
});

export type MicrosoftGraphCredentialType<TDefault extends string> =
	| TDefault
	| 'microsoftOAuth2Api'
	| typeof SERVICE_PRINCIPAL_AUTH;

// Reject any id that could escape its Graph path segment or start a query/fragment:
// path separators (`/` `\`), query/fragment starters (`?` `#`), residual percent
// (`%`), and control chars (0x00-0x1F). `:` and `@` are ALLOWED: they are
// structure-neutral inside a single Teams id segment (real channel ids look like
// `19:...@thread.tacv2`), and the proven Graph URL shape interpolates them raw.
// This class runs against the percent-DECODED value: a pre-encoded separator like
// `..%2F..` decodes to `../..` and is caught by the separator chars, a double-encoded
// one like `..%252F..` decodes to `..%2F..` and is caught by the residual `%`
// (legitimate Graph ids never carry a literal `%` after the single decode), and a
// malformed encoding rejects in the decode step before this.
// Validating the decoded shape (not encoding) is what keeps a value safe to
// interpolate raw. Messages are static so a rejected id is never echoed back.
// eslint-disable-next-line no-control-regex
const GRAPH_ID_REJECT = /[\x00-\x1f\/\\?#%]/;

/**
 * Validates a user-supplied Graph id (already `extractValue`-resolved) before it is
 * interpolated RAW into a Graph path, and returns the coerced, trimmed and
 * percent-decoded value. Teams URLs expose ids percent-encoded
 * (`19%3A...%40thread.tacv2`) and the RLC hints tell users to paste them, so the id
 * is decoded once and the decoded form is what gets validated and interpolated,
 * matching the raw shape list-sourced ids already travel in.
 * Throws a `NodeOperationError` with a fully static message (never echoing the id)
 * on a bad shape. Reused for both path IDs and `task:create` body IDs.
 */
export function validateMicrosoftGraphId(id: string, node: INode): string {
	const trimmed = String(id ?? '').trim();
	if (trimmed === '') {
		throw new NodeOperationError(node, 'A required ID is empty', {
			// Teams wording; make it injectable (UserTargetMessages pattern in
			// nodes/Microsoft/GenericFunctions.ts) when the second consumer (SharePoint v2) lands.
			description:
				'Set the team, channel, plan, bucket, task, meeting, user or member ID and try again.',
		});
	}
	let value: string;
	try {
		value = decodeURIComponent(trimmed);
	} catch {
		throw new NodeOperationError(node, 'The ID is not valid', {
			description: 'The ID contains a malformed percent-encoding. Copy it again and try again.',
		});
	}
	if (/^\.+$/.test(value)) {
		throw new NodeOperationError(node, 'The ID is not valid', {
			description: 'An ID cannot consist only of dots.',
		});
	}
	if (GRAPH_ID_REJECT.test(value)) {
		throw new NodeOperationError(node, 'The ID is not valid', {
			description:
				'Remove any slashes, backslashes, question marks or hashes, and make sure the ID is not double-encoded.',
		});
	}
	return value;
}

export type MicrosoftGraphPathSegment = string | { id: string };

/**
 * Single, non-bypassable path builder for every Graph path that interpolates a
 * user-supplied id. `segments` is an ordered mix of literal strings and id parts
 * (`{ id: value }`). Every `{ id }` is validated then interpolated RAW, under
 * both credential types. See `validateMicrosoftGraphId` / `GRAPH_ID_REJECT` for why
 * validation (not encoding) is the guard.
 */
export function buildMicrosoftGraphPath(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	segments: MicrosoftGraphPathSegment[],
): string {
	const node = this.getNode();
	return segments
		.map((segment) => {
			if (typeof segment === 'string') return segment;
			// validateMicrosoftGraphId coerces + trims — `as string` at the call sites is
			// compile-time only, so an expression can resolve an id to a non-string.
			return validateMicrosoftGraphId(segment.id, node);
		})
		.join('');
}

/**
 * Best-effort read of the node's `resource` parameter for "{Resource} not found"
 * rewrites. The parameter exists on action nodes but not in trigger hook or
 * load-options contexts, where `getNodeParameter` either throws or returns the
 * literal fallback `0`; both resolve to `undefined` here so callers fall back to
 * a generic message instead of surfacing "0 not found".
 */
function nodeResourceName(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
): string | undefined {
	try {
		const resource = this.getNodeParameter('resource', 0);
		if (typeof resource === 'string' && resource !== '') {
			return capitalize(resource);
		}
	} catch {
		// hook/load-options contexts may not expose this parameter
	}
	return undefined;
}

/**
 * Binds the shared Microsoft Graph transport to a node's default credential type;
 * the node facade calls this once at module load and re-exports the returned
 * functions. `defaultCredentialType` is the node's back-compat delegated OAuth2
 * default for legacy nodes with no stored `authentication` value: the node's own
 * credential literal, or the generic `'microsoftOAuth2Api'` where that is the
 * node's default (as in SharePoint v2). Never `SERVICE_PRINCIPAL_AUTH` (enforced
 * below): legacy nodes would silently resolve to the tenant-wide app-only
 * credential.
 *
 * Known SharePoint v2 deltas to fold in via factory config (not per-node forks)
 * when it adopts the kernel: injectable static messages (UserTargetMessages
 * pattern in nodes/Microsoft/GenericFunctions.ts), per-operation 403 permission
 * hints, safe-message allowlist, per-page headers and a negative-limit guard on
 * `microsoftApiRequestAllItems`.
 */
export function createMicrosoftGraphTransport<TDefault extends string>(config: {
	defaultCredentialType: TDefault;
}) {
	const { defaultCredentialType } = config;
	const defaultTypeName: string = defaultCredentialType;
	if (defaultTypeName === SERVICE_PRINCIPAL_AUTH) {
		// Fail at module load so a misconfigured facade can never ship.
		throw new UnexpectedError(
			'createMicrosoftGraphTransport: defaultCredentialType must be a delegated OAuth2 credential, not the Service Principal credential',
		);
	}

	/**
	 * Resolves which credential type the node is configured to use. Defaults to the
	 * configured `defaultCredentialType` so existing workflows (and nodes saved
	 * before the `authentication` selector existed) keep working unchanged, while
	 * allowing the generic `microsoftOAuth2Api` (Graph) credential or the app-only
	 * `microsoftEntraServicePrincipalApi` (Service Principal) credential to be selected.
	 *
	 * Allow-list resolver: only the two known non-default credential names are honored;
	 * anything else (unset/legacy nodes, an unknown value, or the load-options fallback
	 * `0`) falls back to the default credential.
	 *
	 * Shared by the action node, its `listSearch` helpers and the Trigger's
	 * webhook hooks, since all of them authenticate through `microsoftApiRequest`.
	 */
	function getCredentialType(
		this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	): MicrosoftGraphCredentialType<TDefault> {
		// `0` is the execute item index; in load-options/hook contexts getNodeParameter
		// treats the 2nd arg as the FALLBACK value, so don't switch this to the 3-arg form.
		// Use an explicit allow-list (not `selected ?? default`): in load-options/hooks a
		// legacy node with no stored `authentication` returns the literal fallback `0`,
		// which is not nullish — so `?? default` would resolve to `0` and break
		// `getCredentials(0)`. Anything other than the two known non-default values
		// (incl. `0`, `undefined`, legacy nodes) resolves to the default credential.
		const selected = this.getNodeParameter('authentication', 0) as
			| MicrosoftGraphCredentialType<TDefault>
			| undefined;
		return selected === 'microsoftOAuth2Api' || selected === SERVICE_PRINCIPAL_AUTH
			? selected
			: defaultCredentialType;
	}

	/**
	 * Resolves the Graph host the node's credential is bound to (sovereign clouds
	 * included), trailing slashes stripped. `microsoftApiRequest` must compute its
	 * `baseUrl` ONLY through this: the same value feeds the same-origin guard below,
	 * so a second copy of this logic would let an operation that builds an absolute
	 * Graph URL (e.g. `user@odata.bind`) drift from the host the request goes to.
	 */
	async function getGraphBaseUrl(
		this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	): Promise<string> {
		const credentials = await this.getCredentials(getCredentialType.call(this));
		return (
			typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
				? credentials.graphApiBaseUrl
				: 'https://graph.microsoft.com'
		).replace(/\/+$/, '');
	}

	async function microsoftApiRequest(
		this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
		method: IHttpRequestMethods,
		resource: string,
		body: any = {},
		qs: IDataObject = {},
		uri?: string,
		headers: IDataObject = {},
	): Promise<any> {
		const credentialType = getCredentialType.call(this);
		const isServicePrincipal = credentialType === SERVICE_PRINCIPAL_AUTH;
		const baseUrl = await getGraphBaseUrl.call(this);
		// An explicit `uri` (e.g. a next-page link from Graph) is used verbatim,
		// but it must stay on the credential's Graph host: the bearer token must
		// never travel to an unexpected origin. Graph's own @odata.nextLink is
		// always same-origin, so nothing legitimate is refused.
		const target = uri || `${baseUrl}${resource}`;
		if (new URL(target).origin !== new URL(baseUrl).origin) {
			throw new NodeOperationError(
				this.getNode(),
				'Refusing to send credentials to an unexpected host',
			);
		}
		const options: IRequestOptions = {
			headers: {
				'Content-Type': 'application/json',
			},
			method,
			body,
			qs,
			uri: target,
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
				const nodeResource = nodeResourceName.call(this);
				if (httpCode === 404 && nodeResource) {
					message = `${nodeResource} not found`;
				} else if (httpCode === 401) {
					message =
						"The Service Principal token was rejected. Check the app registration's client secret and that admin consent is granted.";
				} else if (httpCode === 402) {
					// Teams wording; make it injectable (UserTargetMessages pattern in
					// nodes/Microsoft/GenericFunctions.ts) when the second consumer (SharePoint v2) lands.
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
					// Same defensive read as the SP branch: in a trigger hook context the
					// `resource` parameter resolves to the fallback `0`, which must not
					// surface as "0 not found".
					const nodeResource = nodeResourceName.call(this);
					if (nodeResource) {
						errorOptions.message = `${nodeResource} not found`;
					}
				}
			}
			throw new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
		}
	}

	async function microsoftApiRequestAllItems(
		this: IExecuteFunctions | ILoadOptionsFunctions,
		propertyName: string,
		method: IHttpRequestMethods,
		endpoint: string,
		body: any = {},
		query: IDataObject = {},
		limit?: number,
	): Promise<any> {
		const returnData: IDataObject[] = [];

		let responseData;
		let uri: string | undefined;

		do {
			// `@odata.nextLink` already carries the query params; don't re-send them
			responseData = await microsoftApiRequest.call(
				this,
				method,
				endpoint,
				body,
				uri ? {} : query,
				uri,
			);
			uri = responseData['@odata.nextLink'];
			returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
			if (limit && returnData.length >= limit) {
				return returnData.slice(0, limit);
			}
		} while (responseData['@odata.nextLink'] !== undefined);

		return returnData;
	}

	return { getCredentialType, getGraphBaseUrl, microsoftApiRequest, microsoftApiRequestAllItems };
}
