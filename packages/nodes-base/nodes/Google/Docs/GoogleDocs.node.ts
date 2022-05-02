import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import {
	extractID,
	googleApiRequest,
	googleApiRequestAllItems,
	hasKeys,
	upperFirst,
} from './GenericFunctions';

import {
	documentFields,
	documentOperations,
} from './DocumentDescription';

import {
	IUpdateBody,
	IUpdateFields,
} from './interfaces';

export class GoogleDocs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Docs',
		name: 'googleDocs',
		icon: 'file:googleDocs.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Docs API.',
		defaults: {
			name: 'Google Docs',
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
				name: 'googleDocsOAuth2Api',
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
						name: 'Document',
						value: 'document',
					},
				],
				default: 'document',
				description: 'The resource to operate on.',
			},
			...documentOperations,
			...documentFields,
		],
	};
	methods = {
		loadOptions: {
			// Get all the drives to display them to user so that he can
			// select them easily
			async getDrives(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [
					{
						name: 'My Drive',
						value: 'myDrive',
					},
					{
						name: 'Shared with me',
						value: 'sharedWithMe',
					},
				];
				let drives;
				try {
					drives = await googleApiRequestAllItems.call(this, 'drives', 'GET', '', {}, {}, 'https://www.googleapis.com/drive/v3/drives');
				} catch (error) {
					throw new NodeApiError(this.getNode(), error, { message: 'Error in loading Drives' });
				}

				for (const drive of drives) {
					returnData.push({
						name: drive.name as string,
						value: drive.id as string,
					});
				}
				return returnData;
			},
			async getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [
					{
						name: '/',
						value: 'default',
					},
				];
				const driveId = this.getNodeParameter('driveId');

				const qs = {
					q: `mimeType = \'application/vnd.google-apps.folder\' ${driveId === 'sharedWithMe' ? 'and sharedWithMe = true' : ' and \'root\' in parents'}`,
					...(driveId && driveId !== 'myDrive' && driveId !== 'sharedWithMe') ? { driveId } : {},
				};
				let folders;

				try {
					folders = await googleApiRequestAllItems.call(this, 'files', 'GET', '', {}, qs, 'https://www.googleapis.com/drive/v3/files');
				} catch (error) {
					throw new NodeApiError(this.getNode(), error, { message: 'Error in loading Folders' });
				}

				for (const folder of folders) {
					returnData.push({
						name: folder.name as string,
						value: folder.id as string,
					});
				}
				return returnData;
			},
		},
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;

		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {

			try {

				if (resource === 'document') {

					if (operation === 'create') {

						// https://developers.google.com/docs/api/reference/rest/v1/documents/create

						const folderId = this.getNodeParameter('folderId', i) as string;

						const body: IDataObject = {
							name: this.getNodeParameter('title', i) as string,
							mimeType: 'application/vnd.google-apps.document',
							...(folderId && folderId !== 'default') ? { parents: [folderId] } : {},
						};

						responseData = await googleApiRequest.call(this, 'POST', '', body, {}, 'https://www.googleapis.com/drive/v3/files');

					} else if (operation === 'get') {

						// https://developers.google.com/docs/api/reference/rest/v1/documents/get

						const documentURL = this.getNodeParameter('documentURL', i) as string;
						const simple = this.getNodeParameter('simple', i) as boolean;
						let documentId = extractID(documentURL);

						if (!documentId) {
							documentId = documentURL;
						}
						responseData = await googleApiRequest.call(this, 'GET', `/documents/${documentId}`);
						if (simple) {

							const content = (responseData.body.content as IDataObject[])
								.reduce((arr: string[], contentItem) => {
									if (contentItem && contentItem.paragraph) {
										const texts = ((contentItem.paragraph as IDataObject).elements as IDataObject[])
											.map(element => {
												if (element && element.textRun) {
													return (element.textRun as IDataObject).content as string;
												}
											}) as string[];
										arr = [...arr, ...texts];
									}
									return arr;
								}, [])
								.join('');

							responseData = {
								documentId,
								content,
							};

						}

					} else if (operation === 'update') {

						// https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate

						const documentURL = this.getNodeParameter('documentURL', i) as string;
						let documentId = extractID(documentURL);
						const simple = this.getNodeParameter('simple', i) as boolean;
						const actionsUi = this.getNodeParameter('actionsUi', i) as {
							actionFields: IDataObject[]
						};
						const { writeControlObject } = this.getNodeParameter('updateFields', i) as IUpdateFields;

						if (!documentId) {
							documentId = documentURL;
						}

						const body = {
							requests: [],
						} as IUpdateBody;

						if (hasKeys(writeControlObject)) {
							const { control, value } = writeControlObject;
							body.writeControl = {
								[control]: value,
							};
						}

						if (actionsUi) {

							let requestBody: IDataObject;
							actionsUi.actionFields.forEach(actionField => {
								const { action, object } = actionField;
								if (object === 'positionedObject') {
									if (action === 'delete') {
										requestBody = {
											objectId: actionField.objectId,
										};
									}

								} else if (object === 'pageBreak') {

									if (action === 'insert') {
										const { insertSegment, segmentId, locationChoice, index } = actionField;
										requestBody = {
											[locationChoice as string]: {
												segmentId: (insertSegment !== 'body') ? segmentId : '',
												...(locationChoice === 'location') ? { index } : {},
											},
										};
									}

								} else if (object === 'table') {

									if (action === 'insert') {
										const { rows, columns, insertSegment, locationChoice, segmentId, index } = actionField;
										requestBody = {
											rows,
											columns,
											[locationChoice as string]: {
												segmentId: (insertSegment !== 'body') ? segmentId : '',
												...(locationChoice === 'location') ? { index } : {},
											},
										};
									}

								} else if (object === 'footer') {

									if (action === 'create') {
										const { insertSegment, locationChoice, segmentId, index } = actionField;
										requestBody = {
											type: 'DEFAULT',
											sectionBreakLocation: {
												segmentId: (insertSegment !== 'body') ? segmentId : '',
												...(locationChoice === 'location') ? { index } : {},
											},
										};
									} else if (action === 'delete') {
										requestBody = {
											footerId: actionField.footerId,
										};
									}

								} else if (object === 'header') {

									if (action === 'create') {
										const { insertSegment, locationChoice, segmentId, index } = actionField;
										requestBody = {
											type: 'DEFAULT',
											sectionBreakLocation: {
												segmentId: (insertSegment !== 'body') ? segmentId : '',
												...(locationChoice === 'location') ? { index } : {},
											},
										};
									} else if (action === 'delete') {
										requestBody = {
											headerId: actionField.headerId,
										};
									}

								} else if (object === 'tableColumn') {

									if (action === 'insert') {
										const { insertPosition, rowIndex, columnIndex, insertSegment, segmentId, index } = actionField;
										requestBody = {
											insertRight: insertPosition,
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: { segmentId: (insertSegment !== 'body') ? segmentId : '', index, },
											},
										};
									} else if (action === 'delete') {
										const { rowIndex, columnIndex, insertSegment, segmentId, index } = actionField;
										requestBody = {
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: { segmentId: (insertSegment !== 'body') ? segmentId : '', index, },
											},
										};
									}

								} else if (object === 'tableRow') {

									if (action === 'insert') {
										const { insertPosition, rowIndex, columnIndex, insertSegment, segmentId, index } = actionField;
										requestBody = {
											insertBelow: insertPosition,
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: { segmentId: (insertSegment !== 'body') ? segmentId : '', index, },
											},
										};
									} else if (action === 'delete') {
										const { rowIndex, columnIndex, insertSegment, segmentId, index } = actionField;
										requestBody = {
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: { segmentId: (insertSegment !== 'body') ? segmentId : '', index, },
											},
										};
									}

								} else if (object === 'text') {

									if (action === 'insert') {
										const { text, locationChoice, insertSegment, segmentId, index } = actionField;
										requestBody = {
											text,
											[locationChoice as string]: {
												segmentId: (insertSegment !== 'body') ? segmentId : '',
												...(locationChoice === 'location') ? { index } : {},
											},
										};
									} else if (action === 'replaceAll') {
										const { text, replaceText, matchCase } = actionField;
										requestBody = {
											replaceText,
											containsText: { text, matchCase },
										};
									}

								} else if (object === 'paragraphBullets') {
									if (action === 'create') {
										const { bulletPreset, startIndex, insertSegment, segmentId, endIndex } = actionField;
										requestBody = {
											bulletPreset,
											range: { segmentId: (insertSegment !== 'body') ? segmentId : '', startIndex, endIndex },
										};
									} else if (action === 'delete') {
										const { startIndex, insertSegment, segmentId, endIndex } = actionField;
										requestBody = {
											range: { segmentId: (insertSegment !== 'body') ? segmentId : '', startIndex, endIndex },
										};
									}
								} else if (object === 'namedRange') {
									if (action === 'create') {
										const { name, insertSegment, segmentId, startIndex, endIndex } = actionField;
										requestBody = {
											name,
											range: { segmentId: (insertSegment !== 'body') ? segmentId : '', startIndex, endIndex },
										};
									} else if (action === 'delete') {
										const { namedRangeReference, value } = actionField;
										requestBody = {
											[namedRangeReference as string]: value,
										};
									}
								}

								body.requests.push({
									[`${action}${upperFirst(object as string)}`]: requestBody,
								});

							});
						}

						responseData = await googleApiRequest.call(this, 'POST', `/documents/${documentId}:batchUpdate`, body);

						if (simple === true) {
							if (Object.keys(responseData.replies[0]).length !== 0) {
								const key = Object.keys(responseData.replies[0])[0];
								responseData = responseData.replies[0][key];
							} else {
								responseData = {};
							}
						}
						responseData.documentId = documentId;
					}
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
