import { IncomingMessage } from 'http';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { targetDescription } from './descriptions/TargetDescription';
import { fileFields, fileOperations } from './FileDescription';
import { folderFields, folderOperations } from './FolderDescription';
import {
	getOneDriveCredentialType,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
	resolveDriveScopeRoot,
	validateOneDriveFileName,
} from './GenericFunctions';

export class MicrosoftOneDrive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft OneDrive',
		name: 'microsoftOneDrive',
		icon: 'file:oneDrive.svg',
		group: ['input'],
		version: [1, 1.1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Microsoft OneDrive API',
		schemaPath: 'Microsoft/OneDrive',
		defaults: {
			name: 'Microsoft OneDrive',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'microsoftOneDriveOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftOneDriveOAuth2Api'],
					},
				},
			},
			{
				name: 'microsoftOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftOAuth2Api'],
					},
				},
			},
			{
				name: 'microsoftEntraServicePrincipalApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftEntraServicePrincipalApi'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'OneDrive OAuth2',
						value: 'microsoftOneDriveOAuth2Api',
					},
					{
						name: 'Microsoft OAuth2 (Graph)',
						value: 'microsoftOAuth2Api',
						description:
							'Generic Microsoft Graph credential. Enable the scopes this node needs (e.g. Files.ReadWrite.All) on the credential.',
					},
					{
						name: 'Microsoft Entra Service Principal (App-Only)',
						value: 'microsoftEntraServicePrincipalApi',
						description:
							'App-only access via a Microsoft Entra app registration. Choose which user or drive to act on under "Access As".',
					},
				],
				default: 'microsoftOneDriveOAuth2Api',
			},
			...targetDescription,
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
		const nodeVersion = this.getNode().typeVersion;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		// The target (user/drive) is per-node, not per-item, so resolve the app-only
		// scope root once before the loop. `undefined` for OAuth2 (uses /me).
		const credentialType = getOneDriveCredentialType.call(this);
		const isServicePrincipal = credentialType === 'microsoftEntraServicePrincipalApi';
		const driveScopeRoot = resolveDriveScopeRoot.call(this, false);

		// Copy/Move under app-only need the destination drive. Resolving it can cost a
		// `GET /<root>/drive?$select=id`, so resolve lazily and cache for the whole run.
		let resolvedDestinationDriveId: string | undefined;
		const resolveDestinationDriveId = async (
			providedDriveId: string,
			itemIndex: number,
		): Promise<string | undefined> => {
			// Explicit destination drive (any auth) wins — supports cross-drive moves.
			if (providedDriveId) return providedDriveId;
			// OAuth2: omit to move within the signed-in user's drive (same-drive).
			if (!driveScopeRoot) return undefined;
			// SP + `Access As: Drive` — the target id IS the destination drive id, so
			// use it directly (no `GET …/drive` round-trip is needed to discover it).
			const target = this.getNodeParameter('resourceTarget', itemIndex, 'user') as string;
			if (target === 'drive') {
				return this.getNodeParameter(`${target}Target`, itemIndex, '', {
					extractValue: true,
				}) as string;
			}
			// SP + user: resolve the default drive once and cache it.
			if (resolvedDestinationDriveId === undefined) {
				const drive = (await microsoftApiRequest.call(
					this,
					'GET',
					'/drive',
					{},
					{ $select: 'id' },
					undefined,
					{},
					{ json: true },
					driveScopeRoot,
				)) as IDataObject;
				const driveId = typeof drive?.id === 'string' ? drive.id : '';
				if (!driveId) {
					throw new NodeOperationError(
						this.getNode(),
						'Could not resolve a destination Drive ID for the app-only copy/move',
						{
							itemIndex,
							description:
								"Set a destination Drive ID — app-only Microsoft Graph can't target a personal (/me) drive.",
						},
					);
				}
				resolvedDestinationDriveId = driveId;
			}
			return resolvedDestinationDriveId;
		};

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
						// App-only Graph has no /me, so a destination drive id is required.
						if (isServicePrincipal) {
							const providedDriveId =
								typeof parentReference?.driveId === 'string' ? parentReference.driveId : '';
							const destinationDriveId = await resolveDestinationDriveId(providedDriveId, i);
							if (destinationDriveId) {
								body.parentReference = {
									...(body.parentReference as IDataObject),
									driveId: destinationDriveId,
								};
							}
						}
						// Encode the path-interpolated item id (same as upload/move): it keeps
						// any `/ : ? #` in the id from changing which item the URL addresses.
						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/drive/items/${encodeURIComponent(fileId)}/copy`,
							body,
							{},
							undefined,
							{},
							{ json: true, resolveWithFullResponse: true },
							driveScopeRoot,
						);
						responseData = { location: responseData.headers.location };
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_delete?view=odsp-graph-online
					if (operation === 'delete') {
						const fileId = encodeURIComponent(this.getNodeParameter('fileId', i) as string);
						responseData = await microsoftApiRequest.call(
							this,
							'DELETE',
							`/drive/items/${fileId}`,
							{},
							{},
							undefined,
							{},
							{ json: true },
							driveScopeRoot,
						);
						responseData = { success: true };
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_list_children?view=odsp-graph-online
					if (operation === 'download') {
						const fileId = encodeURIComponent(this.getNodeParameter('fileId', i) as string);
						const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/drive/items/${fileId}`,
							{},
							{},
							undefined,
							{},
							{ json: true },
							driveScopeRoot,
						);

						const fileName = responseData.name;
						const downloadUrl = responseData['@microsoft.graph.downloadUrl'];

						if (responseData.file === undefined) {
							throw new NodeApiError(this.getNode(), responseData as JsonObject, {
								message: 'The ID you provided does not belong to a file.',
							});
						}

						let mimeType: string | undefined;
						if (responseData.file.mimeType) {
							mimeType = responseData.file.mimeType;
						}

						try {
							responseData = await microsoftApiRequest.call(
								this,
								'GET',
								`/drive/items/${fileId}/content`,
								{},
								{},
								undefined,
								{},
								{ encoding: null, resolveWithFullResponse: true },
								driveScopeRoot,
							);
						} catch (error) {
							// `@microsoft.graph.downloadUrl` is an absolute, pre-signed Graph URL —
							// scope-independent, so it is fetched verbatim (never threaded through
							// the scope root) and behaves identically across credential types.
							if (downloadUrl) {
								responseData = await this.helpers.httpRequest({
									method: 'GET',
									url: downloadUrl,
									returnFullResponse: true,
									encoding: 'arraybuffer',
									json: false,
								});
							}
						}

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

						let data;
						if (responseData?.body instanceof IncomingMessage) {
							data = responseData.body;
						} else {
							data = Buffer.from(responseData.body as Buffer);
						}

						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							data,
							fileName as string,
							mimeType,
						);
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_get?view=odsp-graph-online
					if (operation === 'get') {
						const fileId = encodeURIComponent(this.getNodeParameter('fileId', i) as string);
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/drive/items/${fileId}`,
							{},
							{},
							undefined,
							{},
							{ json: true },
							driveScopeRoot,
						);
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_search?view=odsp-graph-online
					if (operation === 'search') {
						if (isServicePrincipal) {
							throw new NodeOperationError(
								this.getNode(),
								'Search is not supported with the Service Principal credential',
								{
									itemIndex: i,
									description:
										'App-only Microsoft Graph cannot search a drive. Use File: Get, or an OAuth2 credential.',
								},
							);
						}
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
						const fileId = encodeURIComponent(this.getNodeParameter('fileId', i) as string);
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
							{},
							undefined,
							{},
							{ json: true },
							driveScopeRoot,
						);
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_put_content?view=odsp-graph-online#example-upload-a-new-file
					if (operation === 'upload') {
						const parentId = this.getNodeParameter('parentId', i) as string;
						// Encode the parent ID before interpolating it into the Graph `:/path:/`
						// URL — like the file name, an unescaped `/ : ? #` here would retarget
						// the request to a different item/endpoint.
						const encodedParentId = encodeURIComponent(parentId);
						const isBinaryData = this.getNodeParameter('binaryData', i);
						const fileName = this.getNodeParameter('fileName', i) as string;

						if (isBinaryData) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0);
							const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

							// Resolve the effective file name following each version's precedence:
							// v1.1+ prefers the explicit File Name and falls back to the binary
							// file name; v1 lets the binary file name overwrite the parameter.
							let resolvedFileName: string | undefined;
							if (nodeVersion >= 1.1) {
								if (fileName !== '') {
									resolvedFileName = fileName;
								} else if (binaryData.fileName !== undefined) {
									resolvedFileName = binaryData.fileName;
								}
							} else {
								if (fileName !== '') {
									resolvedFileName = fileName;
								}

								if (binaryData.fileName !== undefined) {
									resolvedFileName = binaryData.fileName;
								}
							}

							validateOneDriveFileName(this.getNode(), resolvedFileName, i);

							const body = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
							const encodedFilename = encodeURIComponent(resolvedFileName);

							responseData = await microsoftApiRequest.call(
								this,
								'PUT',
								`/drive/items/${encodedParentId}:/${encodedFilename}:/content`,
								body,
								{},
								undefined,
								{ 'Content-Type': binaryData.mimeType, 'Content-length': body.length },
								{},
								driveScopeRoot,
							);

							responseData = JSON.parse(responseData as string);
						} else {
							const body = this.getNodeParameter('fileContent', i) as string;
							validateOneDriveFileName(this.getNode(), fileName, i);
							const encodedFilename = encodeURIComponent(fileName);
							responseData = await microsoftApiRequest.call(
								this,
								'PUT',
								`/drive/items/${encodedParentId}:/${encodedFilename}:/content`,
								body,
								{},
								undefined,
								{ 'Content-Type': 'text/plain' },
								{ json: true },
								driveScopeRoot,
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
								endpoint = `/drive/items/${encodeURIComponent(parentFolderId as string)}/children`;
							}
							responseData = await microsoftApiRequest.call(
								this,
								'POST',
								endpoint,
								body,
								{},
								undefined,
								{},
								{ json: true },
								driveScopeRoot,
							);
							if (!responseData.id) {
								break;
							}
							parentFolderId = responseData.id;
						}
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_delete?view=odsp-graph-online
					if (operation === 'delete') {
						const folderId = encodeURIComponent(this.getNodeParameter('folderId', i) as string);
						responseData = await microsoftApiRequest.call(
							this,
							'DELETE',
							`/drive/items/${folderId}`,
							{},
							{},
							undefined,
							{},
							{ json: true },
							driveScopeRoot,
						);
						responseData = { success: true };
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_list_children?view=odsp-graph-online
					if (operation === 'getChildren') {
						const folderId = encodeURIComponent(this.getNodeParameter('folderId', i) as string);
						responseData = await microsoftApiRequestAllItems.call(
							this,
							'value',
							'GET',
							`/drive/items/${folderId}/children`,
							{},
							{},
							driveScopeRoot,
						);
					}
					//https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_search?view=odsp-graph-online
					if (operation === 'search') {
						if (isServicePrincipal) {
							throw new NodeOperationError(
								this.getNode(),
								'Search is not supported with the Service Principal credential',
								{
									itemIndex: i,
									description:
										'App-only Microsoft Graph cannot search a drive. Use Folder: Get Children, or an OAuth2 credential.',
								},
							);
						}
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
						const folderId = encodeURIComponent(this.getNodeParameter('folderId', i) as string);
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
							{},
							undefined,
							{},
							{ json: true },
							driveScopeRoot,
						);
					}
				}
				if (resource === 'file' || resource === 'folder') {
					if (operation === 'rename') {
						const itemId = encodeURIComponent(this.getNodeParameter('itemId', i) as string);
						const newName = this.getNodeParameter('newName', i) as string;
						const body = { name: newName };
						responseData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/drive/items/${itemId}`,
							body,
							{},
							undefined,
							{},
							{ json: true },
							driveScopeRoot,
						);
					}
					//https://learn.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_move
					if (operation === 'move') {
						// Shared file+folder branch: read the item id under the
						// resource-appropriate name to match the sibling operations.
						const itemIdParam = resource === 'file' ? 'fileId' : 'folderId';
						const itemId = this.getNodeParameter(itemIdParam, i) as string;
						const destinationFolderId = this.getNodeParameter('destinationFolderId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const renameName =
							typeof additionalFields.name === 'string' ? additionalFields.name : '';

						// A move only relocates the item via the destination folder; with no
						// destination folder and no rename it is a silent Graph no-op. Require
						// one of them so the operation always does something.
						if (!destinationFolderId && !renameName) {
							throw new NodeOperationError(
								this.getNode(),
								'Set a Destination Folder ID to move the item (use `root` for the drive root), or a Name to rename it in place.',
								{ itemIndex: i },
							);
						}

						// `parentReference.id` (destination folder) and `driveId` are body-only
						// JSON, so they are never path-interpolated and need no encoding.
						const moveParentReference: IDataObject = {};
						if (destinationFolderId) {
							moveParentReference.id = destinationFolderId;
						}

						// Cross-drive moves aren't supported (Graph requires an async op), so the
						// user can't pick a destination drive. For app-only we still inject the
						// scope drive id so a same-drive move resolves to the right drive; OAuth2
						// resolves to `undefined` (same `/me` drive) — unchanged behaviour.
						const destinationDriveId = await resolveDestinationDriveId('', i);
						if (destinationDriveId) {
							moveParentReference.driveId = destinationDriveId;
						}

						const body: IDataObject = {};
						if (Object.keys(moveParentReference).length > 0) {
							body.parentReference = moveParentReference;
						}
						if (renameName) {
							body.name = renameName;
						}

						// Encode the path-interpolated item id (same as upload/copy): it keeps
						// any `/ : ? #` in the id from changing which item the URL addresses.
						responseData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/drive/items/${encodeURIComponent(itemId)}`,
							body,
							{},
							undefined,
							{},
							{ json: true },
							driveScopeRoot,
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
				this.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}
		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return [items];
		}

		return [returnData];
	}
}
