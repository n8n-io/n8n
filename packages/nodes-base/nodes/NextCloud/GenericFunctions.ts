import { isRecord } from '@n8n/utils/is-record';
import {
	NodeOperationError,
	decodePathValue,
	requestPath,
	requestUrl,
	sanitizeXmlName,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestMethods,
	type IRequestOptions,
	type IDataObject,
	type RequestPath,
} from 'n8n-workflow';
import { parseStringPromise } from 'xml2js';

export function webDavPath(path: string): RequestPath {
	return path
		.split('/')
		.reduce(
			(parent, segment) =>
				segment === '' ? requestPath`${parent}/` : requestPath`${parent}/${segment}`,
			requestPath``,
		);
}

const WEBDAV_ROOT = /^.*?\/remote\.php\/(?:webdav|dav\/files\/[^/]+)\//;

export async function parseFolderList(xml: string): Promise<IDataObject[]> {
	const data: unknown = await parseStringPromise(xml, {
		explicitArray: false,
		tagNameProcessors: [sanitizeXmlName],
		attrNameProcessors: [sanitizeXmlName],
	});

	const propNames: Record<string, string> = {
		'd:getlastmodified': 'lastModified',
		'd:getcontentlength': 'contentLength',
		'd:getcontenttype': 'contentType',
	};

	const multistatus = isRecord(data) ? data['d:multistatus'] : undefined;
	const responses: unknown[] = isRecord(multistatus) ? [multistatus['d:response']].flat() : [];

	// The first response is the listed folder itself.
	return responses
		.slice(1)
		.filter(isRecord)
		.map((response): IDataObject => {
			const propstat = [response['d:propstat']].flat()[0];
			const prop = isRecord(propstat) ? propstat['d:prop'] : undefined;
			const props: Record<string, unknown> = isRecord(prop) ? prop : {};
			const eTag = props['d:getetag'];

			return {
				// Nextcloud never encodes "/" in an href, so decoding the full path adds no separator.
				path: decodePathValue(String(response['d:href']).replace(WEBDAV_ROOT, '')),
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

/**
 * Make an API request to NextCloud
 *
 */
export async function nextCloudApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: object | string | Buffer,
	headers?: IDataObject,
	encoding?: null,
	query?: IDataObject,
	useWebDavEndpoint: boolean = true,
) {
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	let credentials;

	if (authenticationMethod === 'accessToken') {
		credentials = await this.getCredentials<{ webDavUrl: string }>('nextCloudApi');
	} else {
		credentials = await this.getCredentials<{ webDavUrl: string }>('nextCloudOAuth2Api');
	}

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

	// For non-WebDAV requests, strip the WebDAV suffix while preserving any subpath prefix.
	const requestOptions = {
		...options,
		uri: useWebDavEndpoint
			? requestUrl`${webDavUrl}${endpoint}`
			: requestUrl`${webDavUrl.replace(/\/remote\.php\/webdav\/?$/, '')}/${endpoint}`,
	};

	const credentialType =
		authenticationMethod === 'accessToken' ? 'nextCloudApi' : 'nextCloudOAuth2Api';

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
