import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems } from '../transport';

import { v4 as uuid } from 'uuid';
import type { Readable } from 'stream';

import { UPLOAD_CHUNK_SIZE } from '../helpers/interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	for (let i = 0; i < items.length; i++) {
		try {
			const options = this.getNodeParameter('options', i, {});

			let queryFields = 'id, name';
			if (options?.fields) {
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

					const response = await googleApiRequest.call(this, 'POST', '/drive/v3/drives', body, {
						requestId: uuid(),
					});

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response as IDataObject[]),
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
						this.helpers.returnJsonArray(response as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
				if (operation === 'list') {
					// ----------------------------------
					//         list
					// ----------------------------------
					const returnAll = this.getNodeParameter('returnAll', i);

					const qs: IDataObject = {};

					let response: IDataObject[] = [];

					Object.assign(qs, options);

					if (returnAll) {
						response = await googleApiRequestAllItems.call(
							this,
							'drives',
							'GET',
							'/drive/v3/drives',
							{},
							qs,
						);
					} else {
						qs.pageSize = this.getNodeParameter('limit', i);
						const data = await googleApiRequest.call(this, 'GET', '/drive/v3/drives', {}, qs);
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
						this.helpers.returnJsonArray(response as IDataObject[]),
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
						this.helpers.returnJsonArray(response as IDataObject[]),
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
					const downloadOptions = this.getNodeParameter('options', i);

					const requestOptions = {
						useStream: true,
						resolveWithFullResponse: true,
						encoding: null,
						json: false,
					};

					const file = await googleApiRequest.call(
						this,
						'GET',
						`/drive/v3/files/${fileId}`,
						{},
						{ fields: 'mimeType,name', supportsTeamDrives: true },
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

					const mimeType = response.headers['content-type'] ?? file.mimeType ?? undefined;
					const fileName = downloadOptions.fileName ?? file.name ?? undefined;

					const newItem: INodeExecutionData = {
						json: items[i].json,
						binary: {},
					};

					if (items[i].binary !== undefined) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						Object.assign(newItem.binary as IBinaryKeyData, items[i].binary);
					}

					items[i] = newItem;

					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);

					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
						response.body as unknown as Readable,
						fileName as string,
						mimeType as string,
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
					if (useQueryString) {
						// Use the user defined query string
						queryString = this.getNodeParameter('queryString', i) as string;
					} else {
						// Build query string out of parameters set by user
						const queryFilters = this.getNodeParameter('queryFilters', i) as IDataObject;

						const queryFilterFields: string[] = [];
						if (queryFilters.name) {
							(queryFilters.name as IDataObject[]).forEach((nameFilter) => {
								let filterOperation = nameFilter.operation;
								if (filterOperation === 'is') {
									filterOperation = '=';
								} else if (filterOperation === 'isNot') {
									filterOperation = '!=';
								}
								queryFilterFields.push(`name ${filterOperation} '${nameFilter.value}'`);
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

					const pageSize = this.getNodeParameter('limit', i);

					const qs = {
						pageSize,
						orderBy: 'modifiedTime',
						fields: `nextPageToken, files(${queryFields})`,
						spaces: querySpaces,
						q: queryString,
						includeItemsFromAllDrives: queryCorpora !== '' || driveId !== '',
						supportsAllDrives: queryCorpora !== '' || driveId !== '',
					};

					const response = await googleApiRequest.call(this, 'GET', '/drive/v3/files', {}, qs);

					const files = response.files;

					const version = this.getNode().typeVersion;

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(files as IDataObject[]),
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
					const resolveData = this.getNodeParameter('resolveData', 0);

					let contentLength: number;
					let fileContent: Buffer | Readable;
					let originalFilename: string | undefined;
					let mimeType = 'text/plain';

					if (this.getNodeParameter('binaryData', i)) {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						if (binaryData.id) {
							// Stream data in 256KB chunks, and upload the via the resumable upload api
							fileContent = this.helpers.getBinaryStream(binaryData.id, UPLOAD_CHUNK_SIZE);
							const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
							contentLength = metadata.fileSize;
							originalFilename = metadata.fileName;
							if (metadata.mimeType) mimeType = binaryData.mimeType;
						} else {
							fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
							contentLength = fileContent.length;
							originalFilename = binaryData.fileName;
							mimeType = binaryData.mimeType;
						}
					} else {
						// Is text file
						fileContent = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8');
						contentLength = fileContent.byteLength;
					}

					const name = this.getNodeParameter('name', i) as string;
					const parents = this.getNodeParameter('parents', i) as string[];

					let uploadId;
					if (Buffer.isBuffer(fileContent)) {
						const response = await googleApiRequest.call(
							this,
							'POST',
							'/upload/drive/v3/files',
							fileContent,
							{
								fields: queryFields,
								uploadType: 'media',
							},
							undefined,
							{
								headers: {
									'Content-Type': mimeType,
									'Content-Length': contentLength,
								},
								encoding: null,
								json: false,
							},
						);
						uploadId = JSON.parse(response as string).id;
					} else {
						const resumableUpload = await googleApiRequest.call(
							this,
							'POST',
							'/upload/drive/v3/files',
							undefined,
							{ uploadType: 'resumable' },
							undefined,
							{
								resolveWithFullResponse: true,
							},
						);
						const uploadUrl = resumableUpload.headers.location;

						let offset = 0;
						for await (const chunk of fileContent) {
							const nextOffset = offset + Number(chunk.length);
							try {
								const response = await this.helpers.httpRequest({
									method: 'PUT',
									url: uploadUrl,
									headers: {
										'Content-Length': chunk.length,
										'Content-Range': `bytes ${offset}-${nextOffset - 1}/${contentLength}`,
									},
									body: chunk,
								});
								uploadId = response.id;
							} catch (error) {
								if (error.response?.status !== 308) throw error;
							}
							offset = nextOffset;
						}
					}

					const requestBody = {
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
						Object.assign(requestBody, {
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
						Object.assign(requestBody, {
							appProperties: appProperties.reduce(
								(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
								{},
							),
						});
					}

					let response = await googleApiRequest.call(
						this,
						'PATCH',
						`/drive/v3/files/${uploadId}`,
						requestBody,
						{
							addParents: parents.join(','),
							// When set to true shared drives can be used.
							supportsAllDrives: true,
						},
					);

					if (resolveData) {
						response = await googleApiRequest.call(
							this,
							'GET',
							`/drive/v3/files/${response.id}`,
							{},
							{ fields: '*' },
						);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response as IDataObject[]),
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
					const updateFields = this.getNodeParameter('updateFields', i, {});

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
						this.helpers.returnJsonArray(responseData as IDataObject[]),
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
						this.helpers.returnJsonArray(response as IDataObject[]),
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

					const fileId = this.getNodeParameter('fileId', i, undefined, {
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
					const fileId = this.getNodeParameter('fileId', i, undefined, {
						extractValue: true,
					}) as string;

					const permissions = this.getNodeParameter('permissionsUi', i) as IDataObject;

					const shareOption = this.getNodeParameter('options', i);

					const body: IDataObject = {};

					const qs: IDataObject = {
						supportsTeamDrives: true,
					};

					if (permissions.permissionsValues) {
						Object.assign(body, permissions.permissionsValues);
					}

					Object.assign(qs, shareOption);

					const response = await googleApiRequest.call(
						this,
						'POST',
						`/drive/v3/files/${fileId}/permissions`,
						body,
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response as IDataObject[]),
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
