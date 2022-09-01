import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems } from '../GenericFunctions';

import { v4 as uuid } from 'uuid';
import { versionDescription } from './VersionDescription';

interface GoogleDriveFilesItem {
	id: string;
	name: string;
	mimeType: string;
	webViewLink: string;
}

interface GoogleDriveDriveItem {
	id: string;
	name: string;
}

export class GoogleDriveV3 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		listSearch: {
			async fileSearch(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const res = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, {
					q: filter ? `name contains '${filter.replace("'", "\\'")}'` : undefined,
					pageToken: paginationToken as string | undefined,
					fields: 'nextPageToken,files(id,name,mimeType,webViewLink)',
					orderBy: 'name_natural',
				});
				return {
					results: res.files.map((i: GoogleDriveFilesItem) => ({
						name: i.name,
						value: i.id,
						url: i.webViewLink,
					})),
					paginationToken: res.nextPageToken,
				};
			},
			async folderSearch(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const res = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, {
					q: filter
						? `name contains '${filter.replace(
								"'",
								"\\'",
								// tslint:disable-next-line: indent
						  )}' and mimeType = 'application/vnd.google-apps.folder'`
						: undefined,
					pageToken: paginationToken as string | undefined,
					fields: 'nextPageToken,files(id,name,mimeType,webViewLink)',
					orderBy: 'name_natural',
				});
				return {
					results: res.files.map((i: GoogleDriveFilesItem) => ({
						name: i.name,
						value: i.id,
						url: i.webViewLink,
					})),
					paginationToken: res.nextPageToken,
				};
			},
			async driveSearch(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const res = await googleApiRequest.call(this, 'GET', '/drive/v3/drives', undefined, {
					q: filter ? `name contains '${filter.replace("'", "\\'")}'` : undefined,
					pageToken: paginationToken as string | undefined,
				});
				return {
					results: res.drives.map((i: GoogleDriveDriveItem) => ({
						name: i.name,
						value: i.id,
					})),
					paginationToken: res.nextPageToken,
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const options = this.getNodeParameter('options', i, {}) as IDataObject;

				let queryFields = 'id, name';
				if (options && options.fields) {
					const fields = options.fields as string[];
					if (fields.includes('*')) {
						queryFields = '*';
					} else {
						queryFields = fields.join(', ');
					}
				}

				if (resource === 'drive') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						const name = this.getNodeParameter('name', i) as string;

						const body: IDataObject = {
							name,
						};

						Object.assign(body, options);

						const response = await googleApiRequest.call(this, 'POST', `/drive/v3/drives`, body, {
							requestId: uuid(),
						});

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
					if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						const driveId = this.getNodeParameter('driveId', i, undefined, {
							extractValue: true,
						}) as string;

						await googleApiRequest.call(this, 'DELETE', `/drive/v3/drives/${driveId}`);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: true }),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						const driveId = this.getNodeParameter('driveId', i, undefined, {
							extractValue: true,
						}) as string;

						const qs: IDataObject = {};

						Object.assign(qs, options);

						const response = await googleApiRequest.call(
							this,
							'GET',
							`/drive/v3/drives/${driveId}`,
							{},
							qs,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
					if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const qs: IDataObject = {};

						let response: IDataObject[] = [];

						Object.assign(qs, options);

						if (returnAll === true) {
							response = await googleApiRequestAllItems.call(
								this,
								'drives',
								'GET',
								`/drive/v3/drives`,
								{},
								qs,
							);
						} else {
							qs.pageSize = this.getNodeParameter('limit', i) as number;
							const data = await googleApiRequest.call(this, 'GET', `/drive/v3/drives`, {}, qs);
							response = data.drives as IDataObject[];
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
					if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						const driveId = this.getNodeParameter('driveId', i, undefined, {
							extractValue: true,
						}) as string;

						const body: IDataObject = {};

						Object.assign(body, options);

						const response = await googleApiRequest.call(
							this,
							'PATCH',
							`/drive/v3/drives/${driveId}`,
							body,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
				}
				if (resource === 'file') {
					if (operation === 'copy') {
						// ----------------------------------
						//         copy
						// ----------------------------------

						const fileId = this.getNodeParameter('fileId', i, undefined, {
							extractValue: true,
						}) as string;

						const body: IDataObject = {
							fields: queryFields,
						};

						const optionProperties = ['name', 'parents'];
						for (const propertyName of optionProperties) {
							if (options[propertyName] !== undefined) {
								body[propertyName] = options[propertyName];
							}
						}

						const qs = {
							supportsAllDrives: true,
						};

						const response = await googleApiRequest.call(
							this,
							'POST',
							`/drive/v3/files/${fileId}/copy`,
							body,
							qs,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					} else if (operation === 'download') {
						// ----------------------------------
						//         download
						// ----------------------------------

						const fileId = this.getNodeParameter('fileId', i, undefined, {
							extractValue: true,
						}) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						const requestOptions = {
							resolveWithFullResponse: true,
							encoding: null,
							json: false,
						};

						const file = await googleApiRequest.call(
							this,
							'GET',
							`/drive/v3/files/${fileId}`,
							{},
							{ fields: 'mimeType', supportsTeamDrives: true },
						);
						let response;

						if (file.mimeType.includes('vnd.google-apps')) {
							const parameterKey = 'options.googleFileConversion.conversion';
							const type = file.mimeType.split('.')[2];
							let mime;
							if (type === 'document') {
								mime = this.getNodeParameter(
									`${parameterKey}.docsToFormat`,
									i,
									'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
								) as string;
							} else if (type === 'presentation') {
								mime = this.getNodeParameter(
									`${parameterKey}.slidesToFormat`,
									i,
									'application/vnd.openxmlformats-officedocument.presentationml.presentation',
								) as string;
							} else if (type === 'spreadsheet') {
								mime = this.getNodeParameter(
									`${parameterKey}.sheetsToFormat`,
									i,
									'application/x-vnd.oasis.opendocument.spreadsheet',
								) as string;
							} else {
								mime = this.getNodeParameter(
									`${parameterKey}.drawingsToFormat`,
									i,
									'image/jpeg',
								) as string;
							}
							response = await googleApiRequest.call(
								this,
								'GET',
								`/drive/v3/files/${fileId}/export`,
								{},
								{ mimeType: mime },
								undefined,
								requestOptions,
							);
						} else {
							response = await googleApiRequest.call(
								this,
								'GET',
								`/drive/v3/files/${fileId}`,
								{},
								{ alt: 'media' },
								undefined,
								requestOptions,
							);
						}

						let mimeType: string | undefined;
						let fileName: string | undefined = undefined;
						if (response.headers['content-type']) {
							mimeType = response.headers['content-type'];
						}

						if (options.fileName) {
							fileName = options.fileName as string;
						}

						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
						};

						if (items[i].binary !== undefined) {
							// Create a shallow copy of the binary data so that the old
							// data references which do not get changed still stay behind
							// but the incoming data does not get changed.
							// @ts-ignore
							Object.assign(newItem.binary, items[i].binary);
						}

						items[i] = newItem;

						const dataPropertyNameDownload = this.getNodeParameter(
							'binaryPropertyName',
							i,
						) as string;

						const data = Buffer.from(response.body as string);

						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							data as unknown as Buffer,
							fileName,
							mimeType,
						);
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
								(queryFilters.name as IDataObject[]).forEach((nameFilter) => {
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
								(queryFilters.mimeType as IDataObject[]).forEach((mimeTypeFilter) => {
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
							includeItemsFromAllDrives: queryCorpora !== '' || driveId !== '',
							supportsAllDrives: queryCorpora !== '' || driveId !== '',
						};

						const response = await googleApiRequest.call(this, 'GET', `/drive/v3/files`, {}, qs);

						const files = response!.files;

						const version = this.getNode().typeVersion;

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(files),
							{ itemData: { item: i } },
						);

						if (version === 1) {
							return [executionData];
						}

						returnData.push(...executionData);
					} else if (operation === 'upload') {
						// ----------------------------------
						//         upload
						// ----------------------------------
						const resolveData = this.getNodeParameter('resolveData', 0) as boolean;

						let mimeType = 'text/plain';
						let body;
						let originalFilename: string | undefined;
						if (this.getNodeParameter('binaryData', i) === true) {
							// Is binary file to upload
							const item = items[i];

							if (item.binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
									itemIndex: i,
								});
							}

							const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;

							if (item.binary[propertyNameUpload] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No binary data property "${propertyNameUpload}" does not exists on item!`,
									{ itemIndex: i },
								);
							}

							if (item.binary[propertyNameUpload].mimeType) {
								mimeType = item.binary[propertyNameUpload].mimeType;
							}

							if (item.binary[propertyNameUpload].fileName) {
								originalFilename = item.binary[propertyNameUpload].fileName;
							}

							body = await this.helpers.getBinaryDataBuffer(i, propertyNameUpload);
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

						let response = await googleApiRequest.call(
							this,
							'POST',
							`/upload/drive/v3/files`,
							body,
							qs,
							undefined,
							requestOptions,
						);

						body = {
							mimeType,
							name,
							originalFilename,
						};

						const properties = this.getNodeParameter(
							'options.propertiesUi.propertyValues',
							i,
							[],
						) as IDataObject[];

						if (properties.length) {
							Object.assign(body, {
								properties: properties.reduce(
									(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
									{},
								),
							});
						}

						const appProperties = this.getNodeParameter(
							'options.appPropertiesUi.appPropertyValues',
							i,
							[],
						) as IDataObject[];

						if (properties.length) {
							Object.assign(body, {
								appProperties: appProperties.reduce(
									(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
									{},
								),
							});
						}

						qs = {
							addParents: parents.join(','),
							// When set to true shared drives can be used.
							supportsAllDrives: true,
						};

						response = await googleApiRequest.call(
							this,
							'PATCH',
							`/drive/v3/files/${JSON.parse(response).id}`,
							body,
							qs,
						);

						if (resolveData === true) {
							response = await googleApiRequest.call(
								this,
								'GET',
								`/drive/v3/files/${response.id}`,
								{},
								{ fields: '*' },
							);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'update') {
						// ----------------------------------
						//         file:update
						// ----------------------------------

						const id = this.getNodeParameter('fileId', i, undefined, {
							extractValue: true,
						}) as string;
						const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

						const qs: IDataObject = {
							supportsAllDrives: true,
						};

						Object.assign(qs, options);

						qs.fields = queryFields;

						const body: IDataObject = {};

						if (updateFields.fileName) {
							body.name = updateFields.fileName;
						}

						if (updateFields.hasOwnProperty('trashed')) {
							body.trashed = updateFields.trashed;
						}

						if (updateFields.parentId && updateFields.parentId !== '') {
							qs.addParents = updateFields.parentId;
						}

						const responseData = await googleApiRequest.call(
							this,
							'PATCH',
							`/drive/v3/files/${id}`,
							body,
							qs,
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
				if (resource === 'folder') {
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
							supportsAllDrives: true,
						};

						const response = await googleApiRequest.call(this, 'POST', '/drive/v3/files', body, qs);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
				if (['file', 'folder'].includes(resource)) {
					if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						const fileId = this.getNodeParameter('fileOrFolderId', i, undefined, {
							extractValue: true,
						}) as string;

						await googleApiRequest.call(
							this,
							'DELETE',
							`/drive/v3/files/${fileId}`,
							{},
							{ supportsTeamDrives: true },
						);

						// If we are still here it did succeed
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({
								fileId,
								success: true,
							}),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
					if (operation === 'share') {
						const fileId = this.getNodeParameter('fileOrFolderId', i, undefined, {
							extractValue: true,
						}) as string;

						const permissions = this.getNodeParameter('permissionsUi', i) as IDataObject;

						const options = this.getNodeParameter('options', i) as IDataObject;

						const body: IDataObject = {};

						const qs: IDataObject = {
							supportsTeamDrives: true,
						};

						if (permissions.permissionsValues) {
							Object.assign(body, permissions.permissionsValues);
						}

						Object.assign(qs, options);

						const response = await googleApiRequest.call(
							this,
							'POST',
							`/drive/v3/files/${fileId}/permissions`,
							body,
							qs,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					if (resource === 'file' && operation === 'download') {
						items[i].json = { error: error.message };
					} else {
						returnData.push({ json: { error: error.message } });
					}
					continue;
				}
				throw error;
			}
		}
		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			// For all other ones does the output items get replaced
			return this.prepareOutputData(returnData);
		}
	}
}
