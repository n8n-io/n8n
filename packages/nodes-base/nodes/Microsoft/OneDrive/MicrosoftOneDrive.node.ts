import {
	IExecuteFunctions,
	BINARY_ENCODING,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IBinaryKeyData,
} from 'n8n-workflow';

import {
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from './GenericFunctions';

import {
	fileOperations,
	fileFields,
} from './FileDescription';

import {
	folderOperations,
	folderFields
} from './FolderDescriptiont';

export class MicrosoftOneDrive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft OneDrive',
		name: 'microsoftOneDrive',
		icon: 'file:oneDrive.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Microsoft OneDrive API.',
		defaults: {
			name: 'Microsoft OneDrive',
			color: '#1d4bab',
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
			...fileOperations,
			...fileFields,
			...folderOperations,
			...folderFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'file') {
				//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_copy?view=odsp-graph-online
				if (operation === 'copy') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const parentReference = this.getNodeParameter('parentReference', i) as IDataObject;
					const body: IDataObject = {};
					if (parentReference) {
						body.parentReference = { ...parentReference };
					}
					if (additionalFields.name) {
						body.name = additionalFields.name as string;
					}
					responseData = await microsoftApiRequest.call(this, 'POST', `/drive/items/${fileId}/copy`, body, {}, undefined, {}, { json: true, resolveWithFullResponse: true });
					responseData = { location : responseData.headers.location };
					returnData.push(responseData as IDataObject);
				}
				//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_delete?view=odsp-graph-online
				if (operation === 'delete') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					responseData = await microsoftApiRequest.call(this, 'DELETE', `/drive/items/${fileId}`);
					responseData = { success: true };
					returnData.push(responseData as IDataObject);
				}
				//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_list_children?view=odsp-graph-online
				if (operation === 'download') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;
					responseData = await microsoftApiRequest.call(this, 'GET', `/drive/items/${fileId}`);

					if (responseData.file === undefined) {
						throw new Error('The ID you provided does not belong to a file.');
					}

					responseData = await microsoftApiRequest.call(this, 'GET', `/drive/items/${fileId}/content`, {}, {}, undefined, {}, { encoding: null, resolveWithFullResponse: true });

					const newItem: INodeExecutionData = {
						json: items[i].json,
						binary: {},
					};

					let mimeType: string | undefined;
					if (responseData.headers['content-type']) {
						mimeType = responseData.headers['content-type'];
					}

					if (items[i].binary !== undefined) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						Object.assign(newItem.binary, items[i].binary);
					}

					items[i] = newItem;

					const data = Buffer.from(responseData.body);

					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(data as unknown as Buffer, undefined, mimeType);
				}
				//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_get?view=odsp-graph-online
				if (operation === 'get') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					responseData = await microsoftApiRequest.call(this, 'GET', `/drive/items/${fileId}`);
					returnData.push(responseData as IDataObject);
				}
				//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_search?view=odsp-graph-online
				if (operation === 'search') {
					const query = this.getNodeParameter('query', i) as string;
					responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/drive/root/search(q='{${query}}')`);
					responseData = responseData.filter((item: IDataObject) => item.file);
					returnData.push(responseData as IDataObject);
				}
				//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_put_content?view=odsp-graph-online#example-upload-a-new-file
				if (operation === 'upload') {
					const parentId = this.getNodeParameter('parentId', i) as string;
					const binaryData = this.getNodeParameter('binaryData', 0) as boolean;
					let fileName = this.getNodeParameter('fileName', 0) as string;

					if (binaryData) {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;

						if (items[i].binary === undefined) {
							throw new Error('No binary data exists on item!');
						}
						//@ts-ignore
						if (items[i].binary[binaryPropertyName] === undefined) {
							throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
						}

						const binaryData = (items[i].binary as IBinaryKeyData)[binaryPropertyName];

						if (fileName !== '') {
							fileName = `${fileName}.${binaryData.fileExtension}`;
						}

						const body = Buffer.from(binaryData.data, BINARY_ENCODING);
						responseData = await microsoftApiRequest.call(this, 'PUT', `/drive/items/${parentId}:/${fileName || binaryData.fileName}:/content`,  body , {}, undefined, { 'Content-Type': binaryData.mimeType, 'Content-length': body.length } );
						returnData.push(responseData as IDataObject);

					} else {
						const body = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8');
						if (fileName === '') {
							throw new Error('File name must be defined');
						}
						responseData = await microsoftApiRequest.call(this, 'PUT', `/drive/items/${parentId}:/${fileName}.txt:/content`,  body , {}, undefined, { 'Content-Type': 'text/plain' } );
						returnData.push(responseData as IDataObject);
					}
				}
			}
			if (resource === 'folder') {
				//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_list_children?view=odsp-graph-online
				if (operation === 'getChildren') {
					const folderId = this.getNodeParameter('folderId', i) as string;
					responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/drive/items/${folderId}/children`);
					returnData.push(responseData as IDataObject);
				}
				//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_search?view=odsp-graph-online
				if (operation === 'search') {
					const query = this.getNodeParameter('query', i) as string;
					responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/drive/root/search(q='{${query}}')`);
					responseData = responseData.filter((item: IDataObject) => item.folder);
					returnData.push(responseData as IDataObject);
				}
			}
		}
		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else if (responseData !== undefined) {
				returnData.push(responseData as IDataObject);
			}
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
