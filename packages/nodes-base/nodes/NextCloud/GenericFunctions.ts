import { isRecord } from '@n8n/utils/is-record';
import { escapeXmlText } from '@n8n/utils/string/escape-xml';
import {
	NodeOperationError,
	decodePathValue,
	jsonParse,
	requestPath,
	requestUrl,
	sanitizeXmlName,
	toPathSegment,
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

export const RESOURCETYPE_PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:resourcetype/></d:prop>
</d:propfind>`;

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

// A prop that the request did not ask for is missing from the response, so its key is left out
const ITEM_PROPS: Record<string, string> = {
	'oc:fileid': 'fileId',
	'd:getlastmodified': 'lastModified',
	'd:getcontentlength': 'contentLength',
	'd:getcontenttype': 'contentType',
};

const ITEM_PROP_TAGS = [...Object.keys(ITEM_PROPS), 'nc:upload_time', 'd:getetag', 'd:resourcetype']
	.map((prop) => `<${prop}/>`)
	.join('');

/** Asks for every prop that `toWebDavItem` reads. */
export const ITEM_PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>${ITEM_PROP_TAGS}</d:prop>
</d:propfind>`;

/** A file or folder from a multistatus response, with its path relative to the user's root. */
export function toWebDavItem(response: Record<string, unknown>): IDataObject {
	const props = readProps(response);
	const eTag = props['d:getetag'];
	const uploadTime = props['nc:upload_time'];

	return {
		// Nextcloud never encodes "/" in an href, so decoding the full path adds no separator.
		path: outputPath(decodePathValue(String(response['d:href']).replace(WEBDAV_HREF_PREFIX, ''))),
		...Object.fromEntries(
			Object.entries(ITEM_PROPS)
				.filter(([propName]) => typeof props[propName] === 'string')
				.map(([propName, key]): [string, string] => [key, String(props[propName])]),
		),
		// Nextcloud sends unix seconds, or 0 when it does not know the time. The format of
		// lastModified lets a date filter read it back.
		...(Number(uploadTime) > 0
			? { uploadTime: new Date(Number(uploadTime) * 1000).toUTCString() }
			: {}),
		type: props['d:resourcetype'] === '' ? 'file' : 'folder',
		eTag: typeof eTag === 'string' ? eTag.slice(1, -1) : undefined,
	};
}

export async function parseFolderList(xml: string): Promise<IDataObject[]> {
	// The first response is the listed folder itself.
	return (await readMultistatus(xml)).slice(1).map(toWebDavItem);
}

export function nextCloudRootUrl(webDavUrl: string): string {
	return webDavUrl.replace(WEBDAV_URL_SUFFIX, '');
}

export function nextCloudCredentialType(this: NextCloudContext) {
	return this.getNodeParameter('authentication', 0) === 'accessToken'
		? 'nextCloudApi'
		: 'nextCloudOAuth2Api';
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

	const root = nextCloudRootUrl(webDavUrl);
	const requestOptions = {
		...options,
		uri:
			endpointMode === 'webdav'
				? requestUrl`${webDavUrl}${endpoint}`
				: endpointMode === 'dav'
					? requestUrl`${root}/remote.php/dav/${endpoint}`
					: requestUrl`${root}/${endpoint}`,
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

export function searchCondition(
	operator: 'eq' | 'like' | 'gt' | 'lt',
	prop: string,
	literal: string | number,
) {
	return `<d:${operator}><d:prop><${prop}/></d:prop><d:literal>${escapeXmlText(String(literal))}</d:literal></d:${operator}>`;
}

/**
 * Runs a WebDAV SEARCH in the user's folder at `folderSegments`, newest first. Nextcloud ignores
 * the depth, so the search always includes the subfolders.
 */
export async function searchFiles(
	this: NextCloudContext,
	folderSegments: string[],
	where: string,
	limit?: number,
): Promise<IDataObject[]> {
	// Nextcloud reads a relative scope href as it is and never decodes it (SearchDAV
	// PathHelper::getPathFromUri), so the names stay raw. toPathSegment only rejects "." and "..".
	const scope = [await nextCloudUserId.call(this), ...folderSegments].map((segment) =>
		decodePathValue(toPathSegment(segment)),
	);
	const nresults =
		limit === undefined ? '' : `<d:limit><d:nresults>${limit}</d:nresults></d:limit>`;
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:searchrequest xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:basicsearch>
    <d:select>
      <d:prop>${ITEM_PROP_TAGS}</d:prop>
    </d:select>
    <d:from>
      <d:scope>
        <d:href>${escapeXmlText(['', 'files', ...scope].join('/'))}</d:href>
        <d:depth>infinity</d:depth>
      </d:scope>
    </d:from>
    <d:where>${where}</d:where>
    <d:orderby>
      <d:order><d:prop><d:getlastmodified/></d:prop><d:descending/></d:order>
    </d:orderby>
    ${nresults}
  </d:basicsearch>
</d:searchrequest>`;

	const response = await nextCloudApiRequest.call(
		this,
		'SEARCH',
		requestPath``,
		body,
		{ 'Content-Type': 'application/xml' },
		undefined,
		undefined,
		'dav',
	);
	return (await readMultistatus(response)).map(toWebDavItem);
}
