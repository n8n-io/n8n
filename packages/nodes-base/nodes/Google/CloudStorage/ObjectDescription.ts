import { lookup } from 'mime-types';
import { IBinaryData, IDataObject } from 'n8n-workflow';
import { INodeExecutionData, INodeProperties } from 'n8n-workflow';

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
				name: 'Delete',
				value: 'delete',
				description: 'Delete an object',
				routing: {
					request: {
						method: 'DELETE',
						url: '={{"/b/" + $parameter["bucketName"] + "/o/" + $parameter["objectName"]}}',
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
						url: '={{"/b/" + $parameter["bucketName"] + "/o/" + $parameter["objectName"]}}',
						returnFullResponse: true,
						qs: {
							projection: '={{$parameter["projection"]}}',
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
										Buffer.from(responseData.body as string, 'utf-8'),
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
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve a list of objects',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/b/" + $parameter["bucketName"] + "/o/"}}',
						returnFullResponse: true,
						qs: {
							projection: '={{$parameter["projection"]}}',
						},
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

							do {
								requestOptions.options.qs.pageToken = nextPageToken;
								responseData = await this.makeRoutingRequest(requestOptions);

								// Check for another page
								const lastItem = responseData[responseData.length - 1].json;
								nextPageToken = lastItem.nextPageToken as string | undefined;

								// Extract just the list of buckets from the page data
								responseData.forEach((page) => {
									const objects = page.json.items as IDataObject[];
									if (objects) {
										executions = executions.concat(objects.map((object) => ({ json: object })));
									}
								});
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
						method: 'PUT',
						url: '={{"/b/" + $parameter["bucketName"] + "/o/" + $parameter["objectName"]}}',
						qs: {
							projection: '={{$parameter["updateProjection"]}}',
						},
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

								console.log(requestOptions);

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
				operation: ['delete', 'get', 'update'],
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
	},
	// Update gets its own definition because the default value is swapped
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
				operation: ['update'],
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
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
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
		displayName: 'Update Fields',
		name: 'updateData',
		type: 'collection',
		placeholder: 'Add Update Parameter',
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
		options: [
			...metagenerationFilters,
			{
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
			},
		],
	},
	{
		displayName: 'Encryption Headers',
		name: 'encryptionHeaders',
		type: 'collection',
		placeholder: 'Add Encryption Headers',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['get', 'update'],
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
