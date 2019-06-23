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

import { parseString } from 'xml2js';
import { OptionsWithUri } from 'request';


export class NextCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NextCloud',
		name: 'nextCloud',
		icon: 'file:nextcloud.png',
		group: ['input'],
		version: 1,
		description: 'Access data on NextCloud',
		defaults: {
			name: 'NextCloud',
			color: '#22BB44',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'nextCloudApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a file or folder',
					},
					{
						name: 'Create Folder',
						value: 'createFolder',
						description: 'Creates a folder',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Deletes a file or folder',
					},
					{
						name: 'Download File',
						value: 'downloadFile',
						description: 'Downloads a file',
					},
					{
						name: 'Get Folder Content',
						value: 'listFolderContent',
						description: 'Returns the files and folder in a given folder',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Moves a file or folder',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						description: 'Uploads a file into a folder',
					},
				],
				default: 'uploadFile',
				description: 'The operation to perform.',
			},


			// ----------------------------------
			//         copy
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
					},
				},
				placeholder: '/invoices/copy.txt',
				description: 'The destination path of file or folder.',
			},


			// ----------------------------------
			//         createFolder
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
							'createFolder'
						],
					},
				},
				placeholder: 'invoices/2019',
				description: 'The folder to create. The parent folder has to exist.',
			},

			// ----------------------------------
			//         delete
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
					},
				},
				placeholder: 'invoices/2019/invoice_1.pdf',
				description: 'The path to delete. Can be a single file or a whole folder.',
			},

			// ----------------------------------
			//         downloadFile
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
							'downloadFile'
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
							'downloadFile'
						],
					},
				},
				description: 'Name of the binary property to which to<br />write the data of the read file.',
			},

			// ----------------------------------
			//         listFolderContent
			// ----------------------------------
			{
				displayName: 'Folder Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'listFolderContent'
						],
					},
				},
				placeholder: 'invoices/2019/',
				description: 'The path of which to list the content.',
			},


			// ----------------------------------
			//         move
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
					},
				},
				placeholder: '/invoices/new_name.txt',
				description: 'The new path of file or folder.',
			},


			// ----------------------------------
			//         uploadFile
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
							'uploadFile'
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
							'uploadFile'
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
						operation: [
							'uploadFile'
						],
						binaryDataUpload: [
							false
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
						operation: [
							'uploadFile'
						],
						binaryDataUpload: [
							true
						],
					},

				},
				placeholder: '',
				description: 'Name of the binary property which contains<br />the data for the file to be uploaded.',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = this.getCredentials('nextCloudApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const operation = this.getNodeParameter('operation', 0) as string;

		let endpoint = '';
		let requestMethod = '';

		let body: string | Buffer = '';
		const headers: IDataObject = {};

		for (let i = 0; i < items.length; i++) {

			if (operation === 'copy') {
				// ----------------------------------
				//         copy
				// ----------------------------------

				requestMethod = 'COPY';
				endpoint = this.getNodeParameter('path', i) as string;
				const toPath = this.getNodeParameter('toPath', i) as string;
				headers.Destination = `${credentials.webDavUrl}/${encodeURI(toPath)}`;

			} else if (operation === 'createFolder') {
				// ----------------------------------
				//         createFolder
				// ----------------------------------

				requestMethod = 'MKCOL';
				endpoint = this.getNodeParameter('path', i) as string;

			} else if (operation === 'delete') {
				// ----------------------------------
				//         delete
				// ----------------------------------

				requestMethod = 'DELETE';
				endpoint = this.getNodeParameter('path', i) as string;

			} else if (operation === 'downloadFile') {
				// ----------------------------------
				//         downloadFile
				// ----------------------------------

				requestMethod = 'GET';
				endpoint = this.getNodeParameter('path', i) as string;

			} else if (operation === 'listFolderContent') {
				// ----------------------------------
				//         listFolderContent
				// ----------------------------------

				requestMethod = 'PROPFIND';
				endpoint = this.getNodeParameter('path', i) as string;

			} else if (operation === 'move') {
				// ----------------------------------
				//         move
				// ----------------------------------

				requestMethod = 'MOVE';
				endpoint = this.getNodeParameter('path', i) as string;
				const toPath = this.getNodeParameter('toPath', i) as string;
				headers.Destination = `${credentials.webDavUrl}/${encodeURI(toPath)}`;

			} else if (operation === 'uploadFile') {
				// ----------------------------------
				//         uploadFile
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
			} else {
				throw new Error(`The operation "${operation}" is not known!`);
			}

			// Make sure that the webdav URL does never have a trailing slash because
			// one gets added always automatically
			let webDavUrl = credentials.webDavUrl as string;
			if (webDavUrl.slice(-1) === '/') {
				webDavUrl = webDavUrl.slice(0, -1);
			}

			const options: OptionsWithUri = {
				auth: {
					user: credentials.user as string,
					pass: credentials.password as string,
				},
				headers,
				method: requestMethod,
				body,
				qs: {},
				uri: `${credentials.webDavUrl}/${encodeURI(endpoint)}`,
				json: false,
			};

			if (operation === 'downloadFile') {
				// Return the data as a buffer
				options.encoding = null;
			}

			const responseData = await this.helpers.request(options);

			if (operation === 'downloadFile') {
				// TODO: Has to check if it already exists and only add if not
				if (items[i].binary === undefined) {
					items[i].binary = {};
				}
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

				items[i].binary![binaryPropertyName] = await this.helpers.prepareBinaryData(responseData, endpoint);
			} else if (operation === 'listFolderContent') {

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

		if (operation === 'downloadFile') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else  {
			// For all other ones does the output get replaced
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
