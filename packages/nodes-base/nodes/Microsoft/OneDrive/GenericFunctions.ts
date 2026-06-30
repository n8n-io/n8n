import { DateTime } from 'luxon';
import {
	NodeApiError,
	NodeOperationError,
	OperationalError,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type IDataObject,
	type INode,
	type JsonObject,
	type IHttpRequestMethods,
	type IRequestOptions,
	type IPollFunctions,
} from 'n8n-workflow';

/**
 * Characters that OneDrive/SharePoint forbid in file names. Sending any of
 * these breaks Graph's `:/path:/` addressing (a colon collapses the URL to the
 * item entity endpoint), so Graph rejects the upload with a misleading
 * `Entity only allows writes with a JSON Content-Type header` 400.
 */
export const ONEDRIVE_ILLEGAL_FILE_NAME_CHARS = ['"', '*', ':', '<', '>', '?', '/', '\\', '|'];

/**
 * Validates a resolved upload file name before any Graph request is made.
 * Throws a `NodeOperationError` (carrying `itemIndex`) when the name is missing,
 * blank, or contains a character OneDrive doesn't allow, naming the offending
 * character(s) and suggesting a fix. The assertion signature narrows the name to
 * `string` for callers once it returns.
 */
export function validateOneDriveFileName(
	node: INode,
	fileName: string | undefined,
	itemIndex: number,
): asserts fileName is string {
	if (fileName === undefined || fileName.trim() === '') {
		throw new NodeOperationError(node, 'File name must be set!', { itemIndex });
	}

	const illegalChars = ONEDRIVE_ILLEGAL_FILE_NAME_CHARS.filter((char) => fileName.includes(char));
	if (illegalChars.length > 0) {
		throw new NodeOperationError(
			node,
			`The file name "${fileName}" contains characters that OneDrive doesn't allow: ${illegalChars.join(' ')}`,
			{
				itemIndex,
				description:
					`OneDrive file names can't contain any of these characters: ${ONEDRIVE_ILLEGAL_FILE_NAME_CHARS.join(' ')}. Remove them from the file name and try again.` +
					(illegalChars.includes(':')
						? " If you're inserting a timestamp, use a colon-free format such as {{ $now.toFormat('yyyy-MM-dd_HH-mm-ss') }}."
						: ''),
			},
		);
	}
}

export type OneDriveCredentialType =
	| 'microsoftOneDriveOAuth2Api'
	| 'microsoftOAuth2Api'
	| 'microsoftEntraServicePrincipalApi';

/**
 * Resolves which credential type the node is configured to use. Defaults to the
 * node-specific `microsoftOneDriveOAuth2Api` so existing workflows (and nodes
 * without the `authentication` selector) keep working unchanged, while allowing
 * the generic `microsoftOAuth2Api` (Graph) credential or the app-only
 * `microsoftEntraServicePrincipalApi` (Service Principal) credential to be
 * selected.
 */
export function getOneDriveCredentialType(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
): OneDriveCredentialType {
	// getNodeParameter's signature is different in execute vs load options/poll contexts
	// using `|| default` so it works in all contexts
	const selected = this.getNodeParameter('authentication', 0) as OneDriveCredentialType;
	return selected || 'microsoftOneDriveOAuth2Api';
}

// App-only Microsoft Graph has no `/me`, so the drive is addressed under an
// explicit user or drive root. The accepted shapes are deliberately narrow and the
// id shape is validated BEFORE encoding — `encodeURIComponent` leaves `..` intact,
// so shape validation (not encoding) is what keeps a value safe to interpolate into
// a Graph URL path. Validation messages are static, so the id is never echoed back.
const USER_TARGET_GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
const USER_TARGET_UPN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/;
const USER_TARGET_HOST = /^[A-Za-z0-9.-]+$/;
const DRIVE_TARGET_ID = /^[A-Za-z0-9!._-]+$/;

/**
 * Validates an app-only `resourceTargetId` for a given target before it is encoded
 * and used to compose a Graph URL. Throws a `NodeOperationError` with a fully
 * static message (never interpolating the id) on a bad shape. The common rejects
 * (empty / whitespace-only / dots-only) are checked FIRST for all targets, then the
 * per-target regex.
 */
export function validateResourceTargetId(target: string, id: string, node: INode): void {
	// Common rejects for every target, ordered first.
	if (id === '') {
		throw new NodeOperationError(node, 'A target ID is required for the Service Principal', {
			description:
				'Set the User or Drive ID under "Access As" — app-only Microsoft Graph has no personal drive to default to.',
		});
	}
	if (/^\.+$/.test(id)) {
		throw new NodeOperationError(node, 'The target ID is not valid', {
			description: 'A target ID cannot consist only of dots.',
		});
	}

	let valid = false;
	if (target === 'drive') {
		valid = DRIVE_TARGET_ID.test(id);
	} else {
		// user (and any unknown target falls back to the user shape)
		valid = USER_TARGET_GUID.test(id) || USER_TARGET_UPN.test(id) || USER_TARGET_HOST.test(id);
	}

	if (!valid) {
		throw new NodeOperationError(node, 'The target ID is not valid', {
			description: 'Remove any slashes, backslashes, colons, commas, or spaces and try again.',
		});
	}
}

