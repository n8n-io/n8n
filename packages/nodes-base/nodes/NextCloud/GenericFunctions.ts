import { isRecord } from '@n8n/utils/is-record';
import {
	NodeOperationError,
	decodePathValue,
	jsonParse,
	requestPath,
	requestUrl,
	sanitizeXmlName,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestMethods,
	type ILoadOptionsFunctions,
	type IPollFunctions,
	type IRequestOptions,
	type IDataObject,
	type IWebhookFunctions,
	type RequestPath,
} from 'n8n-workflow';
import { parseStringPromise } from 'xml2js';

import { WEBDAV_HREF_PREFIX, WEBDAV_URL_SUFFIX } from './constants';

export type NextCloudContext =
	| IHookFunctions
	| IExecuteFunctions
	| IPollFunctions
	| IWebhookFunctions
	| ILoadOptionsFunctions;

/** `webdav` uses the credential URL as entered. `dav` and `ocs` start at the server root. */
export type NextCloudEndpointMode = 'webdav' | 'dav' | 'ocs';

export function webDavPath(path: string): RequestPath {
	return path
		.split('/')
		.reduce(
			(parent, segment) =>
				segment === '' ? requestPath`${parent}/` : requestPath`${parent}/${segment}`,
			requestPath``,
		);
}

/** A path with a leading slash and no trailing or repeated slashes, like `/docs/notes.txt`. */
export function outputPath(path: string): string {
	return `/${path.split('/').filter(Boolean).join('/')}`;
}

export async function readMultistatus(xml: string): Promise<Array<Record<string, unknown>>> {
	const data: unknown = await parseStringPromise(xml, {
		explicitArray: false,
		tagNameProcessors: [sanitizeXmlName],
		attrNameProcessors: [sanitizeXmlName],
	});
	const multistatus = isRecord(data) ? data['d:multistatus'] : undefined;
	return isRecord(multistatus) ? [multistatus['d:response']].flat().filter(isRecord) : [];
}

export function readProps(response: Record<string, unknown> | undefined): Record<string, unknown> {
	const propstat = response ? [response['d:propstat']].flat()[0] : undefined;
	const prop = isRecord(propstat) ? propstat['d:prop'] : undefined;
	return isRecord(prop) ? prop : {};
}

export async function parseFolderList(xml: string): Promise<IDataObject[]> {
	const propNames: Record<string, string> = {
		'd:getlastmodified': 'lastModified',
		'd:getcontentlength': 'contentLength',
		'd:getcontenttype': 'contentType',
	};

	// The first response is the listed folder itself.
	return (await readMultistatus(xml)).slice(1).map((response): IDataObject => {
		const props = readProps(response);
		const eTag = props['d:getetag'];

		return {
			// Nextcloud never encodes "/" in an href, so decoding the full path adds no separator.
			path: decodePathValue(String(response['d:href']).replace(WEBDAV_HREF_PREFIX, '')),
			...Object.fromEntries(
				Object.entries(propNames)
					.filter(([propName]) => typeof props[propName] === 'string')
					.map(([propName, key]): [string, string] => [key, String(props[propName])]),
			),
			type: props['d:resourcetype'] === '' ? 'file' : 'folder',
			eTag: typeof eTag === 'string' ? eTag.slice(1, -1) : undefined,
		};
	});
}

export function nextCloudRootUrl(webDavUrl: string): string {
	return webDavUrl.replace(WEBDAV_URL_SUFFIX, '');
}

export function nextCloudCredentialType(this: NextCloudContext) {
	return this.getNodeParameter('authentication', 0) === 'accessToken'
		? 'nextCloudApi'
		: 'nextCloudOAuth2Api';
}

function endpointUrl(webDavUrl: string, mode: NextCloudEndpointMode, endpoint: RequestPath) {
	if (mode === 'webdav') return requestUrl`${webDavUrl}${endpoint}`;
	const root = nextCloudRootUrl(webDavUrl);
	return mode === 'dav'
		? requestUrl`${root}/remote.php/dav/${endpoint}`
		: requestUrl`${root}/${endpoint}`;
}

