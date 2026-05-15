import FormData from 'form-data';
import {
	BINARY_ENCODING,
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type JsonObject,
	NodeApiError,
} from 'n8n-workflow';
import { Readable } from 'stream';

const RESUMABLE_UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;

/**
 * Reads a Readable stream and calls `onChunk` with fixed-size slices of the data.
 *
 * Incoming stream events are collected in an array and only concatenated when
 * enough bytes have accumulated to fill a chunk, avoiding O(n²) allocations
 * from concatenating on every stream event.
 *
 * The final call to `onChunk` may receive fewer bytes than `chunkSize` if the
 * total data length is not an exact multiple of `chunkSize`.
 *
 * @param stream    - Readable stream to consume.
 * @param chunkSize - Maximum number of bytes per chunk.
 * @param onChunk   - Called for each chunk with the chunk buffer and its byte offset in the stream.
 */
export async function processStreamInChunks(
	stream: Readable,
	chunkSize: number,
	onChunk: (chunk: Buffer, offset: number) => Promise<void>,
) {
	const accumulated: Buffer[] = [];
	let accumulatedLength = 0;
	let offset = 0;

	for await (const rawChunk of stream) {
		const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
		accumulated.push(chunk);
		accumulatedLength += chunk.length;

		while (accumulatedLength >= chunkSize) {
			const buffer = Buffer.concat(accumulated);
			accumulated.length = 0;

			await onChunk(buffer.subarray(0, chunkSize), offset);
			offset += chunkSize;

			const remaining = buffer.subarray(chunkSize);
			accumulatedLength = remaining.length;
			if (remaining.length > 0) {
				accumulated.push(remaining);
			}
		}
	}

	if (accumulatedLength > 0) {
		await onChunk(Buffer.concat(accumulated), offset);
	}
}

// Define these because we'll be using them in two separate places
const metagenerationFilters: INodeProperties[] = [
	{
		displayName: 'Generation',
		name: 'generation',
		type: 'number',
		placeholder: 'Select a specific revision of the chosen object',
		default: -1,
	},
	{
		displayName: 'Generation Match',
		name: 'ifGenerationMatch',
		type: 'number',
		placeholder: 'Make operation conditional of the object generation matching this value',
		default: -1,
	},
	{
		displayName: 'Generation Exclude',
		name: 'ifGenerationNotMatch',
		type: 'number',
		placeholder: 'Make operation conditional of the object generation not matching this value',
		default: -1,
	},
	{
		displayName: 'Metageneration Match',
		name: 'ifMetagenerationMatch',
		type: 'number',
		placeholder:
			"Make operation conditional of the object's current metageneration matching this value",
		default: -1,
	},
	{
		displayName: 'Metageneration Exclude',
		name: 'ifMetagenerationNotMatch',
		type: 'number',
		placeholder:
			"Make operation conditional of the object's current metageneration not matching this value",
		default: -1,
	},
];

const predefinedAclOptions: INodeProperties = {
	displayName: 'Predefined ACL',
	name: 'predefinedAcl',
	type: 'options',
	placeholder: 'Apply a predefined set of Access Controls to the object',
	default: 'authenticatedRead',
	options: [
		{
			name: 'Authenticated Read',
			value: 'authenticatedRead',
		},
		{
			name: 'Bucket Owner Full Control',
			value: 'bucketOwnerFullControl',
		},
		{
			name: 'Bucket Owner Read',
			value: 'bucketOwnerRead',
		},
		{
			name: 'Private',
			value: 'private',
		},
		{
			name: 'Project Private',
			value: 'projectPrivate',
		},
		{
			name: 'Public Read',
			value: 'publicRead',
		},
	],
};

