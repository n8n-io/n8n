import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import {
	parseString,
} from 'xml2js';

import {
	nextCloudApiRequest,
} from './GenericFunctions';

export class NextCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NextCloud',
		name: 'nextCloud',
		icon: 'file:nextcloud.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on NextCloud',
		defaults: {
			name: 'NextCloud',
			color: '#1cafff',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'nextCloudApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'nextCloudOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Folder',
						value: 'folder',
					},
				],
				default: 'file',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'file',
						],
					},
				},
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a file',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a file',
					},
					{
						name: 'Download',
						value: 'download',
						description: 'Download a file',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move a file',
					},
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a file',
					},
				],
				default: 'upload',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'folder',
						],
					},
				},
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a folder',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a folder',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a folder',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Return the files and folders in a given folder',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move a folder',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},



			// ----------------------------------
			//         file
			// ----------------------------------

			// ----------------------------------
			//         file/folder:copy
			// ----------------------------------
			{
				displayName: 'From Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'copy'
						],
						resource: [
							'file',
							'folder',
						],
					},
				},
				placeholder: '/invoices/original.txt',
				description: 'The path of file or folder to copy.',
			},
			{
				displayName: 'To Path',
				name: 'toPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'copy'
						],
						resource: [
							'file',
							'folder',
						],
					},
				},
				placeholder: '/invoices/copy.txt',
				description: 'The destination path of file or folder.',
			},

			// ----------------------------------
			//         file/folder:delete
			// ----------------------------------
			{
				displayName: 'Delete Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete'
						],
						resource: [
							'file',
							'folder',
						],
					},
				},
				placeholder: 'invoices/2019/invoice_1.pdf',
				description: 'The path to delete. Can be a single file or a whole folder.',
			},

			// ----------------------------------
			//         file/folder:move
			// ----------------------------------
			{
				displayName: 'From Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'move'
						],
						resource: [
							'file',
							'folder',
						],
					},
				},
				placeholder: '/invoices/old_name.txt',
				description: 'The path of file or folder to move.',
			},
			{
				displayName: 'To Path',
				name: 'toPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'move'
						],
						resource: [
							'file',
							'folder',
						],
					},
				},
				placeholder: '/invoices/new_name.txt',
				description: 'The new path of file or folder.',
			},

			// ----------------------------------
			//         file:download
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'download'
						],
						resource: [
							'file',
						],
					},
				},
				placeholder: 'invoices/2019/invoice_1.pdf',
				description: 'The file path of the file to download. Has to contain the full path.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'download'
						],
						resource: [
							'file',
						],
					},
				},
				description: 'Name of the binary property to which to<br />write the data of the read file.',
			},

			// ----------------------------------
			//         file:upload
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'upload'
						],
						resource: [
							'file',
						],
					},
				},
				placeholder: 'invoices/2019/invoice_1.pdf',
				description: 'The file path of the file to upload. Has to contain the full path. The parent folder has to exist. Existing files get overwritten.',
			},
			{
				displayName: 'Binary Data',
				name: 'binaryDataUpload',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'upload'
						],
						resource: [
							'file',
						],
					},
				},
				description: '',
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						binaryDataUpload: [
							false
						],
						operation: [
							'upload'
						],
						resource: [
							'file',
						],
					},

				},
				placeholder: '',
				description: 'The text content of the file to upload.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						binaryDataUpload: [
							true
						],
						operation: [
							'upload'
						],
						resource: [
							'file',
						],
					},

				},
				placeholder: '',
				description: 'Name of the binary property which contains<br />the data for the file to be uploaded.',
			},



			// ----------------------------------
			//         folder
			// ----------------------------------

			// ----------------------------------
			//         folder:create
			// ----------------------------------
			{
				displayName: 'Folder',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create'
						],
						resource: [
							'folder',
						],
					},
				},
				placeholder: 'invoices/2019',
				description: 'The folder to create. The parent folder has to exist.',
			},

			// ----------------------------------
			//         folder:list
			// ----------------------------------
			{
				displayName: 'Folder Path',
				name: 'path',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'list'
						],
						resource: [
							'folder',
						],
					},
				},
				placeholder: 'invoices/2019/',
				description: 'The path of which to list the content.',
			},

		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData().slice();
		const returnData: IDataObject[] = [];

		const authenticationMethod = this.getNodeParameter('authentication', 0);
		let credentials;

		if (authenticationMethod === 'accessToken') {
			credentials = this.getCredentials('nextCloudApi');
		} else {
			credentials = this.getCredentials('nextCloudOAuth2Api');
		}

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let endpoint = '';
		let requestMethod = '';
		let responseData: any; // tslint:disable-line:no-any

		let body: string | Buffer = '';
		const headers: IDataObject = {};

		for (let i = 0; i < items.length; i++) {
			if (resource === 'file') {
				if (operation === 'download') {
					// ----------------------------------
					//         download
					// ----------------------------------

					requestMethod = 'GET';
					endpoint = this.getNodeParameter('path', i) as string;

				} else if (operation === 'upload') {
					// ----------------------------------
					//         upload
					// ----------------------------------

					requestMethod = 'PUT';
					endpoint = this.getNodeParameter('path', i) as string;

					if (this.getNodeParameter('binaryDataUpload', i) === true) {
						// Is binary file to upload
						const item = items[i];

						if (item.binary === undefined) {
							throw new Error('No binary data exists on item!');
						}

						const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;


						if (item.binary[propertyNameUpload] === undefined) {
							throw new Error(`No binary data property "${propertyNameUpload}" does not exists on item!`);
						}

						body = Buffer.from(item.binary[propertyNameUpload].data, BINARY_ENCODING);
					} else {
						// Is text file
						body = this.getNodeParameter('fileContent', i) as string;
					}
				}
			} else if (resource === 'folder') {
				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'MKCOL';
					endpoint = this.getNodeParameter('path', i) as string;

				} else if (operation === 'list') {
					// ----------------------------------
					//         list
					// ----------------------------------

					requestMethod = 'PROPFIND';
					endpoint = this.getNodeParameter('path', i) as string;

				}
			}

			if (['file', 'folder'].includes(resource)) {
				if (operation === 'copy') {
					// ----------------------------------
					//         copy
					// ----------------------------------

					requestMethod = 'COPY';
					endpoint = this.getNodeParameter('path', i) as string;
					const toPath = this.getNodeParameter('toPath', i) as string;
					headers.Destination = `${credentials.webDavUrl}/${encodeURI(toPath)}`;

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					endpoint = this.getNodeParameter('path', i) as string;

				} else if (operation === 'move') {
					// ----------------------------------
					//         move
					// ----------------------------------

					requestMethod = 'MOVE';
					endpoint = this.getNodeParameter('path', i) as string;
					const toPath = this.getNodeParameter('toPath', i) as string;
					headers.Destination = `${credentials.webDavUrl}/${encodeURI(toPath)}`;

				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			// Make sure that the webdav URL does never have a trailing slash because
			// one gets added always automatically
			let webDavUrl = credentials.webDavUrl as string;
			if (webDavUrl.slice(-1) === '/') {
				webDavUrl = webDavUrl.slice(0, -1);
			}

			let encoding = undefined;
			if (resource === 'file' && operation === 'download') {
				// Return the data as a buffer
				encoding = null;
			}

			try {
				responseData = await nextCloudApiRequest.call(this, requestMethod, endpoint, body, headers, encoding);
			} catch (error) {
				if (this.continueOnFail() === true) {
					returnData.push({ error });
					continue;
				}

				throw error;
			}

			if (resource === 'file' && operation === 'download') {

				const newItem: INodeExecutionData = {
					json: items[i].json,
					binary: {},
				};

				if (items[i].binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, items[i].binary);
				}

				items[i] = newItem;

				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

				items[i].binary![binaryPropertyName] = await this.helpers.prepareBinaryData(responseData, endpoint);
			} else if (resource === 'folder' && operation === 'list') {

				const jsonResponseData: IDataObject = await new Promise((resolve, reject) => {
					parseString(responseData, { explicitArray: false }, (err, data) => {
						if (err) {
							return reject(err);
						}
						resolve(data as IDataObject);
					});
				});

				const propNames: { [key: string]: string } = {
					'd:getlastmodified': 'lastModified',
					'd:getcontentlength': 'contentLength',
					'd:getcontenttype': 'contentType',
				};

				if (jsonResponseData['d:multistatus'] !== undefined &&
					jsonResponseData['d:multistatus'] !== null &&
					(jsonResponseData['d:multistatus'] as IDataObject)['d:response'] !== undefined &&
					(jsonResponseData['d:multistatus'] as IDataObject)['d:response'] !== null) {
					let skippedFirst = false;

					// @ts-ignore
					for (const item of jsonResponseData['d:multistatus']['d:response']) {
						if (skippedFirst === false) {
							skippedFirst = true;
							continue;
						}
						const newItem: IDataObject = {};

						newItem.path = item['d:href'].slice(19);

						const props = item['d:propstat'][0]['d:prop'];

						// Get the props and save them under a proper name
						for (const propName of Object.keys(propNames)) {
							if (props[propName] !== undefined) {
								newItem[propNames[propName]] = props[propName];
							}
						}

						if (props['d:resourcetype'] === '') {
							newItem.type = 'file';
						} else {
							newItem.type = 'folder';
						}
						newItem.eTag = props['d:getetag'].slice(1, -1);

						returnData.push(newItem as IDataObject);
					}
				}
			} else {
				returnData.push(responseData as IDataObject);
			}

		}

		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else  {
			// For all other ones does the output get replaced
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