/**
 * Make an API request to NextCloud
 *
 */
export async function nextCloudApiRequest(
	this: NextCloudContext,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: object | string | Buffer,
	headers?: IDataObject,
	encoding?: null,
	query?: IDataObject,
	endpointMode: NextCloudEndpointMode = 'webdav',
) {
	const credentialType = nextCloudCredentialType.call(this);
	const credentials = await this.getCredentials<{ webDavUrl: string }>(credentialType);

	// Validate webDavUrl to catch credential corruption (empty, malformed, or no hostname etc.)
	const webDavUrl = credentials.webDavUrl ?? '';
	if (!URL.canParse(webDavUrl) || !/^https?:\/\//.test(webDavUrl)) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid WebDAV URL in credentials: "${webDavUrl}". The URL must start with https:// or http://. Please check your Nextcloud credentials.`,
		);
	}

	const options: Omit<IRequestOptions, 'uri' | 'url' | 'baseURL'> = {
		headers,
		method,
		body,
		qs: query ?? {},
		json: false,
	};

	if (encoding === null) {
		options.encoding = null;
	}

	const requestOptions = {
		...options,
		uri: endpointUrl(webDavUrl, endpointMode, endpoint),
	};

	const response = await this.helpers.requestWithAuthentication.call(
		this,
		credentialType,
		requestOptions,
	);

	if (typeof response === 'string' && response.includes('<b>Fatal error</b>')) {
		throw new NodeOperationError(
			this.getNode(),
			"NextCloud responded with a 'Fatal error', check description for more details",
			{
				description: `Server response:\n${response}`,
			},
		);
	}

	return response;
}

async function fetchUserId(this: NextCloudContext): Promise<string> {
	const response: unknown = await nextCloudApiRequest.call(
		this,
		'GET',
		requestPath`ocs/v2.php/cloud/user`,
		'',
		{ 'OCS-APIRequest': true },
		undefined,
		{ format: 'json' },
		'ocs',
	);
	const body = typeof response === 'string' ? jsonParse(response, { fallbackValue: {} }) : {};
	const ocs = isRecord(body) ? body.ocs : undefined;
	const data = isRecord(ocs) ? ocs.data : undefined;
	const id = isRecord(data) ? data.id : undefined;
	if (typeof id !== 'string' || id === '') {
		throw new NodeOperationError(this.getNode(), 'Could not resolve the Nextcloud user ID', {
			description: 'Check that the WebDAV URL in the credential points to your Nextcloud server.',
		});
	}
	return id;
}

// One map per context, so a lookup goes away with the execution, picker request or poll trigger that made it
const userIdsByContext = new WeakMap<NextCloudContext, Map<string, Promise<string>>>();

/**
 * The uid in `remote.php/dav/files/<uid>`. The OAuth2 credential has no user, and the
 * Basic credential's user is a login name, which can differ from the uid.
 */
export async function nextCloudUserId(this: NextCloudContext): Promise<string> {
	const credentialType = nextCloudCredentialType.call(this);
	const { webDavUrl, user, oauthTokenData } = await this.getCredentials(credentialType);
	const token = isRecord(oauthTokenData) ? oauthTokenData.access_token : undefined;
	// The uid belongs to the signed-in account, so an edited credential needs a new lookup
	const key = JSON.stringify([credentialType, webDavUrl, user, token]);
	let cache = userIdsByContext.get(this);
	if (!cache) userIdsByContext.set(this, (cache = new Map()));
	let pending = cache.get(key);
	if (!pending) {
		pending = fetchUserId.call(this);
		cache.set(key, pending);
		// A failed lookup is not kept, so the next item asks Nextcloud again
		pending.catch(() => cache.delete(key));
	}
	return await pending;
}