export const objectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['object'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an object',
				routing: {
					request: {
						method: 'POST',
						baseURL: 'https://storage.googleapis.com/upload/storage/v1',
						url: '={{"/b/" + $parameter["bucketName"] + "/o/"}}',
						qs: {
							name: '={{$parameter["objectName"]}}',
							uploadType: 'multipart',
						},
						headers: {},
					},
					send: {
						preSend: [
							// Handle setup of Query and Headers
							async function (this, requestOptions) {
								// Merge in the options into the queryset and headers objects
								if (!requestOptions.qs) requestOptions.qs = {};
								if (!requestOptions.headers) requestOptions.headers = {};
								const options = this.getNodeParameter('createQuery') as IDataObject;
								const headers = this.getNodeParameter('encryptionHeaders') as IDataObject;
								requestOptions.qs = Object.assign(requestOptions.qs, options);
								requestOptions.headers = Object.assign(requestOptions.headers, headers);
								return requestOptions;
							},

							// Handle body creation
							async function (this, requestOptions) {
								// Populate metadata JSON
								let metadata: IDataObject = { name: this.getNodeParameter('objectName') as string };
								const bodyData = this.getNodeParameter('createData') as IDataObject;
								const useBinary = this.getNodeParameter('createFromBinary') as boolean;

								// Parse JSON body parameters
								if (bodyData.acl) {
									try {
										bodyData.acl = JSON.parse(bodyData.acl as string);
									} catch (error) {}
								}
								if (bodyData.metadata) {
									try {
										bodyData.metadata = JSON.parse(bodyData.metadata as string);
									} catch (error) {}
								}
								metadata = Object.assign(metadata, bodyData);

								// Populate request body
								const body = new FormData();
								body.append('metadata', JSON.stringify(metadata), {
									contentType: 'application/json',
								});

								// Determine content and content type
								let content: string | Buffer | Readable;
								let contentType: string;
								let contentLength: number;
								if (useBinary) {
									const binaryPropertyName = this.getNodeParameter(
										'createBinaryPropertyName',
									) as string;

									const binaryData = this.helpers.assertBinaryData(binaryPropertyName);
									if (binaryData.id) {
										const binaryMetadata = await this.helpers.getBinaryMetadata(binaryData.id);
										contentType = binaryMetadata.mimeType ?? 'application/octet-stream';
										contentLength = binaryMetadata.fileSize;
										content =
											Number.isFinite(contentLength) && contentLength === 0
												? Buffer.alloc(0)
												: await this.helpers.getBinaryStream(
														binaryData.id,
														RESUMABLE_UPLOAD_CHUNK_SIZE,
													);
									} else {
										content = Buffer.from(binaryData.data, BINARY_ENCODING);
										contentType = binaryData.mimeType;
										contentLength = content.length;
									}
								} else {
									content = this.getNodeParameter('createContent') as string;
									contentType = 'text/plain';
									contentLength = content.length;
								}

								if (content instanceof Readable) {
									const bucketName = this.getNodeParameter('bucketName') as string;
									const objectName = this.getNodeParameter('objectName') as string;
									const uploadHeaders: IDataObject = {
										...requestOptions.headers,
										'Content-Type': 'application/json',
										'X-Upload-Content-Type': contentType,
									};

									if (Number.isFinite(contentLength)) {
										uploadHeaders['X-Upload-Content-Length'] = contentLength;
									}

									const uploadSessionResponse =
										await this.helpers.httpRequestWithAuthentication.call(
											this,
											'googleCloudStorageOAuth2Api',
											{
												method: 'POST',
												url: `/b/${bucketName}/o/`,
												baseURL: 'https://storage.googleapis.com/upload/storage/v1',
												qs: {
													...requestOptions.qs,
													uploadType: 'resumable',
												},
												headers: uploadHeaders,
												body: metadata,
												// Required so the IDataObject body is serialized as JSON.
												// Without this, httpRequestWithAuthentication passes the object as-is
												// and the GCS session initiation receives a malformed body.
												json: true,
												returnFullResponse: true,
											},
										);

									const uploadUrl = uploadSessionResponse.headers.location as string | undefined;
									if (!uploadUrl) {
										throw new NodeApiError(
											this.getNode(),
											uploadSessionResponse.body as JsonObject,
										);
									}

									const uploadChunk = async (
										chunk: Buffer,
										offset: number,
										totalSize: number | '*',
									) => {
										const response = await this.helpers.httpRequest({
											method: 'PUT',
											url: uploadUrl,
											headers: {
												...requestOptions.headers,
												'Content-Length': chunk.length,
												'Content-Range': `bytes ${offset}-${offset + chunk.length - 1}/${totalSize}`,
											},
											body: chunk,
											returnFullResponse: true,
											ignoreHttpStatusErrors: true,
										});

										if (response.statusCode !== 308 && response.statusCode >= 400) {
											throw new NodeApiError(this.getNode(), response.body as JsonObject);
										}
									};

									if (Number.isFinite(contentLength)) {
										await processStreamInChunks(
											content,
											RESUMABLE_UPLOAD_CHUNK_SIZE,
											async (chunk, offset) => await uploadChunk(chunk, offset, contentLength),
										);
									} else {
										let pendingChunk: Buffer | undefined;
										let pendingOffset = 0;

										await processStreamInChunks(
											content,
											RESUMABLE_UPLOAD_CHUNK_SIZE,
											async (chunk, currentOffset) => {
												if (pendingChunk) {
													await uploadChunk(pendingChunk, pendingOffset, '*');
												}
												pendingChunk = chunk;
												pendingOffset = currentOffset;
											},
										);

										if (pendingChunk) {
											await uploadChunk(
												pendingChunk,
												pendingOffset,
												pendingOffset + pendingChunk.length,
											);
										}
									}

									const projection = requestOptions.qs?.projection;

									requestOptions.method = 'GET';
									requestOptions.baseURL = 'https://storage.googleapis.com/storage/v1';
									// GCS requires object names to be percent-encoded in the URL path.
									// Without this, names containing '/', spaces, or '#' produce a 404.
									requestOptions.url = `/b/${bucketName}/o/${encodeURIComponent(objectName)}`;
									requestOptions.qs = projection ? { projection } : {};
									requestOptions.headers = this.getNodeParameter(
										'encryptionHeaders',
									) as IDataObject;
									delete requestOptions.body;

									return requestOptions;
								}

								body.append('file', content, { contentType, knownLength: contentLength });

								// Set the headers
								if (!requestOptions.headers) requestOptions.headers = {};
								requestOptions.headers['Content-Length'] = body.getLengthSync();
								requestOptions.headers['Content-Type'] =
									`multipart/related; boundary=${body.getBoundary()}`;

								// Return the request data
								requestOptions.body = body;
								return requestOptions;
							},
						],
					},
				},
				action: 'Create an object',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an object',
				routing: {
					request: {
						method: 'DELETE',
						url: '={{"/b/" + $parameter["bucketName"] + "/o/" + encodeURIComponent($parameter["objectName"])}}',
						qs: {},
					},
				},
				action: 'Delete an object from a bucket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get object data or metadata',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/b/" + $parameter["bucketName"] + "/o/" + encodeURIComponent($parameter["objectName"])}}',
						returnFullResponse: true,
						qs: {
							alt: '={{$parameter["alt"]}}',
						},
					},
					send: {
						preSend: [
							async function (this, requestOptions) {
								if (!requestOptions.qs) requestOptions.qs = {};
								if (!requestOptions.headers) requestOptions.headers = {};
								const options = this.getNodeParameter('getParameters') as IDataObject;
								const headers = this.getNodeParameter('encryptionHeaders') as IDataObject;
								const datatype = this.getNodeParameter('alt') as string;

								if (datatype === 'media') {
									requestOptions.encoding = 'arraybuffer';
								}

								// Merge in the options into the queryset and headers objects
								requestOptions.qs = Object.assign(requestOptions.qs, options);
								requestOptions.headers = Object.assign(requestOptions.headers, headers);

								// Return the request data
								return requestOptions;
							},
						],
					},
					output: {
						postReceive: [
							async function (this, items, responseData) {
								// If the request was for object data as opposed to metadata, change the json to binary field in the response
								const datatype = this.getNodeParameter('alt') as string;

								if (datatype === 'media') {
									// Adapt the binaryProperty part of Routing Node since it's conditional
									const destinationName = this.getNodeParameter('binaryPropertyName') as string;
									const fileName = this.getNodeParameter('objectName') as string;
									const binaryData = await this.helpers.prepareBinaryData(
										responseData.body as Buffer,
										fileName,
									);

									// Transform items
									items = items.map((item) => {
										item.json = {};
										item.binary = { [destinationName]: binaryData };
										return item;
									});
								}
								return items;
							},
						],
					},
				},
				action: 'Get object data or metadata',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of objects',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/b/" + $parameter["bucketName"] + "/o/"}}',
						returnFullResponse: true,
						qs: {},
					},
					send: {
						preSend: [
							async function (this, requestOptions) {
								if (!requestOptions.qs) requestOptions.qs = {};
								const options = this.getNodeParameter('listFilters') as IDataObject;

								// Merge in the options into the queryset
								requestOptions.qs = Object.assign(requestOptions.qs, options);

								// Check if we send a limit
								const returnAll = this.getNodeParameter('returnAll') as boolean;
								if (!returnAll) requestOptions.qs.maxResults = this.getNodeParameter('maxResults');

								// Return the request data
								return requestOptions;
							},
						],
						paginate: true,
					},
					operations: {
						async pagination(this, requestOptions) {
							if (!requestOptions.options.qs) requestOptions.options.qs = {};
							let executions: INodeExecutionData[] = [];
							let responseData: INodeExecutionData[];
							let nextPageToken: string | undefined = undefined;
							const returnAll = this.getNodeParameter('returnAll') as boolean;

							const extractBucketsList = (page: INodeExecutionData) => {
								const objects = page.json.items as IDataObject[];
								if (objects) {
									executions = executions.concat(objects.map((object) => ({ json: object })));
								}
							};

							do {
								requestOptions.options.qs.pageToken = nextPageToken;
								responseData = await this.makeRoutingRequest(requestOptions);

								// Check for another page
								const lastItem = responseData[responseData.length - 1].json;
								nextPageToken = lastItem.nextPageToken as string | undefined;

								// Extract just the list of buckets from the page data
								responseData.forEach(extractBucketsList);
							} while (returnAll && nextPageToken);

							// Return all execution responses as an array
							return executions;
						},
					},
				},
				action: 'Get a list of objects',
			},
			{
				name: 'Update',
				value: 'update',
				description: "Update an object's metadata",
				routing: {
					request: {
						method: 'PATCH',
						url: '={{"/b/" + $parameter["bucketName"] + "/o/" + encodeURIComponent($parameter["objectName"])}}',
						qs: {},
						body: {},
					},
					send: {
						preSend: [
							async function (this, requestOptions) {
								if (!requestOptions.qs) requestOptions.qs = {};
								if (!requestOptions.headers) requestOptions.headers = {};
								if (!requestOptions.body) requestOptions.body = {};
								const options = this.getNodeParameter('metagenAndAclQuery') as IDataObject;
								const headers = this.getNodeParameter('encryptionHeaders') as IDataObject;
								const body = this.getNodeParameter('updateData') as IDataObject;

								// Parse JSON body parameters
								if (body.acl) {
									try {
										body.acl = JSON.parse(body.acl as string);
									} catch (error) {}
								}
								if (body.metadata) {
									try {
										body.metadata = JSON.parse(body.metadata as string);
									} catch (error) {}
								}

								// Merge in the options into the queryset and headers objects
								requestOptions.qs = Object.assign(requestOptions.qs, options);
								requestOptions.headers = Object.assign(requestOptions.headers, headers);
								requestOptions.body = Object.assign(requestOptions.body, body);

								// Return the request data
								return requestOptions;
							},
						],
					},
				},
				action: "Update an object's metadata",
			},
		],
		default: 'getAll',
	},
];

