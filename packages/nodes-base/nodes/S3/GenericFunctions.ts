import type { Request } from 'aws4';
import { sign } from 'aws4';
import get from 'lodash/get';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { URL } from 'url';
import { parseString, Builder } from 'xml2js';
import { createHash } from 'crypto';

function queryToString(params: IDataObject) {
	return Object.keys(params)
		.map((key) => key + '=' + (params[key] as string))
		.join('&');
}

export async function s3ApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	bucket: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string | Buffer,
	query: IDataObject = {},
	headers?: object,
	option: IDataObject = {},
	region?: string,
): Promise<any> {
	const credentials = await this.getCredentials('s3');

	if (!(credentials.endpoint as string).startsWith('http')) {
		throw new NodeOperationError(
			this.getNode(),
			'HTTP(S) Scheme is required in endpoint definition',
		);
	}

	const endpoint = new URL(credentials.endpoint as string);

	if (bucket) {
		if (credentials.forcePathStyle) {
			path = `/${bucket}${path}`;
		} else {
			endpoint.host = `${bucket}.${endpoint.host}`;
		}
	}

	endpoint.pathname = `${endpoint.pathname === '/' ? '' : endpoint.pathname}${path}`;

	// Sign AWS API request with the user credentials
	const signOpts = {
		headers: headers || {},
		region: region || credentials.region,
		host: endpoint.host,
		method,
		path: `${endpoint.pathname}?${queryToString(query).replace(/\+/g, '%2B')}`,
		service: 's3',
		body,
	} as Request;

	const securityHeaders = {
		accessKeyId: `${credentials.accessKeyId}`.trim(),
		secretAccessKey: `${credentials.secretAccessKey}`.trim(),
		sessionToken: credentials.temporaryCredentials
			? `${credentials.sessionToken}`.trim()
			: undefined,
	};

	sign(signOpts, securityHeaders);

	const options: IRequestOptions = {
		headers: signOpts.headers,
		method,
		qs: query,
		uri: endpoint.toString(),
		body: signOpts.body,
		rejectUnauthorized: !credentials.ignoreSSLIssues as boolean,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function s3ApiRequestREST(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	bucket: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string,
	query: IDataObject = {},
	headers?: object,
	options: IDataObject = {},
	region?: string,
): Promise<any> {
	const response = await s3ApiRequest.call(
		this,
		bucket,
		method,
		path,
		body,
		query,
		headers,
		options,
		region,
	);
	try {
		return JSON.parse(response as string);
	} catch (error) {
		return response;
	}
}

export async function s3ApiRequestSOAP(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	bucket: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string | Buffer,
	query: IDataObject = {},
	headers?: object,
	option: IDataObject = {},
	region?: string,
): Promise<any> {
	const response = await s3ApiRequest.call(
		this,
		bucket,
		method,
		path,
		body,
		query,
		headers,
		option,
		region,
	);
	try {
		return await new Promise((resolve, reject) => {
			parseString(response as string, { explicitArray: false }, (err, data) => {
				if (err) {
					return reject(err);
				}
				resolve(data);
			});
		});
	} catch (error) {
		return error;
	}
}

export async function s3ApiRequestSOAPAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	propertyName: string,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string,
	query: IDataObject = {},
	headers: IDataObject = {},
	option: IDataObject = {},
	region?: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await s3ApiRequestSOAP.call(
			this,
			service,
			method,
			path,
			body,
			query,
			headers,
			option,
			region,
		);

		//https://forums.aws.amazon.com/thread.jspa?threadID=55746
		if (get(responseData, [propertyName.split('.')[0], 'NextContinuationToken'])) {
			query['continuation-token'] = get(responseData, [
				propertyName.split('.')[0],
				'NextContinuationToken',
			]);
		}
		if (get(responseData, propertyName)) {
			if (Array.isArray(get(responseData, propertyName))) {
				returnData.push.apply(returnData, get(responseData, propertyName) as IDataObject[]);
			} else {
				returnData.push(get(responseData, propertyName) as IDataObject);
			}
		}
		const limit = query.limit as number | undefined;
		if (limit && limit <= returnData.length) {
			return returnData;
		}
	} while (
		get(responseData, [propertyName.split('.')[0], 'IsTruncated']) !== undefined &&
		get(responseData, [propertyName.split('.')[0], 'IsTruncated']) !== 'false'
	);

	return returnData;
}

