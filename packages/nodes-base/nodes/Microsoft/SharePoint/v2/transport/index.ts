import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { capitalize } from '../../../../../utils/utilities';

export const SERVICE_PRINCIPAL_AUTH = 'microsoftEntraServicePrincipalApi';

export type SharePointCredentialType = 'microsoftOAuth2Api' | typeof SERVICE_PRINCIPAL_AUTH;

export const DEFAULT_GRAPH_BASE_URL = 'https://graph.microsoft.com';

// Consulted on 403s so the error names the missing permission; each action adds its row.
export const REQUIRED_PERMISSIONS: Record<string, { delegated: string; application: string }> = {
	'list:get': {
		delegated: 'Sites.Read.All',
		application: 'Sites.Read.All (or Sites.Selected granted for this site)',
	},
};

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
	} catch {}
	return undefined;
}

type GraphRequestError = {
	httpCode?: string | number | null;
	statusCode?: string | number | null;
	message?: string;
	code?: string;
	error?: { error?: GraphRequestError };
};

/** Best-effort; load-options contexts may not expose the resource parameter. */
function nodeResourceName(this: IExecuteFunctions | ILoadOptionsFunctions): string | undefined {
	try {
		const resource = this.getNodeParameter('resource', 0);
		if (typeof resource === 'string' && resource !== '') {
			return capitalize(resource);
		}
	} catch {}
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

		if (error.code === 'NotFound' && error.message === 'Resource not found') {
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
	body: IDataObject = {},
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
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		// An explicit `uri` (e.g. a next-page link from Graph) is used verbatim
		uri: uri ?? `${baseUrl}${resource}`,
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