export const objectFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		placeholder: 'Bucket Name',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
			},
		},
		default: '',
	},
	{
		displayName: 'Object Name',
		name: 'objectName',
		type: 'string',
		placeholder: 'Object Name',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['create', 'delete', 'get', 'update'],
			},
		},
		default: '',
	},
	{
		displayName: 'Projection',
		name: 'projection',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'All Properties',
				value: 'full',
			},
			{
				name: 'No ACL',
				value: 'noAcl',
			},
		],
		default: 'noAcl',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['get', 'getAll'],
			},
		},
		routing: {
			request: {
				qs: {
					projection: '={{$value}}',
				},
			},
		},
	},
	// Create / Update gets their own definition because the default value is swapped
	{
		displayName: 'Projection',
		name: 'updateProjection',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'All Properties',
				value: 'full',
			},
			{
				name: 'No ACL',
				value: 'noAcl',
			},
		],
		default: 'full',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			request: {
				qs: {
					projection: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Return Data',
		name: 'alt',
		type: 'options',
		placeholder: 'The type of data to return from the request',
		default: 'json',
		options: [
			{
				name: 'Metadata',
				value: 'json',
			},
			{
				name: 'Object Data',
				value: 'media',
			},
		],
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Use Input Binary Field',
		name: 'createFromBinary',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['create'],
			},
		},
		default: true,
		noDataExpression: true,
		description: 'Whether the data for creating a file should come from a binary field',
	},
	{
		displayName: 'Input Binary Field',
		name: 'createBinaryPropertyName',
		type: 'string',
		hint: 'The name of the input binary field containing the file to be written',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['create'],
				createFromBinary: [true],
			},
		},
		default: 'data',
	},
	{
		displayName: 'File Content',
		name: 'createContent',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['create'],
				createFromBinary: [false],
			},
		},
		default: '',
		description: 'Content of the file to be uploaded',
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		hint: 'The name of the output binary field to put the file in',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['get'],
				alt: ['media'],
			},
		},
		default: 'data',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Create Fields',
		name: 'createData',
		type: 'collection',
		placeholder: 'Add Create Body Field',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Access Control List',
				name: 'acl',
				type: 'json',
				default: '[]',
			},
			{
				displayName: 'Cache Control',
				name: 'cacheControl',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Content Disposition',
				name: 'contentDisposition',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Content Encoding',
				name: 'contentEncoding',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Content Language',
				name: 'contentLanguage',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'string',
				default: '',
			},
			{
				displayName: 'CRC32c Checksum',
				name: 'crc32c',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Time',
				name: 'customTime',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Event Based Hold',
				name: 'eventBasedHold',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'MD5 Hash',
				name: 'md5Hash',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
			},
			{
				displayName: 'Storage Class',
				name: 'storageClass',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Temporary Hold',
				name: 'temporaryHold',
				type: 'boolean',
				default: false,
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateData',
		type: 'collection',
		placeholder: 'Add Update Body Field',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['update'],
			},
		},
		default: {
			acl: '[]',
		},
		options: [
			{
				displayName: 'Access Control',
				name: 'acl',
				type: 'json',
				default: '[]',
			},
			{
				displayName: 'Cache Control',
				name: 'cacheControl',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Content Disposition',
				name: 'contentDisposition',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Content Encoding',
				name: 'contentEncoding',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Content Language',
				name: 'contentLanguage',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Time',
				name: 'customTime',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Event Based Hold',
				name: 'eventBasedHold',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
			},
			{
				displayName: 'Temporary Hold',
				name: 'temporaryHold',
				type: 'boolean',
				default: false,
			},
		],
	},
	{
		displayName: 'Additional Parameters',
		name: 'createQuery',
		type: 'collection',
		placeholder: 'Add Additional Parameters',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Content Encoding',
				name: 'contentEncoding',
				type: 'string',
				default: '',
			},
			...metagenerationFilters,
			{
				displayName: 'KMS Key Name',
				name: 'kmsKeyName',
				type: 'string',
				default: '',
			},
			predefinedAclOptions,
		],
	},
	{
		displayName: 'Additional Parameters',
		name: 'getParameters',
		type: 'collection',
		placeholder: 'Add Additional Parameters',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['delete', 'get'],
			},
		},
		default: {},
		options: [...metagenerationFilters],
	},
	{
		displayName: 'Additional Parameters',
		name: 'metagenAndAclQuery',
		type: 'collection',
		placeholder: 'Add Additional Parameters',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['update'],
			},
		},
		default: {},
		options: [...metagenerationFilters, predefinedAclOptions],
	},
	{
		displayName: 'Encryption Headers',
		name: 'encryptionHeaders',
		type: 'collection',
		placeholder: 'Add Encryption Headers',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['create', 'get', 'update'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Encryption Algorithm',
				name: 'X-Goog-Encryption-Algorithm',
				type: 'options',
				placeholder:
					'The encryption algorithm to use, which must be AES256. Use to supply your own key in the request',
				default: 'AES256',
				options: [
					{
						name: 'AES256',
						value: 'AES256',
					},
				],
			},
			{
				displayName: 'Encryption Key',
				name: 'X-Goog-Encryption-Key',
				type: 'string',
				placeholder: 'Base64 encoded string of your AES256 encryption key',
				default: '',
			},
			{
				displayName: 'Encryption Key Hash',
				name: 'X-Goog-Encryption-Key-Sha256',
				type: 'string',
				placeholder: 'Base64 encoded string of the SHA256 hash of your encryption key',
				default: '',
			},
		],
	},
	{
		displayName: 'Additional Parameters',
		name: 'listFilters',
		type: 'collection',
		placeholder: 'Add Additional Parameters',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Delimiter',
				name: 'delimiter',
				type: 'string',
				placeholder: 'Returns results in directory-like mode, using this value as the delimiter',
				default: '/',
			},
			{
				displayName: 'End Offset',
				name: 'endOffset',
				type: 'string',
				placeholder: 'Filter results to names lexicographically before this value',
				default: '',
			},
			{
				displayName: 'Include Trailing Delimiter',
				name: 'includeTrailingDelimiter',
				type: 'boolean',
				placeholder:
					'If true, objects will appear with exactly one instance of delimiter at the end of the name',
				default: false,
			},
			{
				displayName: 'Prefix',
				name: 'prefix',
				type: 'string',
				placeholder: 'Filter results to names that start with this value',
				default: '',
			},
			{
				displayName: 'Start Offset',
				name: 'startOffset',
				type: 'string',
				placeholder: 'Filter results to names lexicographically equal or after this value',
				default: '',
			},
			{
				displayName: 'Versions',
				name: 'versions',
				type: 'boolean',
				placeholder: 'If true, list all versions of objects as distinct entries',
				default: false,
			},
		],
	},
];
