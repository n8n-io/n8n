import type { IExecuteFunctions } from 'n8n-core';

import type {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { microsoftApiRequest, microsoftApiRequestAllItems } from './GenericFunctions';

import { fileFields, fileOperations } from './FileDescription';

import { folderFields, folderOperations } from './FolderDescription';

export class MicrosoftOneDrive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft OneDrive',
		name: 'microsoftOneDrive',
		icon: 'file:oneDrive.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Microsoft OneDrive API',
		defaults: {
			name: 'Microsoft OneDrive',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftOneDriveOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
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
			},
			...fileOperations,
			...fileFields,
			...folderOperations,
			...folderFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'file') {
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_copy?view=odsp-graph-online
					if (operation === 'copy') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const parentReference = this.getNodeParameter('parentReference', i) as IDataObject;
						const body: IDataObject = {};
						if (parentReference) {
							body.parentReference = { ...parentReference };
						}
						if (additionalFields.name) {
							body.name = additionalFields.name as string;
						}
						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/drive/items/${fileId}/copy`,
							body,
							{},
							undefined,
							{},
							{ json: true, resolveWithFullResponse: true },
						);
						responseData = { location: responseData.headers.location };
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_delete?view=odsp-graph-online
					if (operation === 'delete') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						responseData = await microsoftApiRequest.call(this, 'DELETE', `/drive/items/${fileId}`);
						responseData = { success: true };
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_list_children?view=odsp-graph-online
					if (operation === 'download') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);
						responseData = await microsoftApiRequest.call(this, 'GET', `/drive/items/${fileId}`);

						const fileName = responseData.name;

						if (responseData.file === undefined) {
							throw new NodeApiError(this.getNode(), responseData, {
								message: 'The ID you provided does not belong to a file.',
							});
						}

						let mimeType: string | undefined;
						if (responseData.file.mimeType) {
							mimeType = responseData.file.mimeType;
						}

						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/drive/items/${fileId}/content`,
							{},
							{},
							undefined,
							{},
							{ encoding: null, resolveWithFullResponse: true },
						);

						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
						};

						if (mimeType === undefined && responseData.headers['content-type']) {
							mimeType = responseData.headers['content-type'];
						}

						if (items[i].binary !== undefined) {
							// Create a shallow copy of the binary data so that the old
							// data references which do not get changed still stay behind
							// but the incoming data does not get changed.
							Object.assign(newItem.binary!, items[i].binary);
						}

						items[i] = newItem;

						const data = Buffer.from(responseData.body);

						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							data as unknown as Buffer,
							fileName,
							mimeType,
						);
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_get?view=odsp-graph-online
					if (operation === 'get') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						responseData = await microsoftApiRequest.call(this, 'GET', `/drive/items/${fileId}`);
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_search?view=odsp-graph-online
					if (operation === 'search') {
						const query = this.getNodeParameter('query', i) as string;
						responseData = await microsoftApiRequestAllItems.call(
							this,
							'value',
							'GET',
							`/drive/root/search(q='${query}')`,
						);
						responseData = responseData.filter((item: IDataObject) => item.file);
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_createlink?view=odsp-graph-online
					if (operation === 'share') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						const type = this.getNodeParameter('type', i) as string;
						const scope = this.getNodeParameter('scope', i) as string;
						const body: IDataObject = {
							type,
							scope,
						};
						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/drive/items/${fileId}/createLink`,
							body,
						);
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_put_content?view=odsp-graph-online#example-upload-a-new-file
					if (operation === 'upload') {
						const parentId = this.getNodeParameter('parentId', i) as string;
						const isBinaryData = this.getNodeParameter('binaryData', i);
						const fileName = this.getNodeParameter('fileName', i) as string;

						if (isBinaryData) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0);

							if (items[i].binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
									itemIndex: i,
								});
							}
							//@ts-ignore
							if (items[i].binary[binaryPropertyName] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No binary data property "${binaryPropertyName}" does not exists on item!`,
									{ itemIndex: i },
								);
							}

							const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];
							const body = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
							let encodedFilename;

							if (fileName !== '') {
								encodedFilename = encodeURIComponent(fileName);
							}

							if (binaryData.fileName !== undefined) {
								encodedFilename = encodeURIComponent(binaryData.fileName);
							}

							responseData = await microsoftApiRequest.call(
								this,
								'PUT',
								`/drive/items/${parentId}:/${encodedFilename}:/content`,
								body,
								{},
								undefined,
								{ 'Content-Type': binaryData.mimeType, 'Content-length': body.length },
								{},
							);

							responseData = JSON.parse(responseData);
						} else {
							const body = this.getNodeParameter('fileContent', i) as string;
							if (fileName === '') {
								throw new NodeOperationError(this.getNode(), 'File name must be set!', {
									itemIndex: i,
								});
							}
							const encodedFilename = encodeURIComponent(fileName);
							responseData = await microsoftApiRequest.call(
								this,
								'PUT',
								`/drive/items/${parentId}:/${encodedFilename}:/content`,
								body,
								{},
								undefined,
								{ 'Content-Type': 'text/plain' },
							);
						}
					}
				}
				if (resource === 'folder') {
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_post_children?view=odsp-graph-online
					if (operation === 'create') {
						const names = (this.getNodeParameter('name', i) as string)
							.split('/')
							.filter((s) => s.trim() !== '');
						const options = this.getNodeParameter('options', i);
						let parentFolderId = options.parentFolderId ? options.parentFolderId : null;
						for (const name of names) {
							const body: IDataObject = {
								name,
								folder: {},
							};
							let endpoint = '/drive/root/children';
							if (parentFolderId) {
								endpoint = `/drive/items/${parentFolderId}/children`;
							}
							responseData = await microsoftApiRequest.call(this, 'POST', endpoint, body);
							if (!responseData.id) {
								break;
							}
							parentFolderId = responseData.id;
						}
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_delete?view=odsp-graph-online
					if (operation === 'delete') {
						const folderId = this.getNodeParameter('folderId', i) as string;
						responseData = await microsoftApiRequest.call(
							this,
							'DELETE',
							`/drive/items/${folderId}`,
						);
						responseData = { success: true };
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_list_children?view=odsp-graph-online
					if (operation === 'getChildren') {
						const folderId = this.getNodeParameter('folderId', i) as string;
						responseData = await microsoftApiRequestAllItems.call(
							this,
							'value',
							'GET',
							`/drive/items/${folderId}/children`,
						);
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_search?view=odsp-graph-online
					if (operation === 'search') {
						const query = this.getNodeParameter('query', i) as string;
						responseData = await microsoftApiRequestAllItems.call(
							this,
							'value',
							'GET',
							`/drive/root/search(q='${query}')`,
						);
						responseData = responseData.filter((item: IDataObject) => item.folder);
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_createlink?view=odsp-graph-online
					if (operation === 'share') {
						const folderId = this.getNodeParameter('folderId', i) as string;
						const type = this.getNodeParameter('type', i) as string;
						const scope = this.getNodeParameter('scope', i) as string;
						const body: IDataObject = {
							type,
							scope,
						};
						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/drive/items/${folderId}/createLink`,
							body,
						);
					}
				}
				if (resource === 'file' || resource === 'folder') {
					if (operation === 'rename') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const newName = this.getNodeParameter('newName', i) as string;
						const body = { name: newName };
						responseData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/drive/items/${itemId}`,
							body,
						);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					if (resource === 'file' && operation === 'download') {
						items[i].json = { error: error.message };
					} else {
						const executionErrorData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ error: error.message }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionErrorData);
					}
					continue;
				}
				throw error;
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}
		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		}

		return this.prepareOutputData(returnData);
	}
}
