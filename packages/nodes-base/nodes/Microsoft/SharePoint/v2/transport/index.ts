import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { capitalize } from '../../../../../utils/utilities';

export const SERVICE_PRINCIPAL_AUTH = 'microsoftEntraServicePrincipalApi';

export type SharePointCredentialType = 'microsoftOAuth2Api' | typeof SERVICE_PRINCIPAL_AUTH;

export const DEFAULT_GRAPH_BASE_URL = 'https://graph.microsoft.com';

// Consulted on 403s so the error names the missing permission; each action adds
// its row. Invariant: every operation's permission is a superset of what its
// pickers need, so a picker 403 naming the selected operation's permission stays
// truthful; a picker wanting different copy catches httpCode '403' and rethrows
// (see getSites). Frozen so no import can mutate the contract.
export const REQUIRED_PERMISSIONS: Readonly<
	Record<string, { delegated: string; application: string }>
> = Object.freeze({
	'file:download': {
		delegated: 'Sites.Read.All',
		application: 'Sites.Read.All (or Sites.Selected granted for this site)',
	},
	'file:update': {
		delegated: 'Sites.ReadWrite.All',
		application: 'Sites.ReadWrite.All (or Sites.Selected granted with write access for this site)',
	},
	'file:upload': {
		delegated: 'Sites.ReadWrite.All',
		application: 'Sites.ReadWrite.All (or Sites.Selected granted with write access for this site)',
	},
	'list:get': {
		delegated: 'Sites.Read.All',
		application: 'Sites.Read.All (or Sites.Selected granted for this site)',
	},
	'list:getAll': {
		delegated: 'Sites.Read.All',
		application: 'Sites.Read.All (or Sites.Selected granted for this site)',
	},
	'item:get': {
		delegated: 'Sites.Read.All (or Files.Read.All for document-library items)',
		application:
			'Sites.Read.All (or Sites.Selected granted for this site, or Files.Read.All for document-library items)',
	},
	'item:delete': {
		delegated: 'Sites.ReadWrite.All (or Files.ReadWrite.All for document-library items)',
		application:
			'Sites.ReadWrite.All (or Sites.Selected granted for this site, or Files.ReadWrite.All for document-library items)',
	},
});

export function getSharePointCredentialType(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): SharePointCredentialType {
	// In load-options contexts the 2nd arg is the fallback, not an item index — keep the 2-arg form
	const selected = this.getNodeParameter('authentication', 0);
	return selected === SERVICE_PRINCIPAL_AUTH ? SERVICE_PRINCIPAL_AUTH : 'microsoftOAuth2Api';
}

/** Best-effort lookup; load-options contexts may not expose resource/operation. */
function lookupRequiredPermissions(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): { delegated: string; application: string } | undefined {
	try {
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		if (typeof resource === 'string' && typeof operation === 'string') {
			return REQUIRED_PERMISSIONS[`${resource}:${operation}`];
		}
	} catch {
		// Load-options contexts may not expose this parameter
	}
	return undefined;
}

type GraphRequestError = {
	httpCode?: string | number | null;
	statusCode?: string | number | null;
	message?: string;
	code?: string;
	error?: { error?: GraphRequestError };
};

// Graph's not-found code varies by surface: SharePoint sends 'itemNotFound'
// (v1 keys off it), the sibling Excel-on-SharePoint node verified 'ItemNotFound'
// live, and 'NotFound' is the generic OData code. Match on code alone — the
// message text is not a stable contract.
const NOT_FOUND_CODES = ['NotFound', 'ItemNotFound', 'itemNotFound'];

/** Best-effort; load-options contexts may not expose the resource parameter. */
function nodeResourceName(this: IExecuteFunctions | ILoadOptionsFunctions): string | undefined {
	try {
		const resource = this.getNodeParameter('resource', 0);
		if (typeof resource === 'string' && resource !== '') {
			return capitalize(resource);
		}
	} catch {
		// Load-options contexts may not expose this parameter
	}
	return undefined;
}