/**
 * Builds the `/drive`-free Graph resource root for an app-only request from the
 * chosen target and its id. Reusable kernel (ENT-92+ lifts this) — it deliberately
 * contains NO `/drive` and `encodeURIComponent`s the id. The id shape is validated
 * BEFORE encoding so a malformed id throws (and is not echoed back).
 */
export function getServicePrincipalResourceRoot(
	target: string,
	rawId: string,
	node: INode,
): string {
	const id = String(rawId ?? '').trim();
	validateResourceTargetId(target, id, node);
	switch (target) {
		case 'drive':
			return `/drives/${encodeURIComponent(id)}`;
		case 'user':
		default:
			return `/users/${encodeURIComponent(id)}`;
	}
}

/**
 * Composes the drive endpoint from a `/drive`-free entity root. `/drives/{id}` is
 * already a drive, so it is used as-is; a `/users/{id}` root addresses its default
 * drive via the `/drive` navigation property. Keeping this out of
 * `getServicePrincipalResourceRoot` lets that kernel stay `/drive`-free and liftable.
 */
export function driveEndpoint(root: string): string {
	return root.startsWith('/drives/') ? root : `${root}/drive`;
}

/**
 * Resolves the app-only Graph scope root for the current node/poll context, or
 * `undefined` for the OAuth2 credentials (which use the `/me` path). The `isPoll`
 * flag selects the context-correct `getNodeParameter` signature — poll is
 * `(name, fallback, options)`, execute is `(name, itemIndex, fallback, options)` —
 * so the RLC is read (with `extractValue`) without coupling transport to either
 * signature. Validation + encoding happen in `getServicePrincipalResourceRoot`.
 *
 * `resourceTarget`/the target RLC are `noDataExpression` (per-node, not per-item),
 * so `itemIndex` exists only to satisfy the execute `getNodeParameter` signature —
 * the resolved root is the same for every item in the run.
 */
export function resolveDriveScopeRoot(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	isPoll: boolean,
	itemIndex = 0,
): string | undefined {
	const credType = getOneDriveCredentialType.call(this);
	if (credType !== 'microsoftEntraServicePrincipalApi') {
		// OAuth2 credentials address the signed-in user's drive via `/me`.
		return undefined;
	}
	const target = isPoll
		? (this.getNodeParameter('resourceTarget', 'user') as string)
		: (this.getNodeParameter('resourceTarget', itemIndex, 'user') as string);
	const id = isPoll
		? (this.getNodeParameter(`${target}Target`, '', { extractValue: true }) as string)
		: (this.getNodeParameter(`${target}Target`, itemIndex, '', { extractValue: true }) as string);
	return getServicePrincipalResourceRoot(target, id, this.getNode());
}

/**
 * Issues a Microsoft Graph request.
 *
 * The `resource` argument is a drive-relative path that MUST start with `/drive`
 * (e.g. `/drive/items/{id}`). For the default OAuth2 credentials it is appended to
 * `/v1.0/me`. When `driveScopeRoot` is supplied (app-only Service Principal), the
 * request is instead composed as `/v1.0{driveEndpoint(root)}{suffix}` (the `/drive`
 * prefix of `resource` is dropped, since `driveEndpoint` already lands on the drive)
 * and routed through the credential-aware `requestWithAuthentication` helper so the
 * token refresh / 401 retry runs once in core.
 *
 * To bypass scoping entirely (delta `@odata.nextLink`/`deltaLink`, a
 * `@microsoft.graph.downloadUrl`), pass the absolute URL as `uri` — it is used
 * verbatim and never prefixed.
 */
