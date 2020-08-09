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
	googleApiRequest,
} from './GenericFunctions';

export class GoogleDrive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Drive',
		name: 'googleDrive',
		icon: 'file:googleDrive.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Google Drive',
		defaults: {
			name: 'Google Drive',
			color: '#3f87f2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'serviceAccount',
						],
					},
				},
			},
			{
				name: 'googleDriveOAuth2Api',
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
						name: 'Service Account',
						value: 'serviceAccount',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'serviceAccount',
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
						name: 'List',
						value: 'list',
						description: 'List files and folders',
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
						name: 'Create',
						value: 'create',
						description: 'Create a folder',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a folder',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},


			// ----------------------------------
			//         file
			// ----------------------------------

			// ----------------------------------
			//         file:copy
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'fileId',
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
						],
					},
				},
				description: 'The ID of the file to copy.',
			},


			// ----------------------------------
			//         file/folder:delete
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'fileId',
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
				description: 'The ID of the file/folder to delete.',
			},


			// ----------------------------------
			//         file:download
			// ----------------------------------
			{
				displayName: 'File Id',
				name: 'fileId',
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
				description: 'The ID of the file to download.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
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
			//         file:list
			// ----------------------------------
			{
				displayName: 'Use Query String',
				name: 'useQueryString',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: [
							'list'
						],
						resource: [
							'file',
						],
					},
				},
				description: 'If a query string should be used to filter results.',
			},
			{
				displayName: 'Query String',
				name: 'queryString',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
						useQueryString: [
							true,
						],
						resource: [
							'file',
						],
					},
				},
				placeholder: 'name contains \'invoice\'',
				description: 'Query to use to return only specific files.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
						resource: [
							'file',
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				default: 100,
				description: 'How many files to return.',
			},
			{
				displayName: 'Filters',
				name: 'queryFilters',
				placeholder: 'Add Filter',
				description: 'Filters to use to return only specific files.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						operation: [
							'list',
						],
						useQueryString: [
							false,
						],
						resource: [
							'file',
						],
					},
				},
				options: [
					{
						name: 'name',
						displayName: 'Name',
						values: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: 'Contains',
										value: 'contains'
									},
									{
										name: 'Is',
										value: 'is'
									},
									{
										name: 'Is Not',
										value: 'isNot'
									},

								],
								default: 'contains',
								description: 'Operation to perform.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value for operation.',
							},
						]
					},
					{
						name: 'mimeType',
						displayName: 'Mime Type',
						values: [
							{
								displayName: 'Mime Type',
								name: 'mimeType',
								type: 'options',
								options: [

									{
										name: 'Custom Mime Type',
										value: 'custom',
									},
									{
										name: '	3rd party shortcut',
										value: 'application/vnd.google-apps.drive-sdk',
									},
									{
										name: 'Audio',
										value: 'application/vnd.google-apps.audio',
									},
									{
										name: 'Google Apps Scripts',
										value: 'application/vnd.google-apps.script',
									},
									{
										name: 'Google Docs',
										value: 'application/vnd.google-apps.document',
									},
									{
										name: 'Google Drawing',
										value: 'application/vnd.google-apps.drawing',
									},
									{
										name: 'Google Drive file',
										value: 'application/vnd.google-apps.file',
									},
									{
										name: 'Google Drive folder',
										value: 'application/vnd.google-apps.folder',
									},
									{
										name: 'Google Forms',
										value: 'application/vnd.google-apps.form',
									},
									{
										name: 'Google Fusion Tables',
										value: 'application/vnd.google-apps.fusiontable',
									},
									{
										name: 'Google My Maps',
										value: 'application/vnd.google-apps.map',
									},
									{
										name: 'Google Sheets',
										value: 'application/vnd.google-apps.spreadsheet',
									},
									{
										name: 'Google Sites',
										value: 'application/vnd.google-apps.site',
									},
									{
										name: 'Google Slides',
										value: 'application/vnd.google-apps.presentation',
									},
									{
										name: 'Photo',
										value: 'application/vnd.google-apps.photo',
									},
									{
										name: 'Unknown',
										value: 'application/vnd.google-apps.unknown',
									},
									{
										name: 'Video',
										value: 'application/vnd.google-apps.video',
									},

								],
								default: 'application/vnd.google-apps.file',
								description: 'The Mime-Type of the files to return.',
							},
							{
								displayName: 'Custom Mime Type',
								name: 'customMimeType',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										mimeType: [
											'custom',
										],
									},
								},
								description: 'Custom Mime Type',
							},
						]
					}
				],
			},


			// ----------------------------------
			//         file:upload
			// ----------------------------------
			{
				displayName: 'File Name',
				name: 'name',
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
				placeholder: 'invoice_1.pdf',
				description: 'The name the file should be saved as.',
			},
			{
				displayName: 'Parents',
				name: 'parents',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
						resource: [
							'file',
						],
					},
				},
				description: 'The IDs of the parent folders which contain the file.',
			},
			{
				displayName: 'Binary Data',
				name: 'binaryData',
				type: 'boolean',
				default: false,
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
				description: 'If the data to upload should be taken from binary field.',
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'upload'
						],
						resource: [
							'file',
						],
						binaryData: [
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
							'upload'
						],
						resource: [
							'file',
						],
						binaryData: [
							true
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
				name: 'name',
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
				placeholder: 'invoices',
				description: 'The name of folder to create.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'multiOptions',
						options: [
							{
								name: '*',
								value: '*',
								description: 'All fields.',
							},
							{
								name: 'explicitlyTrashed',
								value: 'explicitlyTrashed',
							},
							{
								name: 'exportLinks',
								value: 'exportLinks',
							},
							{
								name: 'iconLink',
								value: 'iconLink',
							},
							{
								name: 'hasThumbnail',
								value: 'hasThumbnail',
							},
							{
								name: 'id',
								value: 'id',
							},
							{
								name: 'kind',
								value: 'kind',
							},
							{
								name: 'name',
								value: 'name',
							},
							{
								name: 'mimeType',
								value: 'mimeType',
							},
							{
								name: 'permissions',
								value: 'permissions',
							},
							{
								name: 'shared',
								value: 'shared',
							},
							{
								name: 'spaces',
								value: 'spaces',
							},
							{
								name: 'starred',
								value: 'starred',
							},
							{
								name: 'thumbnailLink',
								value: 'thumbnailLink',
							},
							{
								name: 'trashed',
								value: 'trashed',
							},
							{
								name: 'version',
								value: 'version',
							},
							{
								name: 'webViewLink',
								value: 'webViewLink',
							},
						],
						required: true,
						default: [],
						description: 'The fields to return.',
					},

					{
						displayName: 'File Name',
						name: 'name',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'copy'
								],
								'/resource': [
									'file',
								],
							},
						},
						default: '',
						placeholder: 'invoice_1.pdf',
						description: 'The name the file should be saved as.',
					},
					{
						displayName: 'Parents',
						name: 'parents',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'copy',
									'create',
								],
								'/resource': [
									'file',
									'folder',
								],
							},
						},
						typeOptions: {
							multipleValues: true,
						},
						default: [],
						description: 'The IDs of the parent folders the file/folder should be saved in.',
					},
					{
						displayName: 'Spaces',
						name: 'spaces',
						type: 'multiOptions',
						displayOptions: {
							show: {
								'/operation': [
									'list'
								],
								'/resource': [
									'file',
								],
							},
						},
						options: [
							{
								name: '*',
								value: '*',
								description: 'All spaces.',
							},
							{
								name: 'appDataFolder',
								value: 'appDataFolder',
							},
							{
								name: 'drive',
								value: 'drive',
							},
							{
								name: 'photos',
								value: 'photos',
							},
						],
						required: true,
						default: [],
						description: 'The spaces to operate on.',
					},
					{
						displayName: 'Corpora',
						name: 'corpora',
						type: 'options',
						displayOptions: {
							show: {
								'/operation': [
									'list'
								],
								'/resource': [
									'file',
								],
							},
						},
						options: [
							{
								name: 'user',
								value: 'user',
								description: 'All files in "My Drive" and "Shared with me"',
							},
							{
								name: 'domain',
								value: 'domain',
								description: 'All files shared to the user\'s domain that are searchable',
							},
							{
								name: 'drive',
								value: 'drive',
								description: 'All files contained in a single shared drive',
							},
							{
								name: 'allDrives',
								value: 'allDrives',
								description: 'All drives',
							},
						],
						required: true,
						default: '',
						description: 'The corpora to operate on.',
					},
					{
						displayName: 'Drive Id',
						name: 'driveId',
						type: 'string',
						default: '',
						required: false,
						displayOptions: {
							show: {
								'/operation': [
									'list'
								],
								'/resource': [
									'file',
								],
								corpora: [
									'drive'
								]
							},
						},
						description: 'ID of the shared drive to search. The driveId parameter must be specified if and only if corpora is set to drive.',
					},
				],
			},

		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			const options = this.getNodeParameter('options', i) as IDataObject;

			let queryFields = 'id, name';
			if (options && options.fields) {
				const fields = options.fields as string[];
				if (fields.includes('*')) {
					queryFields = '*';
				} else {
					queryFields = fields.join(', ');
				}
			}

			if (resource === 'file') {
				if (operation === 'copy') {
					// ----------------------------------
					//         copy
					// ----------------------------------

					const fileId = this.getNodeParameter('fileId', i) as string;

					const body: IDataObject = {
						fields: queryFields,
					};

					const optionProperties = ['name', 'parents'];
					for (const propertyName of optionProperties) {
						if (options[propertyName] !== undefined) {
							body[propertyName] = options[propertyName];
						}
					}

					const response = await googleApiRequest.call(this, 'POST', `/drive/v3/files/${fileId}/copy`, body);

					returnData.push(response as IDataObject);

				} else if (operation === 'download') {
					// ----------------------------------
					//         download
					// ----------------------------------

					const fileId = this.getNodeParameter('fileId', i) as string;

					const requestOptions = {
						resolveWithFullResponse: true,
						encoding: null,
						json: false,
					};

					const response = await googleApiRequest.call(this, 'GET', `/drive/v3/files/${fileId}`, {}, { alt: 'media' }, undefined, requestOptions);

					let mimeType: string | undefined;
					if (response.headers['content-type']) {
						mimeType = response.headers['content-type'];
					}

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

					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;

					const data = Buffer.from(response.body as string);

					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(data as unknown as Buffer, undefined, mimeType);

				} else if (operation === 'list') {
					// ----------------------------------
					//         list
					// ----------------------------------

					let querySpaces = '';
					if (options.spaces) {
						const spaces = options.spaces as string[];
						if (spaces.includes('*')) {
							querySpaces = 'appDataFolder, drive, photos';
						} else {
							querySpaces = spaces.join(', ');
						}
					}

					let queryCorpora = '';
					if (options.corpora) {
						queryCorpora = options.corpora as string;
					}

					let driveId: string | undefined;
					driveId = options.driveId as string;
					if (driveId === '') {
						driveId = undefined;
					}

					let queryString = '';
					const useQueryString = this.getNodeParameter('useQueryString', i) as boolean;
					if (useQueryString === true) {
						// Use the user defined query string
						queryString = this.getNodeParameter('queryString', i) as string;
					} else {
						// Build query string out of parameters set by user
						const queryFilters = this.getNodeParameter('queryFilters', i) as IDataObject;

						const queryFilterFields: string[] = [];
						if (queryFilters.name) {
							(queryFilters.name as IDataObject[]).forEach(nameFilter => {
								let operation = nameFilter.operation;
								if (operation === 'is') {
									operation = '=';
								} else if (operation === 'isNot') {
									operation = '!=';
								}
								queryFilterFields.push(`name ${operation} '${nameFilter.value}'`);
							});

							queryString += queryFilterFields.join(' or ');
						}

						queryFilterFields.length = 0;
						if (queryFilters.mimeType) {
							(queryFilters.mimeType as IDataObject[]).forEach(mimeTypeFilter => {
								let mimeType = mimeTypeFilter.mimeType;
								if (mimeTypeFilter.mimeType === 'custom') {
									mimeType = mimeTypeFilter.customMimeType;
								}
								queryFilterFields.push(`mimeType = '${mimeType}'`);
							});

							if (queryFilterFields.length) {
								if (queryString !== '') {
									queryString += ' and ';
								}

								queryString += queryFilterFields.join(' or ');
							}
						}
					}

					const pageSize = this.getNodeParameter('limit', i) as number;

					const qs = {
						pageSize,
						orderBy: 'modifiedTime',
						fields: `nextPageToken, files(${queryFields})`,
						spaces: querySpaces,
						q: queryString,
						includeItemsFromAllDrives: (queryCorpora !== '' || driveId !== ''),
						supportsAllDrives: (queryCorpora !== '' || driveId !== ''),
					};

					const response = await googleApiRequest.call(this, 'GET', `/drive/v3/files`, {}, qs);

					const files = response!.files;

					return [this.helpers.returnJsonArray(files as IDataObject[])];

				} else if (operation === 'upload') {
					// ----------------------------------
					//         upload
					// ----------------------------------

					let mimeType = 'text/plain';
					let body;
					let originalFilename: string | undefined;
					if (this.getNodeParameter('binaryData', i) === true) {
						// Is binary file to upload
						const item = items[i];

						if (item.binary === undefined) {
							throw new Error('No binary data exists on item!');
						}

						const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;

						if (item.binary[propertyNameUpload] === undefined) {
							throw new Error(`No binary data property "${propertyNameUpload}" does not exists on item!`);
						}

						if (item.binary[propertyNameUpload].mimeType) {
							mimeType = item.binary[propertyNameUpload].mimeType;
						}

						if (item.binary[propertyNameUpload].fileName) {
							originalFilename = item.binary[propertyNameUpload].fileName;
						}

						body = Buffer.from(item.binary[propertyNameUpload].data, BINARY_ENCODING);
					} else {
						// Is text file
						body = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8');
					}

					const name = this.getNodeParameter('name', i) as string;
					const parents = this.getNodeParameter('parents', i) as string[];

					let qs: IDataObject = {
						fields: queryFields,
						uploadType: 'media',
					};

					const requestOptions = {
						headers: {
							'Content-Type': mimeType,
							'Content-Length': body.byteLength,
						},
						encoding: null,
						json: false,
					};

					let response = await googleApiRequest.call(this, 'POST', `/upload/drive/v3/files`, body, qs, undefined, requestOptions);

					body = {
						mimeType,
						name,
						originalFilename,
					};

					qs = {
						addParents: parents.join(','),
					};

					response = await googleApiRequest.call(this, 'PATCH', `/drive/v3/files/${JSON.parse(response).id}`, body, qs);

					returnData.push(response as IDataObject);
				}

			} else if (resource === 'folder') {
				if (operation === 'create') {
					// ----------------------------------
					//         folder:create
					// ----------------------------------

					const name = this.getNodeParameter('name', i) as string;

					const body = {
						name,
						mimeType: 'application/vnd.google-apps.folder',
						parents: options.parents || [],
					};

					const qs = {
						fields: queryFields,
					};

					const response = await googleApiRequest.call(this, 'POST', '/drive/v3/files', body, qs);

					returnData.push(response as IDataObject);
				}
			}
			if (['file', 'folder'].includes(resource)) {
				if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					const fileId = this.getNodeParameter('fileId', i) as string;

					const response = await googleApiRequest.call(this, 'DELETE', `/drive/v3/files/${fileId}`);

					// If we are still here it did succeed
					returnData.push({
						fileId,
						success: true,
					});
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}
		}

		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			// For all other ones does the output items get replaced
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