// App-only error bodies can include internal identifiers — surface only a
// fixed message + status (which lives on `httpCode` as a string when wrapped)
function servicePrincipalApiError(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	error: GraphRequestError,
): NodeApiError {
	const rawCode = error.httpCode ?? error.statusCode;
	const httpCode: number | undefined =
		rawCode === undefined || rawCode === null ? undefined : Number(rawCode);
	const nodeResource = httpCode === 404 ? nodeResourceName.call(this) : undefined;

	let message: string;
	if (httpCode === 404 && nodeResource) {
		message = `${nodeResource} not found`;
	} else if (httpCode === 401) {
		message =
			"The Service Principal token was rejected. Check the app registration's client secret and that admin consent is granted.";
	} else if (httpCode === 403) {
		const permissions = lookupRequiredPermissions.call(this);
		message = permissions
			? `The app registration is missing a consented application permission for this operation: ${permissions.application}. Grant it and admin consent, then retry.`
			: 'The app registration is missing a consented application permission for this operation. Grant the required Microsoft Graph application permission and admin consent, then retry.';
	} else {
		message = `Microsoft Graph rejected the request (HTTP ${httpCode ?? 'unknown'}). Check the operation's inputs and the app registration's permissions.`;
	}

	const sanitizedError: JsonObject = { message };
	const errorOptions: IDataObject = { message };
	if (httpCode !== undefined && !Number.isNaN(httpCode)) {
		sanitizedError.httpStatusCode = httpCode;
		errorOptions.httpCode = `${httpCode}`;
	}
	return new NodeApiError(this.getNode(), sanitizedError, errorOptions);
}

function delegatedApiError(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	error: GraphRequestError,
): NodeApiError {
	const errorOptions: IDataObject = {};
	const statusCode = Number(error.statusCode ?? error.httpCode);
	if (statusCode === 403) {
		// Missing scope OR no access to the site; callers key off httpCode '403'
		const permissions = lookupRequiredPermissions.call(this);
		errorOptions.message = permissions
			? `Microsoft Graph refused this request. The credential may be missing the ${permissions.delegated} permission, or the signed-in account may not have access to this resource`
			: 'Microsoft Graph refused this request. The credential may be missing a required permission, or the signed-in account may not have access to this resource';
		errorOptions.description =
			"Check the credential's scopes (with admin consent if your tenant requires it) and that the signed-in account can access the site, then try again.";
		errorOptions.httpCode = '403';
	} else if (error.error?.error) {
		const httpCode = error.statusCode;
		error = error.error.error;
		error.statusCode = httpCode;
		errorOptions.message = error.message;

		if (error.code && NOT_FOUND_CODES.includes(error.code)) {
			const nodeResource = nodeResourceName.call(this);
			if (nodeResource) {
				errorOptions.message = `${nodeResource} not found`;
			}
		}
	}
	return new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
}

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject | Buffer = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<IDataObject> {
	const credentialType = getSharePointCredentialType.call(this);
	const isServicePrincipal = credentialType === SERVICE_PRINCIPAL_AUTH;
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: DEFAULT_GRAPH_BASE_URL
	).replace(/\/+$/, '');
	// An explicit `uri` (e.g. a next-page link from Graph) is used verbatim —
	// but it must stay on the credential's Graph host: the bearer token must
	// never travel to an unexpected origin. Graph's own @odata.nextLink is
	// always same-origin, so nothing legitimate is refused.
	const target = uri ?? `${baseUrl}${resource}`;
	if (new URL(target).origin !== new URL(baseUrl).origin) {
		throw new NodeOperationError(
			this.getNode(),
			'Refusing to send credentials to an unexpected host',
		);
	}
	// Deliberately the family's request stack (Teams/Excel/OneDrive use the
	// same deprecated helpers): the error mapping above is shape-coupled to
	// its wrapped errors — migrate together with the family, not solo.
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
		// The SP credential is not an oAuth2Api type, so it can't go through requestOAuth2
		if (isServicePrincipal) {
			return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
		}
		return await this.helpers.requestOAuth2.call(this, credentialType, options);
	} catch (error) {
		throw isServicePrincipal
			? servicePrincipalApiError.call(this, error)
			: delegatedApiError.call(this, error);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	limit?: number,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let uri: string | undefined;

	do {
		// A next-page link is a complete address (already carries $select/$top/
		// $skiptoken) — qs only applies to the first, endpoint-built request.
		const responseData = await microsoftApiRequest.call(
			this,
			method,
			endpoint,
			body,
			uri ? {} : qs,
			uri,
		);
		returnData.push.apply(
			returnData,
			(responseData[propertyName] as IDataObject[] | undefined) ?? [],
		);
		uri = responseData['@odata.nextLink'] as string | undefined;
	} while (uri !== undefined && (limit === undefined || returnData.length < limit));

	// Math.max guards a negative limit (only reachable via an expression — the
	// UI's minValue:1 blocks it): slice(0, -5) means "drop the last 5", not
	// "return none", which would otherwise silently hand back the wrong window.
	return limit === undefined ? returnData : returnData.slice(0, Math.max(0, limit));
}