export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
	option: IDataObject = { json: true },
	driveScopeRoot?: string,
): Promise<any> {
	const credentialType = getOneDriveCredentialType.call(this);
	const isServicePrincipal = credentialType === 'microsoftEntraServicePrincipalApi';
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: 'https://graph.microsoft.com'
	).replace(/\/+$/, '');

	let uriToUse = uri || `${baseUrl}/v1.0/me${resource}`;
	if (!uri && driveScopeRoot) {
		// Every scoped caller passes a `/drive`-rooted resource. A non-`/drive`
		// resource here means a call site built the wrong path (programmer error,
		// not user input), so fail loudly instead of slicing the wrong prefix.
		if (!resource.startsWith('/drive')) {
			// Static message — never interpolate `resource`, so no id can reach a log.
			throw new OperationalError('microsoftApiRequest: a scoped resource must start with "/drive"');
		}
		// `driveEndpoint` already lands on the drive (`/drives/{id}` as-is, or
		// `/users/{id}/drive`), so drop the leading `/drive` from `resource`.
		uriToUse = `${baseUrl}/v1.0${driveEndpoint(driveScopeRoot)}${resource.slice('/drive'.length)}`;
	}

	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uriToUse,
	};
	try {
		Object.assign(options, option);
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		// Select the helper by credential type, not by `driveScopeRoot`: the trigger's
		// delta calls pass an absolute (already-scoped) `uri` with no `driveScopeRoot`,
		// and the app-only credential is not an `oAuth2Api` parent type — it must go
		// through `requestWithAuthentication` (preAuthentication token mint +
		// authenticate Bearer + core's single 401-retry, called exactly once here).
		if (isServicePrincipal) {
			return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
		}
		return await this.helpers.requestOAuth2.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
	driveScopeRoot?: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.$top = 100;

	do {
		// Page 1 scopes via `driveScopeRoot`; subsequent pages pass the absolute
		// `@odata.nextLink` as `uri`, which bypasses scoping (already correct).
		responseData = await microsoftApiRequest.call(
			this,
			method,
			endpoint,
			body,
			query,
			uri,
			{},
			{ json: true },
			driveScopeRoot,
		);
		uri = responseData['@odata.nextLink'];
		if (uri?.includes('$top')) {
			delete query.$top;
		}
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}

export async function microsoftApiRequestAllItemsSkip(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
	driveScopeRoot?: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.$top = 100;
	query.$skip = 0;

	do {
		responseData = await microsoftApiRequest.call(
			this,
			method,
			endpoint,
			body,
			query,
			undefined,
			{},
			{ json: true },
			driveScopeRoot,
		);
		query.$skip += query.$top;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.value.length !== 0);

	return returnData;
}

// Note: this helper does not take a `driveScopeRoot`. Every request it makes passes
// an absolute `uri` (the `link`/`@odata.nextLink`), which bypasses scoping — the
// scope is already baked into the scoped delta URL the trigger builds (see the
// trigger `poll`), so a passthrough here would be a no-op.
export async function microsoftApiRequestAllItemsDelta(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	link: string,
	lastDate: DateTime,
	eventType: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let deltaLink: string = '';
	let uri: string = link;

	do {
		responseData = (await microsoftApiRequest.call(this, 'GET', '', {}, {}, uri)) as IDataObject;
		uri = responseData['@odata.nextLink'] as string;

		for (const value of responseData.value as IDataObject[]) {
			if (value.fileSystemInfo as IDataObject) {
				const updatedTimeStamp = (value.fileSystemInfo as IDataObject)
					?.lastModifiedDateTime as string;
				const createdTimeStamp = (value.fileSystemInfo as IDataObject)?.createdDateTime as string;
				if (eventType === 'created') {
					if (DateTime.fromISO(createdTimeStamp) >= lastDate) {
						returnData.push(value);
					}
				}
				if (eventType === 'updated') {
					if (
						DateTime.fromISO(updatedTimeStamp) >= lastDate &&
						DateTime.fromISO(createdTimeStamp) < lastDate
					) {
						returnData.push(value);
					}
				}
			}
		}
		//returnData.push.apply(returnData, responseData.value as IDataObject[]);
		deltaLink = (responseData['@odata.deltaLink'] as string) || '';
	} while (responseData['@odata.nextLink'] !== undefined);

	return { deltaLink, returnData };
}

export async function getPath(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	itemId: string,
): Promise<string> {
	// `getPath`'s only production caller is the trigger `poll`, so resolve the scope
	// root with the poll signature and pass the resource-form path so transport can
	// scope it. Do not convert this back to an absolute `/me` uri — that would bypass
	// scoping and break the app-only (Service Principal) case.
	const driveScopeRoot = resolveDriveScopeRoot.call(this, true);
	const responseData = (await microsoftApiRequest.call(
		this,
		'GET',
		`/drive/items/${encodeURIComponent(itemId)}`,
		{},
		{},
		undefined,
		{},
		{ json: true },
		driveScopeRoot,
	)) as IDataObject;
	if (responseData.folder) {
		return (responseData?.parentReference as IDataObject)?.path + `/${responseData?.name}`;
	} else {
		const workflow = this.getWorkflow();
		const node = this.getNode();
		this.logger.error(
			`There was a problem in '${node.name}' node in workflow '${workflow.id}': 'Item to watch is not a folder'`,
			{
				node: node.name,
				workflowId: workflow.id,
				error: 'Item to watch is not a folder',
			},
		);
		throw new NodeApiError(this.getNode(), {
			error: 'Item to watch is not a folder',
		} as JsonObject);
	}
}
