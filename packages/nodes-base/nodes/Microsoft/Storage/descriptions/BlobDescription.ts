import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeParameterResourceLocator,
	INodeProperties,
} from 'n8n-workflow';

import {
	handleErrorPostReceive,
	HeaderConstants,
	parseBlobList,
	parseHeaders,
	XMsVersion,
} from '../GenericFunctions';

export const blobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['blob'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new blob or replace an existing one',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'PUT',
						url: '=/{{ $parameter["container"] }}/{{ $parameter["blobCreate"] }}',
						headers: {
							[HeaderConstants.X_MS_DATE]: '={{ new Date().toUTCString() }}',
							[HeaderConstants.X_MS_VERSION]: XMsVersion,
						},
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							async function (
								this: IExecuteSingleFunctions,
								_data: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								return [
									{
										json: parseHeaders(response.headers),
									},
								];
							},
						],
					},
				},
				action: 'Create blob',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a blob',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'DELETE',
						url: '=/{{ $parameter["container"] }}/{{ $parameter["blob"] }}',
						headers: {
							[HeaderConstants.X_MS_DATE]: '={{ new Date().toUTCString() }}',
							[HeaderConstants.X_MS_VERSION]: XMsVersion,
						},
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							async function (
								this: IExecuteSingleFunctions,
								_data: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								return [
									{
										json: parseHeaders(response.headers),
									},
								];
							},
						],
					},
				},
				action: 'Delete blob',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve data for a specific blob',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '=/{{ $parameter["container"] }}/{{ $parameter["blob"] }}',
						headers: {
							[HeaderConstants.X_MS_DATE]: '={{ new Date().toUTCString() }}',
							[HeaderConstants.X_MS_VERSION]: XMsVersion,
						},
						encoding: 'arraybuffer',
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							async function (
								this: IExecuteSingleFunctions,
								_data: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								const headerData = parseHeaders(response.headers);
								const simplify = this.getNodeParameter('options.simplify', true) as boolean;
								if (simplify) {
									delete headerData.acceptRanges;
									delete headerData.server;
									delete headerData.requestId;
									delete headerData.version;
									delete headerData.date;
									delete headerData.connection;
								}

								const { metadata, ...properties } = headerData;

								const newItem: INodeExecutionData = {
									json: {
										name: (this.getNodeParameter('blob') as INodeParameterResourceLocator).value,
										properties,
										...(metadata ? { metadata: metadata as IDataObject } : {}),
									},
									binary: {},
								};

								let fileName: string | undefined;
								if (headerData.contentDisposition) {
									let fileNameMatch =
										/filename\*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/g.exec(
											headerData.contentDisposition as string,
										);
									fileName =
										fileNameMatch && fileNameMatch.length > 1
											? fileNameMatch[3] || fileNameMatch[2]
											: undefined;
									if (fileName) {
										fileName = decodeURIComponent(fileName);
									} else {
										fileNameMatch = /filename="?([^"]*?)"?(;|$)/g.exec(
											headerData.contentDisposition as string,
										);
										fileName =
											fileNameMatch && fileNameMatch.length > 1 ? fileNameMatch[1] : undefined;
									}
								}

								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								newItem.binary!.data = await this.helpers.prepareBinaryData(
									response.body as Buffer,
									fileName,
									headerData.contentType as string,
								);

								return [newItem];
							},
						],
					},
				},
				action: 'Get blob',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of blobs',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						qs: {
							restype: 'container',
							comp: 'list',
						},
						url: '=/{{ $parameter["container"] }}',
						headers: {
							[HeaderConstants.X_MS_DATE]: '={{ new Date().toUTCString() }}',
							[HeaderConstants.X_MS_VERSION]: XMsVersion,
						},
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							async function (
								this: IExecuteSingleFunctions,
								data: INodeExecutionData[],
								_response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								const bodyData = await parseBlobList(data[0].json as unknown as string);
								if (this.getNodeParameter('options.simplify', true)) {
									for (const blob of bodyData.blobs) {
										const properties = blob.properties as IDataObject;
										if (!properties.cacheControl) delete properties.cacheControl;
										if (!properties.contentCRC64) delete properties.contentCRC64;
										if (!properties.contentEncoding) delete properties.contentEncoding;
										if (!properties.contentLanguage) delete properties.contentLanguage;
										if (!properties.contentDisposition) delete properties.contentDisposition;
										delete properties.accessTier;
										delete properties.accessTierChangeTime;
										delete properties.accessTierInferred;
									}
								}
								return [
									{
										json: bodyData,
									},
								];
							},
						],
					},
				},
				action: 'Get many blobs',
			},
		],
		default: 'getAll',
	},
];

const createFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Container to create or replace a blob in',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				placeholder: 'e.g. mycontainer',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Blob Name',
		name: 'blobCreate',
		default: '',
		description: 'The name of the new or existing blob',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
			},
		},
		placeholder: 'e.g. myblob',
		required: true,
		type: 'string',
		validateType: 'string',
	},
	{
		displayName: 'From',
		name: 'from',
		default: 'binary',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Binary',
				value: 'binary',
			},
			{
				name: 'URL',
				value: 'url',
			},
		],
		required: true,
		type: 'options',
	},
	{
		displayName: 'Binary Contents',
		name: 'binaryPropertyName',
		default: 'data',
		description: 'The name of the input binary field containing the file to be written',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
				from: ['binary'],
			},
		},
		required: true,
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName') as string;

						const binaryData = this.helpers.assertBinaryData(binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(binaryPropertyName);

						requestOptions.headers ??= {};
						requestOptions.headers[HeaderConstants.CONTENT_LENGTH] = binaryDataBuffer.length;
						requestOptions.headers[HeaderConstants.X_MS_BLOB_TYPE] = 'BlockBlob';
						if (binaryData.mimeType) {
							requestOptions.headers[HeaderConstants.CONTENT_TYPE] = binaryData.mimeType;
						}
						if (binaryData.fileName) {
							requestOptions.headers[HeaderConstants.X_MS_BLOB_CONTENT_DISPOSITION] =
								`attachment; filename="${binaryData.fileName}"`;
						}

						requestOptions.body = binaryDataBuffer;

						return requestOptions;
					},
				],
			},
		},
		type: 'string',
	},
	{
		displayName: 'URL',
		name: 'url',
		default: '',
		description: 'URL where to read of the blob contents from',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
				from: ['url'],
			},
		},
		required: true,
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const url = this.getNodeParameter('url') as string;

						requestOptions.headers ??= {};

						// Documentation specifies Content-Length: 0, but this causes invalid signature for SharedKey:
						// Required. Specifies the number of bytes being transmitted in the request body. The value of this header must be set to 0. When the length isn't 0, the operation fails with the status code 400 (Bad Request).
						// requestOptions.headers[HeaderConstants.CONTENT_LENGTH] = 0;

						requestOptions.headers[HeaderConstants.X_MS_BLOB_TYPE] = 'BlockBlob';
						requestOptions.headers[HeaderConstants.X_MS_COPY_SOURCE] = url;

						return requestOptions;
					},
				],
			},
		},
		placeholder: 'e.g. https://example.com/image.jpg',
		type: 'string',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Access Tier',
				name: 'accessTier',
				description:
					'The tier to be set on the blob. For detailed information about block blob tiering, see <a href="https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview">Hot, cool, and archive storage tiers</a>.',
				default: 'Hot',
				options: [
					{
						name: 'Archive',
						value: 'Archive',
					},
					{
						name: 'Cold',
						value: 'Cold',
					},
					{
						name: 'Cool',
						value: 'Cool',
					},
					{
						name: 'Hot',
						value: 'Hot',
					},
				],
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_ACCESS_TIER]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'options',
				validateType: 'options',
			},
			{
				displayName: 'Blob Type',
				name: 'blobType',
				description: 'Specifies the type of blob to create: block, page, or append blob',
				default: 'BlockBlob',
				displayOptions: {
					show: {
						'/from': ['binary'],
					},
				},
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_BLOB_TYPE]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'options',
				options: [
					{
						name: 'Block Blob',
						value: 'BlockBlob',
					},
					{
						name: 'Page Blob',
						value: 'PageBlob',
					},
					{
						name: 'Append Blob',
						value: 'AppendBlob',
					},
				],
				validateType: 'string',
			},
			{
				displayName: 'Cache Control',
				name: 'cacheControl',
				description: "Sets the blob's cache control value",
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_BLOB_CACHE_CONTROL]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Content CRC64',
				name: 'contentCrc64',
				description: 'CRC64 hash of the blob content to verify its integrity during transport',
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_CONTENT_CRC64]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Content Encoding',
				name: 'contentEncoding',
				description: "Sets the blob's content encoding",
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_BLOB_CONTENT_ENCODING]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Content Language',
				name: 'contentLanguage',
				description: "Sets the blob's content language",
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_BLOB_CONTENT_LANGUAGE]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Content MD5',
				name: 'contentMd5',
				description: "Sets the blob's MD5 hash for integrity verification",
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_BLOB_CONTENT_MD5]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				description: "Sets the blob's content type",
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_BLOB_CONTENT_TYPE]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Encryption Context',
				name: 'encryptionContext',
				description:
					'If the value is set it will set blob system metadata. Max length-1024. Valid only when Hierarchical Namespace is enabled for the account.',
				default: '',
				displayOptions: {
					show: {
						'/from': ['binary'],
					},
				},
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_ENCRYPTION_CONTEXT]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Encryption Scope',
				name: 'encryptionScope',
				description: 'Indicates the encryption scope for encrypting the request contents',
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_ENCRYPTION_SCOPE]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Expiry Option',
				name: 'expiryOption',
				description:
					'Specifies the expiration date option for the request. This header is valid for accounts with hierarchical namespace enabled.',
				default: 'Absolute',
				options: [
					{
						name: 'Expire',
						value: 'Absolute',
						description: 'Expiry Time must be specified',
					},
					{
						name: 'Never Expire',
						value: 'NeverExpire',
						description: 'Sets the blob to never expire or removes the current expiration date',
					},
				],
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_EXPIRY_OPTION]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'options',
				validateType: 'options',
			},
			{
				displayName: 'Expiry Time',
				name: 'expiryTime',
				description: 'Specifies the time when the blob is set to expire as an absolute time',
				default: '',
				displayOptions: {
					hide: {
						'/options.expiryOption': ['NeverExpire'],
					},
				},
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_EXPIRY_TIME]:
								'={{ $value ? DateTime.fromISO($value).format("EEE, dd MMM yyyy HH:mm:ss ZZZ") : undefined }}',
						},
					},
				},
				type: 'dateTime',
				validateType: 'dateTime',
			},
			{
				displayName: 'Filename',
				name: 'filename',
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_BLOB_CONTENT_DISPOSITION]:
								"={{ $value ? 'attachment; filename=\"' + $value + '\"' : undefined }}",
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Immutability Policy Date',
				name: 'immutabilityPolicyUntilDate',
				description:
					'Specifies the retention-until date to be set on the blob. This is the date until which the blob can be protected from being modified or deleted.',
				default: '',
				displayOptions: {
					show: {
						'/from': ['binary'],
					},
				},
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_IMMUTABILITY_POLICY_UNTIL_DATE]:
								'={{ $value ? DateTime.fromISO($value).format("EEE, dd MMM yyyy HH:mm:ss ZZZ") : undefined }}',
						},
					},
				},
				type: 'dateTime',
				validateType: 'dateTime',
			},
			{
				displayName: 'Immutability Policy Mode',
				name: 'immutabilityPolicyMode',
				description: 'Specifies the immutability policy mode to be set on the blob',
				default: 'unlocked',
				displayOptions: {
					show: {
						'/from': ['binary'],
					},
				},
				options: [
					{
						name: 'Locked',
						value: 'locked',
						description: 'Users are prohibited from modifying the policy',
					},
					{
						name: 'Unlocked',
						value: 'unlocked',
						description:
							'Users can change the policy by increasing or decreasing the retention-until date',
					},
				],
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_IMMUTABILITY_POLICY_MODE]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Lease ID',
				name: 'leaseId',
				description: 'Required if the blob has an active lease',
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_LEASE_ID]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Legal Hold',
				name: 'legalHold',
				description: 'Whether to set a legal hold on the blob',
				default: false,
				displayOptions: {
					show: {
						'/from': ['binary'],
					},
				},
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_LEGAL_HOLD]: '={{ $value?.toString() || undefined }}',
						},
					},
				},
				type: 'boolean',
				validateType: 'boolean',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				default: [],
				description: 'A name-value pair to associate with the blob as metadata',
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								default: '',
								description:
									'Names must adhere to the naming rules for <a href="https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/">C# identifiers</a>',
								type: 'string',
							},
							{
								displayName: 'Field Value',
								name: 'fieldValue',
								default: '',
								type: 'string',
							},
						],
					},
				],
				placeholder: 'Add metadata',
				routing: {
					send: {
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								requestOptions.headers ??= {};
								const metadata = this.getNodeParameter('options.metadata') as IDataObject;
								for (const data of metadata.metadataValues as IDataObject[]) {
									requestOptions.headers[
										`${HeaderConstants.PREFIX_X_MS_META}${data.fieldName as string}`
									] = data.fieldValue as string;
								}
								return requestOptions;
							},
						],
					},
				},
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
			},
			{
				displayName: 'Origin',
				name: 'origin',
				description:
					'Specifies the origin from which the request is issued. The presence of this header results in cross-origin resource sharing (CORS) headers on the response. For more information, see <a href="https://learn.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services">CORS support for the Azure Storage services</a>.',
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.ORIGIN]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				description: 'Sets the given tags on the blob',
				default: [],
				options: [
					{
						name: 'tagValues',
						displayName: 'Tag',
						values: [
							{
								displayName: 'Tag Name',
								name: 'tagName',
								default: '',
								type: 'string',
							},
							{
								displayName: 'Tag Value',
								name: 'tagValue',
								default: '',
								type: 'string',
							},
						],
					},
				],
				placeholder: 'Add tag',
				routing: {
					send: {
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								requestOptions.headers ??= {};
								const tags = this.getNodeParameter('options.tags') as IDataObject;
								requestOptions.headers[HeaderConstants.X_MS_TAGS] = (
									tags.tagValues as IDataObject[]
								)
									.map(
										(tag) =>
											`${encodeURIComponent(tag.tagName as string)}=${encodeURIComponent(tag.tagValue as string)}`,
									)
									.join('&');
								return requestOptions;
							},
						],
					},
				},
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
			},
		],
		placeholder: 'Add option',
		type: 'collection',
	},
];

const deleteFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Container to delete a blob from',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				placeholder: 'e.g. mycontainer',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Blob',
		name: 'blob',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Blob to be deleted',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getBlobs',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				placeholder: 'e.g. myblob',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['delete'],
			},
		},
		options: [
			{
				displayName: 'Lease ID',
				name: 'leaseId',
				description: 'Required if the blob has an active lease',
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_LEASE_ID]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
		],
		placeholder: 'Add option',
		type: 'collection',
	},
];

const getFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Container to get a blob from',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				placeholder: 'e.g. mycontainer',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Blob',
		name: 'blob',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Blob to get',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getBlobs',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				placeholder: 'e.g. myblob',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Lease ID',
				name: 'leaseId',
				description:
					"If this header is specified, the operation is performed only if both of the following conditions are met: <ul><li>The blob's lease is currently active.</li><li>The lease ID that's specified in the request matches the lease ID of the blob.</li></ul>",
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_LEASE_ID]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				description:
					'Specifies the origin from which the request is issued. The presence of this header results in cross-origin resource sharing (CORS) headers on the response.',
				default: '',
				routing: {
					request: {
						headers: {
							[HeaderConstants.ORIGIN]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'string',
				validateType: 'string',
			},
			{
				displayName: 'Simplify',
				name: 'simplify',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
			{
				displayName: 'UPN',
				name: 'upn',
				description:
					"Whether the user identity values that are returned in the response will be transformed from Microsoft Entra object IDs to User Principal Names. If the value is false, they're returned as Microsoft Entra object IDs. Valid for accounts with hierarchical namespace enabled.",
				default: false,
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_UPN]: '={{ $value?.toString() || undefined }}',
						},
					},
				},
				type: 'boolean',
				validateType: 'boolean',
			},
		],
		placeholder: 'Add option',
		type: 'collection',
	},
];

const getAllFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Container to get blobs from',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['getAll'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				placeholder: 'e.g. mycontainer',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
			operations: {
				async pagination(
					this: IExecutePaginationFunctions,
					requestOptions: DeclarativeRestApiSettings.ResultOptions,
				): Promise<INodeExecutionData[]> {
					let executions: INodeExecutionData[] = [];
					let marker: string | undefined = undefined;
					requestOptions.options.qs ??= {};

					do {
						requestOptions.options.qs.marker = marker;
						const responseData = await this.makeRoutingRequest(requestOptions);
						marker = responseData[0].json.nextMarker as string | undefined;
						executions = executions.concat(
							(responseData[0].json.blobs as IDataObject[]).map((item) => ({ json: item })),
						);
					} while (marker);

					return executions;
				},
			},
		},
		type: 'boolean',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		routing: {
			send: {
				property: 'maxresults',
				type: 'query',
				value: '={{ $value }}',
			},
			output: {
				postReceive: [
					async function (
						this: IExecuteSingleFunctions,
						data: INodeExecutionData[],
						_response: IN8nHttpFullResponse,
					): Promise<INodeExecutionData[]> {
						return (data[0].json.blobs as IDataObject[]).map((item) => ({ json: item }));
					},
				],
			},
		},
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		validateType: 'number',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				default: [],
				description: 'The fields to add to the output',
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description:
							'Specifies that metadata related to any current or previous Copy Blob operation should be included in the response',
					},
					{
						name: 'Deleted',
						value: 'deleted',
						description: 'Specifies that soft-deleted blobs should be included in the response',
					},
					{
						name: 'Deleted with Versions',
						value: 'deletedwithversions',
						description:
							'Specifies that deleted blobs with any versions (active or deleted) should be included in the response. Items permanently deleted appear until processed by garbage collection.',
					},
					{
						name: 'Immutability Policy',
						value: 'immutabilitypolicy',
						description:
							'Specifies that the enumeration should include the immutability policy until date, and the immutability policy mode of the blobs',
					},
					{
						name: 'Legal Hold',
						value: 'legalhold',
						description: 'Specifies that the enumeration should include the legal hold of blobs',
					},
					{
						name: 'Metadata',
						value: 'metadata',
						description: 'Specifies that blob metadata be returned in the response',
					},
					{
						name: 'Permissions',
						value: 'permissions',
						description:
							'Includes the owner, group, permissions, and access control list for the listed blobs or directories. Supported only for accounts with a hierarchical namespace enabled.',
					},
					{
						name: 'Snapshots',
						value: 'snapshots',
						description:
							'Specifies that snapshots should be included in the enumeration. Snapshots are listed from oldest to newest in the response.',
					},
					{
						name: 'Tags',
						value: 'tags',
						description:
							'Specifies that user-defined, blob index tags should be included in the response',
					},
					{
						name: 'Uncommitted Blobs',
						value: 'uncommittedblobs',
						description:
							"Specifies that blobs for which blocks have been uploaded, but which haven't been committed",
					},
					{
						name: 'Versions',
						value: 'versions',
						description: 'Specifies that versions of blobs should be included in the enumeration',
					},
				],
				routing: {
					send: {
						property: 'include',
						type: 'query',
						value: '={{ $value.join(",") || undefined }}',
					},
				},
				type: 'multiOptions',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				default: [],
				description: 'The type of datasets to be returned',
				options: [
					{
						name: 'Deleted',
						value: 'deleted',
						description:
							'Only for accounts enabled with hierarchical namespace. When included, the list only contains soft-deleted blobs. POSIX ACL authorization fallback is not supported for listing soft-deleted blobs.',
					},
					{
						name: 'Files',
						value: 'files',
						description:
							'Only for accounts enabled with hierarchical namespace. When included, the list only contains files.',
					},
					{
						name: 'Directories',
						value: 'directories',
						description:
							'Only for accounts enabled with hierarchical namespace. When included, the list only contains directories.',
					},
				],
				routing: {
					send: {
						property: 'showonly',
						type: 'query',
						value: '={{ $value.join(",") || undefined }}',
					},
				},
				type: 'multiOptions',
			},
			{
				displayName: 'Simplify',
				name: 'simplify',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
			{
				displayName: 'UPN',
				name: 'upn',
				description:
					"Whether the user identity values that are returned in the response will be transformed from Microsoft Entra object IDs to User Principal Names. If the value is false, they're returned as Microsoft Entra object IDs. Valid for accounts with hierarchical namespace enabled.",
				default: false,
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_UPN]: '={{ $value?.toString() || undefined }}',
						},
					},
				},
				type: 'boolean',
				validateType: 'boolean',
			},
		],
		placeholder: 'Add option',
		type: 'collection',
	},
];

export const blobFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
];