export async function s3CreateMultipartUpload(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	bucket: string,
	key: string,
	headers?: IDataObject,
	region?: string,
): Promise<string> {
	const responseData = await s3ApiRequestSOAP.call(
		this,
		bucket,
		'POST',
		`/${key}`, // Object key
		undefined, // body
		{ uploads: '' }, // query for multipart upload initiation
		headers,
		{}, // option
		region,
	);

	if (
		!responseData ||
		!responseData.InitiateMultipartUploadResult ||
		!responseData.InitiateMultipartUploadResult.UploadId
	) {
		throw new NodeOperationError(
			this.getNode(),
			'Invalid response from S3 for CreateMultipartUpload: UploadId missing',
			{
				description: `S3 response: ${JSON.stringify(responseData)}`,
			},
		);
	}

	return responseData.InitiateMultipartUploadResult.UploadId;
}

export async function s3UploadPart(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	bucket: string,
	key: string,
	uploadId: string,
	partNumber: number,
	chunk: Buffer,
	headers?: IDataObject,
	region?: string,
): Promise<string> {
	const contentLength = chunk.length;
	const contentMd5 = createHash('md5').update(chunk).digest('base64');

	const requestHeaders = {
		...headers,
		'Content-Length': contentLength,
		'Content-MD5': contentMd5,
	};

	// s3ApiRequest returns the body by default
	// We need the full response to access headers for ETag
	const response = await s3ApiRequest.call(
		this,
		bucket,
		'PUT',
		`/${key}`,
		chunk,
		{ partNumber, uploadId },
		requestHeaders,
		{ resolveWithFullResponse: true }, // Get full response for headers
		region,
	);

	if (!response.headers || !response.headers.etag) {
		throw new NodeOperationError(
			this.getNode(),
			'Invalid response from S3 for UploadPart: ETag missing from headers',
			{
				description: `S3 response headers: ${JSON.stringify(response.headers)}`,
			},
		);
	}

	// ETag is returned with quotes, e.g., "\"d41d8cd98f00b204e9800998ecf8427e\""
	// These quotes need to be removed.
	return response.headers.etag.replace(/"/g, '');
}

export interface S3UploadPartData {
	PartNumber: number;
	ETag: string;
}

export async function s3CompleteMultipartUpload(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	bucket: string,
	key: string,
	uploadId: string,
	parts: S3UploadPartData[],
	headers?: IDataObject,
	region?: string,
): Promise<any> {
	const xmlParts = parts.map((part) => ({
		Part: {
			PartNumber: part.PartNumber,
			ETag: part.ETag, // ETags from S3 UploadPart already include quotes
		},
	}));

	const xmlObject = {
		CompleteMultipartUpload: {
			Part: xmlParts.map(p => p.Part), // xml2js builder expects an array of Part objects directly
		},
	};

	// Using renderOpts to ensure compact XML for accurate Content-MD5
	const builder = new Builder({ renderOpts: { pretty: false, indent: '', newline: '' } });
	const xmlBody = builder.buildObject(xmlObject);

	const contentMd5 = createHash('md5').update(xmlBody).digest('base64');

	const requestHeaders = {
		...headers,
		'Content-Type': 'application/xml',
		'Content-MD5': contentMd5,
	};

	return s3ApiRequestSOAP.call(
		this,
		bucket,
		'POST',
		`/${key}`,
		xmlBody,
		{ uploadId },
		requestHeaders,
		{}, // option
		region,
	);
}

export async function s3AbortMultipartUpload(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	bucket: string,
	key: string,
	uploadId: string,
	headers?: IDataObject,
	region?: string,
): Promise<any> {
	return s3ApiRequestSOAP.call(
		this,
		bucket,
		'DELETE',
		`/${key}`,
		undefined, // body
		{ uploadId },
		headers,
		{}, // option
		region,
	);
}
