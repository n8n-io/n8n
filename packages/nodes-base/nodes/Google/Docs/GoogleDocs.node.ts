import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError
} from 'n8n-workflow';

import {
	extractID,
	googleApiRequest,
	upperFirst,
} from './GenericFunctions';

import {
	documentFields,
	documentOperations,
} from './DocumentDescription';

import {
	IUpdateBody,
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
			color: '#1a73e8',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleDocsOAuth2Api',
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;

		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {

			//try {

			if (resource === 'document') {

				if (operation === 'create') {

					// https://developers.google.com/docs/api/reference/rest/v1/documents/create

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const simple = this.getNodeParameter('simple', i) as boolean;

					const body: IDataObject = {
						title: this.getNodeParameter('title', i) as string,
					};

					responseData = await googleApiRequest.call(this, 'POST', '/documents', body);
					if (additionalFields!.content) {
						const documentId = responseData.documentId;
						const content = additionalFields!.content;
						const body = {
							requests: [
								{
									insertText: {
										text: content,
										location: {
											index: 1,
										},
									},
								},
							],
						} as IUpdateBody;

						responseData = await googleApiRequest.call(this, 'POST', `/documents/${documentId}:batchUpdate`, body);

						if (simple === true) {
							if (Object.keys(responseData.replies[0]).length !== 0) {
								const key = Object.keys(responseData.replies[0])[0];
								responseData = responseData.replies[0][key];
							} else {
								responseData = {};
							}
						}
					}


				} else if (operation === 'get') {

					// https://developers.google.com/docs/api/reference/rest/v1/documents/get

					const documentURL = this.getNodeParameter('documentURL', i) as string;
					const documentId = extractID(documentURL);

					if (!documentId) {
						throw new NodeOperationError(this.getNode(), 'Incorrect document URL');
					}
					responseData = await googleApiRequest.call(this, 'GET', `/documents/${documentId}`);

				} else if (operation === 'update') {

					// https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate

					const documentURL = this.getNodeParameter('documentURL', i) as string;
					const documentId = extractID(documentURL);
					const simple = this.getNodeParameter('simple', 0) as boolean;
					const actionsUi = this.getNodeParameter('actionsUi', i) as {
						actionFields: IDataObject[]
					};

					if (!documentId) {
						throw new NodeOperationError(this.getNode(), 'Incorrect document URL');
					}

					const body = {
						requests: [],
					} as IUpdateBody;

					if (actionsUi) {

						let requestBody: IDataObject;
						actionsUi.actionFields.forEach( actionField => {
							const {action, object} = actionField;
							if (object === 'positionedObject') {
								if (action === 'delete') {
									requestBody = {
										objectId: actionField.objectId,
									};
								}

							} else if (object === 'pageBreak') {

								if (action === 'insert') {
									const {insertSegment,segmentId,locationChoice,index} = actionField;
									requestBody = {
										[locationChoice as string]: {
											segmentId: (insertSegment !== 'body') ? segmentId : '',
											...(locationChoice === 'location') ? { index } : {},
										},
									};
								}

							} else if (object === 'table') {

								if (action === 'insert') {
									const {rows, columns, insertSegment,locationChoice, segmentId, index} = actionField;
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
									const {insertSegment,locationChoice, segmentId, index} = actionField;
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
									const {insertSegment, locationChoice, segmentId, index} = actionField;
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

								if(action === 'insert') {
									const { insertPosition, rowIndex, columnIndex, insertSegment, segmentId, index } = actionField;
									requestBody = {
										insertRight: insertPosition,
										tableCellLocation: {
											rowIndex,
											columnIndex,
											tableStartLocation: { segmentId: (insertSegment !== 'body') ? segmentId : '', index,},
										},
									};
								} else if (action === 'delete') {
									const { rowIndex, columnIndex, insertSegment, segmentId, index } = actionField;
									requestBody = {
										tableCellLocation: {
											rowIndex,
											columnIndex,
											tableStartLocation: { segmentId: (insertSegment !== 'body') ? segmentId : '', index,},
										},
									};
								}

							} else if (object === 'tableRow') {

								if(action === 'insert') {
									const { insertPosition, rowIndex, columnIndex, insertSegment, segmentId, index } = actionField;
									requestBody = {
										insertBelow: insertPosition,
										tableCellLocation: {
											rowIndex,
											columnIndex,
											tableStartLocation: { segmentId: (insertSegment !== 'body') ? segmentId : '', index,},
										},
									};
								} else if (action === 'delete') {
									const { rowIndex, columnIndex, insertSegment, segmentId, index } = actionField;
									requestBody = {
										tableCellLocation: {
											rowIndex,
											columnIndex,
											tableStartLocation: { segmentId: (insertSegment !== 'body') ? segmentId : '', index,},
										},
									};
								}

							} else if (object === 'text') {

								if (action === 'insert') {
									const {text, locationChoice, insertSegment,segmentId, index} = actionField;
									requestBody = {
										text,
										[locationChoice as string]: {
											segmentId: (insertSegment !== 'body') ? segmentId : '',
											...(locationChoice === 'location') ? { index } : {},
										},
									};
								} else if (action === 'replaceAll') {
									const {text, replaceText, matchCase} = actionField;
									requestBody = {
										replaceText,
										containsText: { text, matchCase },
									};
								}

							} else if (object === 'paragraphBullets') {
								if (action === 'create') {
									const {bulletPreset, startIndex, insertSegment,segmentId, endIndex} = actionField;
									requestBody = {
										bulletPreset,
										range: { segmentId: (insertSegment !== 'body') ? segmentId : '', startIndex, endIndex },
									};
								} else if (action === 'delete') {
									const {startIndex, insertSegment,segmentId, endIndex} = actionField;
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
									const {namedRangeReference, value} = actionField;
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
				}
			}

			// } catch (error) {
			// 	if (this.continueOnFail()) {
			// 		returnData.push({ error: error.message });
			// 		continue;
			// 	}
			// 	throw error;
			// }

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
